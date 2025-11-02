import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield,
  Upload,
  FileImage,
  CheckCircle,
  X,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";

interface UploadedDesign {
  id: string;
  title: string;
  image: string;
  imageUrl: string;
  designId: string;
  fingerprint: string;
  status: string;
  uploadDate: string;
  scanDuration: number;
  fileSize: string;
  dimensions: string;
  format: string;
  blockchainStatus: string;
  metadata: any;
}

const UploadPage = () => {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [designTitle, setDesignTitle] = useState("");
  const [scanningStatus, setScanningStatus] = useState<string>("");

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files]);
      if (!designTitle && files[0]) {
        setDesignTitle(files[0].name.split(".")[0]);
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter((f) =>
        f.type.startsWith("image/")
      );
      setSelectedFiles((prev) => [...prev, ...files]);
      if (!designTitle && files[0]) {
        setDesignTitle(files[0].name.split(".")[0]);
      }
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ✅ Save design to localStorage
  const saveToLocalStorage = (design: UploadedDesign) => {
    try {
      const existingDesigns = localStorage.getItem("proofora_designs");
      const designs: UploadedDesign[] = existingDesigns
        ? JSON.parse(existingDesigns)
        : [];

      designs.unshift(design); // Add to beginning
      localStorage.setItem("proofora_designs", JSON.stringify(designs));

      console.log("✅ Saved to localStorage:", design.designId);
    } catch (error) {
      console.error("❌ Error saving to localStorage:", error);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one file");
      return;
    }

    if (!designTitle.trim()) {
      toast.error("Please enter a design title");
      return;
    }

    setIsUploading(true);
    setScanningStatus("Uploading files...");

    try {
      const uploadPromises = selectedFiles.map(async (file, index) => {
        const formData = new FormData();
        formData.append("design", file);
        formData.append(
          "title",
          selectedFiles.length > 1
            ? `${designTitle} (${index + 1})`
            : designTitle
        );

        setScanningStatus(
          `Scanning ${index + 1}/${selectedFiles.length}: ${file.name}...`
        );

        console.log(`\n📤 Uploading ${file.name}...`);
        console.log(`📋 Title: ${designTitle}`);

        const response = await fetch("http://localhost:5001/api/designs/save", {
          method: "POST",
          body: formData,
        });

        console.log(`📥 Response status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Backend error:`, errorText);

          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            throw new Error(`Upload failed (${response.status}): ${errorText}`);
          }

          throw new Error(
            errorData.message || `Upload failed (${response.status})`
          );
        }

        const result = await response.json();
        console.log("📥 Backend Response:", result);

        if (result.success === false) {
          throw new Error(result.message || "Upload failed");
        }

        // ✅ Save to localStorage
        if (result.design) {
          saveToLocalStorage(result.design as UploadedDesign);

          toast.success(
            <div className="text-left">
              <p className="font-bold">✓ {file.name} scanned successfully!</p>
              <p className="text-sm">
                Design ID: {result.design.designId.substring(0, 16)}...
              </p>
              <p className="text-sm">
                Scan time: {result.design.scanDuration?.toFixed(2)}s
              </p>
            </div>,
            { duration: 4000 }
          );
        }

        return result;
      });

      const results = await Promise.allSettled(uploadPromises);
      const successful = results.filter((r) => r.status === "fulfilled");
      const failed = results.filter(
        (r) => r.status === "rejected"
      ) as PromiseRejectedResult[];

      setIsUploading(false);
      setScanningStatus("");

      if (successful.length === 0) {
        toast.error(
          <div className="space-y-2">
            <p className="font-bold">All uploads failed:</p>
            <ul className="text-sm list-disc pl-4 max-h-40 overflow-y-auto">
              {failed.map((f, i) => (
                <li key={i} className="text-left">
                  {f.reason.message}
                </li>
              ))}
            </ul>
          </div>,
          { duration: 8000 }
        );
        return;
      }

      if (failed.length > 0) {
        toast.error(
          <div className="space-y-2">
            <p className="font-bold">
              {successful.length} of {selectedFiles.length} uploads succeeded
            </p>
            <p className="text-sm">Failed uploads:</p>
            <ul className="text-sm list-disc pl-4 max-h-40 overflow-y-auto">
              {failed.map((f, i) => (
                <li key={i} className="text-left">
                  {f.reason.message}
                </li>
              ))}
            </ul>
          </div>,
          { duration: 8000 }
        );
      }

      if (successful.length > 0) {
        setUploadComplete(true);

        if (failed.length === 0) {
          toast.success(
            `🎉 All ${successful.length} design(s) uploaded & saved!`,
            { duration: 3000 }
          );
        }

        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      }
    } catch (error: any) {
      console.error("❌ Unexpected upload error:", error);
      setIsUploading(false);
      setScanningStatus("");

      let errorMessage = "An unexpected error occurred";

      if (error.message?.includes("Failed to fetch")) {
        errorMessage =
          "Cannot connect to backend. Make sure it's running on http://localhost:5001";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, { duration: 5000 });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Same animated background & nav as before */}

      <div className="container mx-auto px-6 py-12 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent text-center">
            Upload Your Designs
          </h1>
          <p className="text-gray-400 text-center mb-12">
            AI-powered scan & blockchain verification
          </p>

          {/* Design Title Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Design Title *
            </label>
            <Input
              type="text"
              value={designTitle}
              onChange={(e) => setDesignTitle(e.target.value)}
              placeholder="Enter design title..."
              className="w-full bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-purple-500"
              disabled={isUploading}
            />
          </div>

          {/* Upload Zone */}
          <motion.div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            whileHover={{ scale: isUploading ? 1 : 1.02 }}
            className={`relative backdrop-blur-2xl bg-white/5 border-2 border-dashed rounded-3xl p-12 mb-8 transition-all duration-300 ${
              isUploading
                ? "opacity-50 cursor-not-allowed"
                : isDragging
                ? "border-purple-500 bg-purple-500/10 scale-105"
                : "border-white/20 hover:border-purple-500/50"
            }`}
          >
            <div className="text-center">
              <motion.div
                animate={{ y: isUploading ? 0 : [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-flex p-6 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-6"
              >
                {isUploading ? (
                  <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                ) : (
                  <Upload className="w-12 h-12 text-purple-400" />
                )}
              </motion.div>

              <h3 className="text-2xl font-bold mb-2 text-white">
                {isUploading ? "Scanning designs..." : "Drop your designs here"}
              </h3>
              <p className="text-gray-400 mb-6">
                {isUploading ? scanningStatus : "or click to browse your files"}
              </p>

              {!isUploading && (
                <>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    disabled={isUploading}
                  />
                  <label htmlFor="file-upload">
                    <Button
                      asChild
                      className="bg-gradient-to-r from-purple-600 to-pink-600"
                    >
                      <span>
                        <FileImage className="w-4 h-4 mr-2" />
                        Select Files
                      </span>
                    </Button>
                  </label>
                </>
              )}
            </div>
          </motion.div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-8"
            >
              <h3 className="text-xl font-bold mb-4 text-white">
                Selected Files ({selectedFiles.length})
              </h3>
              <div className="space-y-3">
                {selectedFiles.map((file, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center space-x-3">
                      <FileImage className="w-5 h-5 text-purple-400" />
                      <span className="text-white">{file.name}</span>
                      <span className="text-sm text-gray-400">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    {!isUploading && (
                      <button
                        onClick={() => removeFile(i)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={
              isUploading ||
              uploadComplete ||
              selectedFiles.length === 0 ||
              !designTitle.trim()
            }
            className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:scale-105 transition-all"
          >
            {isUploading ? (
              <div className="flex items-center space-x-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Scanning & Verifying...</span>
              </div>
            ) : uploadComplete ? (
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>Upload Complete!</span>
              </div>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Upload & Scan Designs
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default UploadPage;
