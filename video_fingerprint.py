"""
Video Fingerprinting Module for Mitsuketa
Extracts video fingerprints using perceptual hashing (pHash) of key frames.
"""

import cv2
import numpy as np
import os


# ─── Configuration ───────────────────────────────────────────────────────────

KEYFRAME_INTERVAL = 1.0      # Extract one frame per second
PHASH_SIZE = 8               # pHash grid size (produces 64-bit hash)
RESIZE_DIM = (64, 64)        # Resize frames before hashing
MAX_FRAMES = 300             # Maximum key frames to extract


# ─── Key Frame Extraction ───────────────────────────────────────────────────

def extract_keyframes(file_path: str, interval: float = KEYFRAME_INTERVAL) -> list:
    """
    Extract key frames from a video file at regular intervals.
    Returns list of (frame_index, frame_image) tuples.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Video file not found: {file_path}")

    cap = cv2.VideoCapture(file_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video file: {file_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        fps = 30.0  # Default fallback

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_step = max(1, int(fps * interval))

    keyframes = []
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % frame_step == 0:
            keyframes.append((frame_idx, frame))

            if len(keyframes) >= MAX_FRAMES:
                break

        frame_idx += 1

    cap.release()
    return keyframes


# ─── Perceptual Hash (pHash) ────────────────────────────────────────────────

def compute_phash(frame: np.ndarray, hash_size: int = PHASH_SIZE) -> str:
    """
    Compute the perceptual hash (pHash) of a frame.

    Steps:
    1. Convert to grayscale
    2. Resize to (hash_size * 4) x (hash_size * 4)
    3. Apply DCT (Discrete Cosine Transform)
    4. Keep top-left hash_size x hash_size DCT coefficients
    5. Compute median and create binary hash

    Returns a hex string representing the hash.
    """
    # Convert to grayscale if needed
    if len(frame.shape) == 3:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    else:
        gray = frame.copy()

    # Resize to a larger intermediate size for DCT
    img_size = hash_size * 4
    resized = cv2.resize(gray, (img_size, img_size), interpolation=cv2.INTER_AREA)

    # Convert to float for DCT
    img_float = np.float32(resized)

    # Apply 2D DCT
    dct = cv2.dct(img_float)

    # Keep only top-left hash_size x hash_size coefficients (low frequencies)
    dct_low = dct[:hash_size, :hash_size]

    # Compute median (excluding DC component)
    med = np.median(dct_low)

    # Create binary hash: 1 if above median, 0 otherwise
    binary_hash = (dct_low > med).flatten()

    # Convert boolean array to hex string
    hash_int = 0
    for bit in binary_hash:
        hash_int = (hash_int << 1) | int(bit)

    hex_hash = format(hash_int, f'0{hash_size * hash_size // 4}x')
    return hex_hash


# ─── Hamming Distance ───────────────────────────────────────────────────────

def hamming_distance(hash1: str, hash2: str) -> int:
    """
    Compute the Hamming distance between two hex hash strings.
    Lower distance = more similar.
    """
    if len(hash1) != len(hash2):
        return max(len(hash1), len(hash2)) * 4  # Max distance

    val1 = int(hash1, 16)
    val2 = int(hash2, 16)
    xor = val1 ^ val2

    # Count number of 1-bits (different bits)
    distance = bin(xor).count('1')
    return distance


# ─── Main Fingerprinting Function ───────────────────────────────────────────

def fingerprint_video(file_path: str) -> list:
    """
    Generate video fingerprints for a video file.
    Returns list of (frame_index, phash_string) tuples.
    """
    # Check if it's a video file
    video_extensions = {'.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'}
    ext = os.path.splitext(file_path)[1].lower()

    if ext not in video_extensions:
        # Not a video file, skip video fingerprinting
        return []

    try:
        # Extract key frames
        keyframes = extract_keyframes(file_path)

        if not keyframes:
            return []

        # Compute pHash for each key frame
        fingerprints = []
        for frame_idx, frame in keyframes:
            phash = compute_phash(frame)
            fingerprints.append((frame_idx, phash))

        return fingerprints

    except Exception as e:
        print(f"Video fingerprinting error: {e}")
        return []


def get_video_duration(file_path: str) -> float:
    """Get the duration of a video file in seconds."""
    try:
        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened():
            return 0.0
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        cap.release()
        if fps > 0:
            return frame_count / fps
        return 0.0
    except Exception:
        return 0.0
