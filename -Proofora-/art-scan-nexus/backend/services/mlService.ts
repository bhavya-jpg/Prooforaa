import fs from "fs";
import path from "path";
import FormData from "form-data";
import fetch from "node-fetch";

const ML_API_URL = process.env.ML_API_URL || "http://localhost:8000";

export interface MLScanSuccess {
  success: true;
  design_id: string;
  designId: string;
  metadata: any;
  scan_duration_seconds: number;
  scanDuration: number;
  message: string;
}

export interface MLScanError {
  success: false;
  error: string;
  message: string;
  traceback?: string;
}

export type MLScanResult = MLScanSuccess | MLScanError;

export async function scanDesignWithML(
  filePath: string
): Promise<MLScanResult> {
  console.log("\n" + "=".repeat(70));
  console.log("🔍 ML SCAN STARTING");
  console.log("=".repeat(70));
  console.log(`📂 File path: ${filePath}`);
  console.log(`🌐 ML API URL: ${ML_API_URL}/scan`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

  try {
    // ✅ STEP 1: Validate file exists
    console.log("\n📋 STEP 1: Validating file...");
    if (!fs.existsSync(filePath)) {
      console.error(`❌ ERROR: File not found at ${filePath}`);
      return {
        success: false,
        error: "FileNotFound",
        message: `File not found: ${filePath}`,
      };
    }
    console.log("✅ File exists");

    // ✅ STEP 2: Get file stats
    console.log("\n📋 STEP 2: Reading file stats...");
    const stats = fs.statSync(filePath);
    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`✅ File size: ${fileSizeMB} MB`);

    if (stats.size === 0) {
      console.error("❌ ERROR: File is empty");
      return {
        success: false,
        error: "EmptyFile",
        message: "File is empty (0 bytes)",
      };
    }

    // ✅ STEP 3: Read file buffer
    console.log("\n📋 STEP 3: Reading file contents...");
    const fileBuffer = fs.readFileSync(filePath);
    console.log(`✅ Read ${fileBuffer.length} bytes from file`);

    // ✅ STEP 4: Determine content type
    console.log("\n📋 STEP 4: Determining content type...");
    const ext = path.extname(filePath).toLowerCase();
    let contentType = "image/png";
    if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".gif") contentType = "image/gif";
    else if (ext === ".webp") contentType = "image/webp";
    console.log(`✅ Content type: ${contentType}`);
    console.log(`✅ File extension: ${ext}`);

    // ✅ STEP 5: Create FormData
    console.log("\n📋 STEP 5: Creating FormData...");
    const formData = new FormData();
    const fileName = path.basename(filePath);

    formData.append("design", fileBuffer, {
      filename: fileName,
      contentType: contentType,
    });

    console.log(`✅ FormData created`);
    console.log(`   - Filename: ${fileName}`);
    console.log(`   - Content-Type: ${contentType}`);
    console.log(`   - Size: ${fileBuffer.length} bytes`);

    // ✅ STEP 6: Send request to ML API
    console.log("\n📋 STEP 6: Sending request to ML API...");
    console.log(`📤 POST ${ML_API_URL}/scan`);

    const startTime = Date.now();
    let response;

    try {
      response = await fetch(`${ML_API_URL}/scan`, {
        method: "POST",
        body: formData as any,
        headers: formData.getHeaders(),
        timeout: 60000, // 60 second timeout
      });
    } catch (fetchError: any) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error("\n❌ FETCH ERROR:");
      console.error(`   Duration: ${duration}s`);
      console.error(`   Error type: ${fetchError.constructor.name}`);
      console.error(`   Error message: ${fetchError.message}`);
      console.error(`   Error code: ${fetchError.code}`);

      if (fetchError.code === "ECONNREFUSED") {
        return {
          success: false,
          error: "ConnectionRefused",
          message:
            "❌ Cannot connect to ML API. Is it running on http://localhost:8000?",
        };
      }

      if (fetchError.type === "request-timeout") {
        return {
          success: false,
          error: "Timeout",
          message: "ML API request timed out after 60 seconds",
        };
      }

      return {
        success: false,
        error: "NetworkError",
        message: `Network error: ${fetchError.message}`,
      };
    }

    const requestDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Request completed in ${requestDuration}s`);
    console.log(
      `📥 Response status: ${response.status} ${response.statusText}`
    );

    // ✅ STEP 7: Parse response
    console.log("\n📋 STEP 7: Parsing ML API response...");

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ ML API ERROR RESPONSE (${response.status}):`);
      console.error(errorText);

      let errorData;
      try {
        errorData = JSON.parse(errorText);
        console.error(
          `📋 Parsed error data:`,
          JSON.stringify(errorData, null, 2)
        );
      } catch {
        console.error(`📋 Could not parse error as JSON`);
        return {
          success: false,
          error: "MLAPIError",
          message: `ML API returned status ${response.status}`,
          traceback: errorText,
        };
      }

      return {
        success: false,
        error: errorData.error || "MLAPIError",
        message:
          errorData.message ||
          errorData.detail ||
          `ML API returned status ${response.status}`,
        traceback: errorData.traceback,
      };
    }

    const result = await response.json();
    console.log(`✅ Response parsed successfully`);
    console.log(`📦 Response data:`, JSON.stringify(result, null, 2));

    // ✅ STEP 8: Validate response structure
    console.log("\n📋 STEP 8: Validating response structure...");

    if (result.success === false) {
      console.error("❌ ML API returned success: false");
      return {
        success: false,
        error: result.error || "ScanFailed",
        message: result.message || "ML scan failed",
        traceback: result.traceback,
      };
    }

    if (!result.design_id && !result.designId) {
      console.error("❌ Response missing design_id/designId");
      return {
        success: false,
        error: "InvalidResponse",
        message: "ML API response missing design_id",
      };
    }

    if (!result.metadata) {
      console.error("❌ Response missing metadata");
      return {
        success: false,
        error: "InvalidResponse",
        message: "ML API response missing metadata",
      };
    }

    // ✅ STEP 9: Extract & normalize data
    console.log("\n📋 STEP 9: Extracting scan results...");
    const designId = result.design_id || result.designId;
    const scanDuration =
      result.scan_duration_seconds || result.scanDuration || 0;

    console.log("✅ ML SCAN SUCCESSFUL!");
    console.log(`🆔 Design ID: ${designId}`);
    console.log(`⏱️  Scan duration: ${scanDuration}s`);
    console.log(`📊 Metadata keys: ${Object.keys(result.metadata).join(", ")}`);
    console.log("=".repeat(70) + "\n");

    return {
      success: true,
      design_id: designId,
      designId: designId,
      metadata: result.metadata,
      scan_duration_seconds: scanDuration,
      scanDuration: scanDuration,
      message: result.message || "Design scanned successfully",
    };
  } catch (error: any) {
    console.error("\n" + "=".repeat(70));
    console.error("❌ UNEXPECTED ERROR IN ML SCAN");
    console.error("=".repeat(70));
    console.error(`Error type: ${error.constructor.name}`);
    console.error(`Error message: ${error.message}`);
    console.error(`\n📋 Stack trace:`);
    console.error(error.stack);
    console.error("=".repeat(70) + "\n");

    return {
      success: false,
      error: "UnexpectedError",
      message: error.message || "Unexpected error during ML scan",
      traceback: error.stack,
    };
  }
}
