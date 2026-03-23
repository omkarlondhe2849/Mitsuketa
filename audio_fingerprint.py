"""
Audio Fingerprinting Module for Mitsuketa
Extracts audio fingerprints using spectrogram peak-pair hashing (Shazam-inspired).
"""

import numpy as np
import hashlib
import subprocess
import os
import tempfile
import struct

try:
    import librosa
except ImportError:
    librosa = None

from scipy.ndimage import maximum_filter, minimum_filter
from scipy.ndimage import binary_erosion, generate_binary_structure


# ─── Configuration ───────────────────────────────────────────────────────────

SAMPLE_RATE = 22050          # Standard sample rate for analysis
N_FFT = 2048                 # FFT window size
HOP_LENGTH = 512             # Hop between FFT windows
PEAK_NEIGHBORHOOD = 20       # Size of neighborhood for peak detection
MIN_PEAK_AMPLITUDE = -30      # Minimum amplitude (dB) for a peak to be considered
FAN_VALUE = 20               # Number of peaks to pair with each anchor peak
MAX_TIME_DELTA = 200         # Maximum time difference (in frames) for peak pairs
FINGERPRINT_REDUCTION = 20   # Number of bits for hash reduction


# ─── Audio Extraction ────────────────────────────────────────────────────────

def extract_audio(file_path: str) -> str:
    """
    Extract audio from a media file using ffmpeg.
    Returns path to a temporary WAV file, or None if the file has no audio stream.
    Uses explicit stream mapping to handle complex containers like MKV.
    """
    temp_dir = tempfile.mkdtemp()
    output_path = os.path.join(temp_dir, "audio.wav")

    # Strategy 1: Explicit first-audio-stream mapping (handles MKV with attachments)
    cmd = [
        "ffmpeg", "-i", file_path,
        "-map", "0:a:0",              # Explicitly select first audio stream
        "-acodec", "pcm_s16le",       # 16-bit PCM
        "-ar", str(SAMPLE_RATE),      # Sample rate
        "-ac", "1",                   # Mono
        "-y",                         # Overwrite
        "-loglevel", "error",
        output_path
    ]

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=300
        )

        # Check if the output file was created and has content
        if os.path.exists(output_path) and os.path.getsize(output_path) > 100:
            return output_path

        # Strategy 2: Fallback without explicit mapping
        cmd_fallback = [
            "ffmpeg", "-i", file_path,
            "-vn", "-sn", "-dn",          # No video, subtitles, or data streams
            "-acodec", "pcm_s16le",
            "-ar", str(SAMPLE_RATE),
            "-ac", "1",
            "-y",
            "-loglevel", "error",
            output_path
        ]

        result = subprocess.run(
            cmd_fallback, capture_output=True, text=True, timeout=300
        )

        if os.path.exists(output_path) and os.path.getsize(output_path) > 100:
            return output_path

        # Clean up on failure
        try:
            if os.path.exists(output_path):
                os.remove(output_path)
            os.rmdir(temp_dir)
        except OSError:
            pass
        return None

    except FileNotFoundError:
        raise RuntimeError(
            "FFmpeg not found. Please install FFmpeg and ensure it's in your PATH. "
            "Download from https://ffmpeg.org/download.html"
        )
    except subprocess.TimeoutExpired:
        # Clean up on timeout
        try:
            if os.path.exists(output_path):
                os.remove(output_path)
            os.rmdir(temp_dir)
        except OSError:
            pass
        return None

    return output_path


def load_audio(file_path: str) -> tuple:
    """
    Load audio from a file.
    - For audio files (mp3, wav, etc.): use librosa directly
    - For video files (mkv, mp4, etc.): use FFmpeg first (much faster), then librosa on the WAV
    Returns (audio_data, sample_rate) or (None, None) if no audio is available.
    """
    if librosa is None:
        raise RuntimeError("librosa is not installed. Run: pip install librosa")

    video_extensions = {'.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'}
    audio_extensions = {'.mp3', '.wav', '.flac', '.ogg', '.aac', '.m4a', '.wma'}
    ext = os.path.splitext(file_path)[1].lower()

    # For VIDEO files → FFmpeg first (librosa hangs on large MKV/MP4 files)
    if ext in video_extensions:
        wav_path = extract_audio(file_path)
        if wav_path is None:
            return None, None
        try:
            y, sr = librosa.load(wav_path, sr=SAMPLE_RATE, mono=True)
            if y is not None and len(y) > 0:
                return y, sr
            return None, None
        except Exception:
            return None, None
        finally:
            try:
                os.remove(wav_path)
                os.rmdir(os.path.dirname(wav_path))
            except OSError:
                pass

    # For AUDIO files → librosa directly
    if ext in audio_extensions:
        try:
            y, sr = librosa.load(file_path, sr=SAMPLE_RATE, mono=True)
            if y is not None and len(y) > 0:
                return y, sr
        except Exception:
            pass

    # For unknown extensions → try FFmpeg as last resort
    wav_path = extract_audio(file_path)
    if wav_path is None:
        return None, None
    try:
        y, sr = librosa.load(wav_path, sr=SAMPLE_RATE, mono=True)
        if y is not None and len(y) > 0:
            return y, sr
        return None, None
    except Exception:
        return None, None
    finally:
        try:
            os.remove(wav_path)
            os.rmdir(os.path.dirname(wav_path))
        except OSError:
            pass


# ─── Spectrogram Generation ─────────────────────────────────────────────────

def generate_spectrogram(audio_data: np.ndarray, sr: int = SAMPLE_RATE) -> np.ndarray:
    """
    Generate a spectrogram from audio data.
    Returns a 2D array of magnitude values (frequency x time).
    """
    # Compute Short-Time Fourier Transform
    stft = librosa.stft(audio_data, n_fft=N_FFT, hop_length=HOP_LENGTH)

    # Convert to magnitude in dB scale
    spectrogram = np.abs(stft)
    spectrogram_db = librosa.amplitude_to_db(spectrogram, ref=np.max)

    return spectrogram_db


# ─── Peak Detection ─────────────────────────────────────────────────────────

def find_peaks(spectrogram: np.ndarray) -> list:
    """
    Find local peaks in the spectrogram using a maximum filter approach.
    Returns list of (time_index, frequency_index) tuples.
    """
    # Create a binary structure for erosion
    struct_el = generate_binary_structure(2, 1)

    # Apply maximum filter to find local maxima
    neighborhood_size = PEAK_NEIGHBORHOOD
    local_max = maximum_filter(spectrogram, size=neighborhood_size) == spectrogram

    # Apply minimum filter to find background
    background = (spectrogram == minimum_filter(spectrogram, size=neighborhood_size))

    # Erode the background to get a cleaner result
    eroded_background = binary_erosion(
        background, structure=struct_el, border_value=1
    )

    # Boolean mask of peaks: local maxima that are not background
    detected_peaks = local_max != eroded_background

    # Apply amplitude threshold
    amplitude_mask = spectrogram > MIN_PEAK_AMPLITUDE

    # Combine masks
    peaks = detected_peaks & amplitude_mask

    # Extract peak coordinates
    freq_indices, time_indices = np.where(peaks)

    # Return as list of (time, frequency) tuples
    peak_list = list(zip(time_indices.tolist(), freq_indices.tolist()))

    # Sort by time
    peak_list.sort(key=lambda x: x[0])

    return peak_list


# ─── Fingerprint Hashing ────────────────────────────────────────────────────

def hash_peaks(peaks: list) -> list:
    """
    Create fingerprint hashes from peak pairs.
    Uses the "fan-out" method: for each anchor peak, pair with the next N peaks.
    Returns list of (hash_string, time_offset) tuples.
    """
    fingerprints = []

    for i, (t1, f1) in enumerate(peaks):
        # Fan out to the next FAN_VALUE peaks
        for j in range(1, min(FAN_VALUE + 1, len(peaks) - i)):
            t2, f2 = peaks[i + j]
            dt = t2 - t1

            # Only create pairs within the time window
            if 0 < dt <= MAX_TIME_DELTA:
                # Create a hash from the frequency pair and time delta
                hash_input = f"{f1}|{f2}|{dt}"
                fp_hash = hashlib.sha1(hash_input.encode('utf-8')).hexdigest()[:20]
                fingerprints.append((fp_hash, float(t1)))

    return fingerprints


# ─── Main Fingerprinting Function ───────────────────────────────────────────

def fingerprint_file(file_path: str) -> list:
    """
    Generate fingerprints for an audio/video file.
    Returns list of (hash_string, time_offset) tuples.
    Returns empty list if no audio is available.
    """
    # Load audio
    audio_data, sr = load_audio(file_path)

    # If no audio could be loaded (e.g., video with no audio track)
    if audio_data is None or len(audio_data) == 0:
        return []

    # Generate spectrogram
    spectrogram = generate_spectrogram(audio_data, sr)

    # Find peaks
    peaks = find_peaks(spectrogram)

    if len(peaks) < 2:
        return []

    # Hash peak pairs
    fingerprints = hash_peaks(peaks)

    return fingerprints


def get_audio_duration(file_path: str) -> float:
    """Get the duration of an audio/video file in seconds."""
    try:
        audio_data, sr = load_audio(file_path)
        if audio_data is None:
            return 0.0
        return len(audio_data) / sr
    except Exception:
        return 0.0
