from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Dict, Any
import traceback

from app.scan import scan_design_for_blockchain
from app.compare import combined_similarity
from app.utils import load_image_bytes
from app.config import SIMILARITY_THRESHOLD

app = FastAPI(
    title="Proofora ML API",
    description="Design scanning & plagiarism detection for Proofora",
    version="2.0.0"
)

# CORS middleware - Allow frontend on port 8081
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://localhost:5173",
        "http://localhost:5001",
        "*"  # Allow all origins (for development)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint - API information."""
    return {
        "name": "Proofora ML API",
        "version": "2.0.0",
        "status": "active",
        "endpoints": {
            "scan": "/scan - POST - Scan design and extract metadata",
            "compare": "/compare - POST - Compare two designs for plagiarism",
            "health": "/health - GET - Health check"
        },
        "description": "Design metadata extraction & plagiarism detection API"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "message": "Proofora ML API is running 🚀"
    }


@app.post("/scan")
async def scan_design(design: UploadFile = File(...)):
    """
    Scan design and extract complete metadata.
    
    Parameters:
    - design: Image file (PNG, JPG, JPEG)
    
    Returns:
    - success: Boolean indicating success/failure
    - design_id: Unique design identifier
    - designId: Same as design_id (for compatibility)
    - metadata: Complete design analysis data
    - scan_duration: Time taken for scan (seconds)
    - scanDuration: Same as scan_duration (for compatibility)
    - message: Status message
    """
    try:
        print(f"\n🔍 === SCAN REQUEST RECEIVED ===")
        print(f"📁 Filename: {design.filename}")
        print(f"📝 Content Type: {design.content_type}")
        
        # Validate file type
        if not design.content_type or not design.content_type.startswith("image/"):
            print(f"❌ Invalid content type: {design.content_type}")
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "InvalidFileType",
                    "message": "Invalid file type. Please upload an image (PNG, JPG, JPEG)."
                }
            )
        
        # Read image bytes
        image_bytes = await design.read()
        image_size_mb = len(image_bytes) / 1024 / 1024
        
        print(f"📊 Image size: {image_size_mb:.2f} MB")
        
        if len(image_bytes) == 0:
            print("❌ Empty file received")
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "EmptyFile",
                    "message": "Empty file received. Please upload a valid image."
                }
            )
        
        # Scan design
        print("🔄 Starting scan...")
        result = scan_design_for_blockchain(image_bytes)
        
        if not result.get("success"):
            error_type = result.get("error_type", "UnknownError")
            error_message = result.get("error_message", "Scan failed")
            
            print(f"❌ Scan failed: {error_type} - {error_message}")
            
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "error": error_type,
                    "message": error_message,
                    "traceback": result.get("traceback_lines", [])
                }
            )
        
        # Extract data with compatibility
        design_id = result.get("design_id")
        scan_duration = result.get("scan_duration_seconds", 0)
        
        print(f"✅ Scan successful!")
        print(f"🆔 Design ID: {design_id}")
        print(f"⏱️  Scan duration: {scan_duration}s")
        print("=" * 60 + "\n")
        
        # Return successful response with both naming conventions
        return {
            "success": True,
            "design_id": design_id,
            "designId": design_id,  # For TypeScript compatibility
            "metadata": result["metadata"],
            "scan_duration": scan_duration,
            "scanDuration": scan_duration,  # For TypeScript compatibility
            "message": result.get("message", "Design scanned successfully")
        }
        
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR in /scan endpoint:")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        print("\n📋 Full traceback:")
        print(traceback.format_exc())
        print("=" * 60 + "\n")
        
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "UnexpectedError",
                "message": f"Unexpected error during scan: {str(e)}",
                "traceback": traceback.format_exc()
            }
        )


@app.post("/compare")
async def compare_designs(
    original: UploadFile = File(...),
    suspect: UploadFile = File(...)
):
    """
    Compare two designs to detect plagiarism.
    
    Parameters:
    - original: Original design image
    - suspect: Suspected plagiarized design image
    
    Returns:
    - similarity_score: Float (0.0 to 1.0)
    - is_plagiarism: Boolean
    - breakdown: Detailed similarity metrics
    """
    try:
        print(f"\n🔍 === COMPARE REQUEST RECEIVED ===")
        print(f"📁 Original: {original.filename}")
        print(f"📁 Suspect: {suspect.filename}")
        
        # Validate file types
        if not original.content_type or not original.content_type.startswith("image/"):
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "InvalidFileType",
                    "message": "Original file must be an image"
                }
            )
        
        if not suspect.content_type or not suspect.content_type.startswith("image/"):
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "InvalidFileType",
                    "message": "Suspect file must be an image"
                }
            )
        
        # Read image bytes
        original_bytes = await original.read()
        suspect_bytes = await suspect.read()
        
        print(f"📊 Original size: {len(original_bytes) / 1024 / 1024:.2f} MB")
        print(f"📊 Suspect size: {len(suspect_bytes) / 1024 / 1024:.2f} MB")
        
        if len(original_bytes) == 0 or len(suspect_bytes) == 0:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "EmptyFile",
                    "message": "Empty files received"
                }
            )
        
        # Load images
        print("🔄 Loading images...")
        pil_orig = load_image_bytes(original_bytes)
        pil_susp = load_image_bytes(suspect_bytes)
        
        # Compare designs
        print("🔄 Comparing designs...")
        result = combined_similarity(pil_orig, pil_susp)
        score = result["score"]
        is_plagiarism = score >= SIMILARITY_THRESHOLD
        
        print(f"✅ Comparison complete!")
        print(f"📊 Similarity score: {score:.4f}")
        print(f"🚨 Is plagiarism: {is_plagiarism}")
        print("=" * 60 + "\n")
        
        return {
            "success": True,
            "similarity_score": round(score, 4),
            "similarityScore": round(score, 4),  # For TypeScript compatibility
            "is_plagiarism": bool(is_plagiarism),
            "isPlagiarism": bool(is_plagiarism),  # For TypeScript compatibility
            "breakdown": result["breakdown"],
            "threshold": SIMILARITY_THRESHOLD,
            "message": "Plagiarism detected" if is_plagiarism else "No plagiarism detected"
        }
        
    except Exception as e:
        print(f"\n❌ ERROR in /compare endpoint:")
        print(f"Error: {str(e)}")
        print(traceback.format_exc())
        print("=" * 60 + "\n")
        
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "ComparisonError",
                "message": f"Comparison failed: {str(e)}"
            }
        )


if __name__ == "__main__":
    import uvicorn
    print("\n🚀 Starting Proofora ML API...")
    print("📡 Server will run on: http://localhost:8000")
    print("🌐 Allowed origins: http://localhost:8081, http://localhost:5173")
    print("=" * 60 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)