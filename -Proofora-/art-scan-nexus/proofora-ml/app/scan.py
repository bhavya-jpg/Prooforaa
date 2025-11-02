import numpy as np
import imagehash
from PIL import Image
import cv2
import hashlib
import json
from datetime import datetime
from typing import Dict, Any
from scipy.stats import entropy, skew, kurtosis
from skimage.feature import graycomatrix, graycoprops
from skimage.color import rgb2gray
import traceback
import sys

from app.config import PHASH_SIZE, ORB_MAX_FEATURES
from app.utils import pil_to_np, load_image_bytes


def extract_image_metadata(pil_img: Image.Image) -> Dict[str, Any]:
    """Complete design metadata extraction."""
    try:
        print("🔄 Starting metadata extraction...")
        
        pil_img = pil_img.convert("RGB")
        print(f"✅ Image converted to RGB mode")
        
        width, height = pil_img.size
        format_type = pil_img.format or "UNKNOWN"
        mode = pil_img.mode
        print(f"✅ Image info: {width}x{height}, format: {format_type}, mode: {mode}")
        
        img_np = pil_to_np(pil_img, size=(512, 512))
        print(f"✅ Numpy array created: shape={img_np.shape}, dtype={img_np.dtype}")
        
        # Multiple hashes for design identification
        print("🔄 Computing design hashes...")
        phash = str(imagehash.phash(pil_img, hash_size=PHASH_SIZE))
        ahash = str(imagehash.average_hash(pil_img))
        dhash = str(imagehash.dhash(pil_img))
        whash = str(imagehash.whash(pil_img))
        colorhash = str(imagehash.colorhash(pil_img))
        print(f"✅ Hashes computed: phash={phash[:16]}...")
        
        img_bytes = img_np.tobytes()
        sha256_hash = hashlib.sha256(img_bytes).hexdigest()
        print(f"✅ SHA256: {sha256_hash[:16]}...")
        
        print("🔄 Extracting color features...")
        color_analysis = extract_color_features(img_np)
        print(f"✅ Color analysis complete")
        
        print("🔄 Extracting texture features...")
        texture_features = extract_texture_features(img_np)
        print(f"✅ Texture features complete")
        
        print("🔄 Extracting ORB features...")
        orb_features = extract_orb_features(img_np)
        print(f"✅ ORB features complete: {orb_features['total_keypoints']} keypoints")
        
        print("🔄 Extracting pixel statistics...")
        pixel_stats = extract_pixel_statistics(img_np)
        print(f"✅ Pixel statistics complete")
        
        print("🔄 Extracting edge features...")
        edge_features = extract_edge_features(img_np)
        print(f"✅ Edge features complete")
        
        print("🔄 Extracting frequency features...")
        frequency_features = extract_frequency_features(img_np)
        print(f"✅ Frequency features complete")
        
        # Create unique design fingerprint (for later blockchain use)
        design_fingerprint = create_design_fingerprint(
            phash, ahash, dhash, whash, colorhash, sha256_hash
        )
        print(f"✅ Design fingerprint: {design_fingerprint[:16]}...")
        
        metadata = {
            "scan_timestamp": datetime.utcnow().isoformat() + "Z",
            "image_info": {
                "width": width,
                "height": height,
                "format": format_type,
                "mode": mode,
                "total_pixels": width * height,
                "aspect_ratio": round(width / height, 2),
            },
            "hashes": {
                "perceptual_hash": phash,
                "average_hash": ahash,
                "difference_hash": dhash,
                "wavelet_hash": whash,
                "color_hash": colorhash,
                "sha256": sha256_hash,
                "design_fingerprint": design_fingerprint,
            },
            "color_analysis": color_analysis,
            "texture_features": texture_features,
            "orb_features": orb_features,
            "pixel_statistics": pixel_stats,
            "edge_features": edge_features,
            "frequency_features": frequency_features,
            "scan_metadata": {
                "algorithm_version": "2.0.0",
                "processing_resolution": "512x512",
                "scan_type": "full_pixel_analysis",
                "libraries_used": [
                    "opencv-python-4.12.0",
                    "scikit-image-0.24.0",
                    "scipy-1.16.3",
                    "ImageHash-4.3.2",
                    "numpy-2.2.6"
                ]
            }
        }
        
        print("✅ Metadata extraction complete!")
        return metadata
        
    except Exception as e:
        error_info = {
            "error_type": type(e).__name__,
            "error_message": str(e),
            "traceback": traceback.format_exc(),
            "line_number": sys.exc_info()[2].tb_lineno if sys.exc_info()[2] else None
        }
        print(f"❌ Error in extract_image_metadata: {error_info}")
        raise


def extract_color_features(img_np: np.ndarray) -> Dict[str, Any]:
    """Image ke color features extract karta hai."""
    try:
        print(f"  → Input shape: {img_np.shape}, dtype: {img_np.dtype}")
        
        if img_np.shape[-1] == 4:
            img_np = img_np[:, :, :3]
            print(f"  → Converted RGBA to RGB")
        
        img_np = np.clip(img_np, 0, 255).astype(np.uint8)
        print(f"  → Clipped to [0, 255] and converted to uint8")
        
        mean_colors = {
            "red": round(float(np.mean(img_np[:, :, 0])), 2),
            "green": round(float(np.mean(img_np[:, :, 1])), 2),
            "blue": round(float(np.mean(img_np[:, :, 2])), 2),
        }
        
        color_variance = {
            "red": round(float(np.std(img_np[:, :, 0])), 2),
            "green": round(float(np.std(img_np[:, :, 1])), 2),
            "blue": round(float(np.std(img_np[:, :, 2])), 2),
        }
        
        pixels = img_np.reshape(-1, 3)
        unique, counts = np.unique(pixels, axis=0, return_counts=True)
        dominant_color = unique[counts.argmax()].tolist()
        dominant_percentage = round(float(counts.max() / counts.sum() * 100), 2)
        
        # Use OpenCV's calcHist
        hist_r = cv2.calcHist([img_np], [0], None, [8], [0, 256]).flatten().astype(int).tolist()
        hist_g = cv2.calcHist([img_np], [1], None, [8], [0, 256]).flatten().astype(int).tolist()
        hist_b = cv2.calcHist([img_np], [2], None, [8], [0, 256]).flatten().astype(int).tolist()
        
        color_entropy = {
            "red": round(float(entropy(np.array(hist_r) + 1e-10)), 2),
            "green": round(float(entropy(np.array(hist_g) + 1e-10)), 2),
            "blue": round(float(entropy(np.array(hist_b) + 1e-10)), 2),
        }
        
        return {
            "mean_colors": mean_colors,
            "color_variance": color_variance,
            "dominant_color": {
                "rgb": dominant_color,
                "percentage": dominant_percentage,
            },
            "color_histogram": {
                "red": hist_r,
                "green": hist_g,
                "blue": hist_b,
            },
            "color_entropy": color_entropy,
        }
        
    except Exception as e:
        error_info = {
            "function": "extract_color_features",
            "error_type": type(e).__name__,
            "error_message": str(e),
            "traceback": traceback.format_exc(),
        }
        print(f"❌ Error in extract_color_features: {json.dumps(error_info, indent=2)}")
        raise


def extract_texture_features(img_np: np.ndarray) -> Dict[str, Any]:
    """Texture analysis using GLCM."""
    try:
        gray = (rgb2gray(img_np) * 255).astype(np.uint8)
        
        distances = [1, 3, 5]
        angles = [0, np.pi/4, np.pi/2, 3*np.pi/4]
        
        glcm = graycomatrix(gray, distances=distances, angles=angles, 
                            levels=256, symmetric=True, normed=True)
        
        contrast = float(np.mean(graycoprops(glcm, 'contrast')))
        dissimilarity = float(np.mean(graycoprops(glcm, 'dissimilarity')))
        homogeneity = float(np.mean(graycoprops(glcm, 'homogeneity')))
        energy = float(np.mean(graycoprops(glcm, 'energy')))
        correlation = float(np.mean(graycoprops(glcm, 'correlation')))
        
        return {
            "contrast": round(contrast, 4),
            "dissimilarity": round(dissimilarity, 4),
            "homogeneity": round(homogeneity, 4),
            "energy": round(energy, 4),
            "correlation": round(correlation, 4),
            "texture_complexity": round((contrast + dissimilarity) / 2, 2),
        }
    except Exception as e:
        print(f"❌ Error in extract_texture_features: {type(e).__name__}: {str(e)}")
        raise


def extract_orb_features(img_np: np.ndarray) -> Dict[str, Any]:
    """ORB features using opencv."""
    try:
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        
        orb = cv2.ORB_create(nfeatures=ORB_MAX_FEATURES)
        keypoints, descriptors = orb.detectAndCompute(gray, None)
        
        if keypoints is None or len(keypoints) == 0:
            return {
                "total_keypoints": 0,
                "keypoint_positions": [],
                "feature_descriptor_hash": None,
                "keypoint_density": 0.0,
            }
        
        positions = [[float(kp.pt[0]), float(kp.pt[1])] for kp in keypoints[:50]]
        
        total_pixels = gray.shape[0] * gray.shape[1]
        density = round((len(keypoints) / total_pixels) * 1000, 2)
        
        if descriptors is not None:
            desc_hash = hashlib.sha256(descriptors.tobytes()).hexdigest()
        else:
            desc_hash = None
        
        return {
            "total_keypoints": len(keypoints),
            "keypoint_positions": positions,
            "feature_descriptor_hash": desc_hash,
            "keypoint_density": density,
        }
    except Exception as e:
        print(f"❌ Error in extract_orb_features: {type(e).__name__}: {str(e)}")
        raise


def extract_pixel_statistics(img_np: np.ndarray) -> Dict[str, Any]:
    """Pixel-level statistics."""
    try:
        brightness = float(np.mean(img_np))
        contrast = float(np.std(img_np))
        min_pixel = int(np.min(img_np))
        max_pixel = int(np.max(img_np))
        dynamic_range = max_pixel - min_pixel
        
        # Use cv2.calcHist to avoid broadcast error
        flat_img = img_np.flatten().astype(np.uint8)
        hist = cv2.calcHist([flat_img.reshape(-1, 1)], [0], None, [256], [0, 256]).flatten()
        img_entropy = float(entropy(hist + 1e-10))
        
        pixels_flat = img_np.flatten()
        pixel_skewness = float(skew(pixels_flat))
        pixel_kurtosis = float(kurtosis(pixels_flat))
        
        return {
            "brightness": round(brightness, 2),
            "contrast": round(contrast, 2),
            "min_pixel_value": min_pixel,
            "max_pixel_value": max_pixel,
            "dynamic_range": dynamic_range,
            "entropy": round(img_entropy, 2),
            "skewness": round(pixel_skewness, 2),
            "kurtosis": round(pixel_kurtosis, 2),
        }
    except Exception as e:
        print(f"❌ Error in extract_pixel_statistics: {type(e).__name__}: {str(e)}")
        raise


def extract_edge_features(img_np: np.ndarray) -> Dict[str, Any]:
    """Edge detection features."""
    try:
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        
        edges_canny = cv2.Canny(gray, 100, 200)
        edge_density = round(float(np.sum(edges_canny > 0) / edges_canny.size * 100), 2)
        
        sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        sobel_magnitude = np.sqrt(sobelx**2 + sobely**2)
        
        edge_strength = round(float(np.mean(sobel_magnitude)), 2)
        
        return {
            "edge_density_percentage": edge_density,
            "edge_strength": edge_strength,
            "has_strong_edges": edge_density > 5.0,
        }
    except Exception as e:
        print(f"❌ Error in extract_edge_features: {type(e).__name__}: {str(e)}")
        raise


def extract_frequency_features(img_np: np.ndarray) -> Dict[str, Any]:
    """Frequency domain analysis."""
    try:
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        
        fft = np.fft.fft2(gray)
        fft_shift = np.fft.fftshift(fft)
        magnitude_spectrum = np.abs(fft_shift)
        
        center_y, center_x = magnitude_spectrum.shape[0] // 2, magnitude_spectrum.shape[1] // 2
        low_freq_region = magnitude_spectrum[center_y-20:center_y+20, center_x-20:center_x+20]
        low_freq_energy = float(np.sum(low_freq_region))
        
        high_freq_energy = float(np.sum(magnitude_spectrum) - low_freq_energy)
        
        freq_ratio = round(high_freq_energy / (low_freq_energy + 1e-10), 2)
        
        return {
            "low_frequency_energy": round(low_freq_energy, 2),
            "high_frequency_energy": round(high_freq_energy, 2),
            "frequency_ratio": freq_ratio,
            "detail_level": "high" if freq_ratio > 1.5 else "medium" if freq_ratio > 0.8 else "low",
        }
    except Exception as e:
        print(f"❌ Error in extract_frequency_features: {type(e).__name__}: {str(e)}")
        raise


def create_design_fingerprint(*hashes: str) -> str:
    """Create unique design fingerprint (for blockchain integration)."""
    combined = "".join(hashes)
    fingerprint = hashlib.sha256(combined.encode()).hexdigest()
    return fingerprint


def scan_design_for_blockchain(image_bytes: bytes) -> Dict[str, Any]:
    """
    Scan design and extract complete metadata.
    Returns structured data ready for blockchain integration by your teammate.
    """
    scan_start_time = datetime.utcnow()
    
    try:
        print("\n" + "="*60)
        print(f"🚀 Starting design scan at {scan_start_time.isoformat()}")
        print(f"📦 Image bytes received: {len(image_bytes)} bytes")
        print("="*60 + "\n")
        
        print("🔄 Loading image from bytes...")
        pil_img = load_image_bytes(image_bytes)
        print(f"✅ PIL Image loaded: size={pil_img.size}, mode={pil_img.mode}, format={pil_img.format}")
        
        print("\n🔄 Extracting metadata...")
        metadata = extract_image_metadata(pil_img)
        
        # Design fingerprint for blockchain integration
        design_id = metadata["hashes"]["design_fingerprint"]
        
        scan_end_time = datetime.utcnow()
        duration = (scan_end_time - scan_start_time).total_seconds()
        
        print("\n" + "="*60)
        print(f"✅ SCAN COMPLETE in {duration:.2f} seconds")
        print(f"🔐 Design ID: {design_id}")
        print("="*60 + "\n")
        
        return {
            "success": True,
            "design_id": design_id,  # Unique identifier for blockchain
            "metadata": metadata,
            "scan_duration_seconds": round(duration, 2),
            "message": "Design scanned successfully. Ready for blockchain integration."
        }
        
    except Exception as e:
        scan_end_time = datetime.utcnow()
        duration = (scan_end_time - scan_start_time).total_seconds()
        
        error_details = {
            "success": False,
            "error_type": type(e).__name__,
            "error_message": str(e),
            "scan_duration_seconds": round(duration, 2),
            "timestamp": scan_end_time.isoformat() + "Z",
            "image_bytes_length": len(image_bytes) if image_bytes else 0,
            "traceback": traceback.format_exc(),
            "traceback_lines": traceback.format_exc().split('\n'),
            "system_info": {
                "python_version": sys.version,
                "numpy_version": np.__version__,
                "cv2_version": cv2.__version__,
            },
            "message": "Scan failed - see error details"
        }
        
        print("\n" + "="*60)
        print(f"❌ SCAN FAILED after {duration:.2f} seconds")
        print(f"❌ Error Type: {error_details['error_type']}")
        print(f"❌ Error Message: {error_details['error_message']}")
        print("="*60)
        print("\n📋 Full Traceback:")
        print(traceback.format_exc())
        print("="*60 + "\n")
        
        return error_details