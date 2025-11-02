import numpy as np
from skimage.metrics import structural_similarity as ssim
import imagehash
from PIL import Image
import cv2

from app.config import SSIM_WEIGHT, PHASH_WEIGHT, ORB_WEIGHT, PHASH_SIZE, ORB_MAX_FEATURES


def normalize_image_array(img_np):
    """Ensure image has 3 channels (RGB) and is properly shaped for comparison."""
    # Convert grayscale to RGB (H, W) → (H, W, 3)
    if img_np.ndim == 2:
        img_np = np.stack([img_np] * 3, axis=-1 )

    # If RGBA, drop alpha channel
    elif img_np.shape[-1] == 4:
        img_np = img_np[:, :, :3]

    return img_np


def compute_ssim(img1_np, img2_np):
    from skimage.color import rgb2gray  # SSIM : Structural Similarty Index -- checking structure of two images is — brightness, contrast, texture. 1= identical , 0 = diff

    # handle RGBA → RGB
    if img1_np.shape[-1] == 4:
        img1_np = img1_np[:, :, :3]
    if img2_np.shape[-1] == 4:
        img2_np = img2_np[:, :, :3]

    g1 = rgb2gray(img1_np)
    g2 = rgb2gray(img2_np)

    score = ssim(g1, g2, data_range=g2.max() - g2.min())
    return float(np.clip(score, -1, 1))


# pHash — Perceptual Hash Creates a small hash (like a fingerprint) for each image.
def compute_phash_similarity(pil1: Image.Image, pil2: Image.Image):
    # Always convert to RGB before hashing
    pil1 = pil1.convert("RGB")
    pil2 = pil2.convert("RGB")

    ph1 = imagehash.phash(pil1, hash_size=PHASH_SIZE)
    ph2 = imagehash.phash(pil2, hash_size=PHASH_SIZE)

    maxdist = PHASH_SIZE * PHASH_SIZE
    dist = ph1 - ph2
    score = 1.0 - (dist / maxdist)
    return float(np.clip(score, 0, 1))

# ORB — Feature Matching (OpenCV) - Detects key points (edges, corners, etc.) and compares them
def compute_orb_match_ratio(img1_np, img2_np):
    img1_np = normalize_image_array(img1_np)
    img2_np = normalize_image_array(img2_np)

    orb = cv2.ORB_create(nfeatures=ORB_MAX_FEATURES)
    gray1 = cv2.cvtColor(img1_np, cv2.COLOR_RGB2GRAY)
    gray2 = cv2.cvtColor(img2_np, cv2.COLOR_RGB2GRAY)

    kp1, des1 = orb.detectAndCompute(gray1, None)
    kp2, des2 = orb.detectAndCompute(gray2, None)

    if des1 is None or des2 is None:
        return 0.0

    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = bf.match(des1, des2)
    if len(matches) == 0:
        return 0.0

    matches = sorted(matches, key=lambda x: x.distance)
    good = [m for m in matches if m.distance < 60]
    ratio = len(good) / max(len(matches), 1)
    return float(np.clip(ratio, 0, 1))


def combined_similarity(pil1: Image.Image, pil2: Image.Image, np_size=(512, 512)):
    from .utils import pil_to_np

    # Always convert to RGB for consistent results
    pil1 = pil1.convert("RGB")
    pil2 = pil2.convert("RGB")

    img1_np = pil_to_np(pil1, size=np_size)
    img2_np = pil_to_np(pil2, size=np_size)

    ssim_score = compute_ssim(img1_np, img2_np)
    phash_score = compute_phash_similarity(pil1, pil2)
    orb_score = compute_orb_match_ratio(img1_np, img2_np)

    score = (
        (SSIM_WEIGHT * ssim_score)
        + (PHASH_WEIGHT * phash_score)
        + (ORB_WEIGHT * orb_score)
    )

    return {
        "score": float(np.clip(score, 0, 1)),
        "breakdown": {
            "ssim": float(np.clip(ssim_score, 0, 1)),
            "phash": float(np.clip(phash_score, 0, 1)),
            "orb": float(np.clip(orb_score, 0, 1)),
        },
    }
