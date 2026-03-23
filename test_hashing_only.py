
import numpy as np
import soundfile as sf
import os
import sys
import logging

# Add current directory to path
sys.path.append(os.getcwd())

from audio_fingerprint import fingerprint_file, generate_spectrogram, find_peaks, hash_peaks

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_sine_wave(freq, duration, sr=22050):
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    audio = 0.5 * np.sin(2 * np.pi * freq * t)
    return audio, sr

def test_hashing_isolated():
    logger.info("Testing hashing with synthesized audio...")
    
    # 1. Create a 5-second sine wave at 440Hz
    audio, sr = create_sine_wave(440, 5)
    filename = "test_sine.wav"
    sf.write(filename, audio, sr)
    logger.info(f"Created {filename}")

    try:
        # 2. Test fingerprint_file directly
        fingerprints = fingerprint_file(filename)
        logger.info(f"Fingerprints generated: {len(fingerprints)}")
        
        if len(fingerprints) > 0:
            logger.info(f"Sample fingerprint: {fingerprints[0]}")
        else:
            logger.warning("No fingerprints generated.")

        # 3. Debug intermediate steps if no fingerprints
        if len(fingerprints) == 0:
            logger.info("Debugging intermediate steps...")
            spectrogram = generate_spectrogram(audio, sr)
            logger.info(f"Spectrogram shape: {spectrogram.shape}")
            logger.info(f"Spectrogram max: {np.max(spectrogram)}, min: {np.min(spectrogram)}")
            
            peaks = find_peaks(spectrogram)
            logger.info(f"Peaks found: {len(peaks)}")
            if len(peaks) > 0:
                logger.info(f"Sample peak: {peaks[0]}")
    
    except Exception as e:
        logger.error(f"Error during testing: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if os.path.exists(filename):
            os.remove(filename)

if __name__ == "__main__":
    test_hashing_isolated()
