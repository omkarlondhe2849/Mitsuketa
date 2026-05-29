
import os
import sys
import logging

# Add current directory to path so we can import modules
sys.path.append(os.getcwd())

from audio_fingerprint import fingerprint_file, extract_audio, load_audio

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_fingerprinting(file_path):
    logger.info(f"Testing fingerprinting for: {file_path}")

    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return

    # Step 1: Test Extract Audio
    logger.info("Step 1: Testing extract_audio...")
    try:
        wav_path = extract_audio(file_path)
        if wav_path:
            logger.info(f"Success: Audio extracted to {wav_path}")
            if os.path.exists(wav_path):
                 size = os.path.getsize(wav_path)
                 logger.info(f"Extracted file size: {size} bytes")
                 # cleanup
                 os.remove(wav_path)
                 os.rmdir(os.path.dirname(wav_path))
            else:
                 logger.error("Error: Returned path does not exist!")
        else:
            logger.warning("Warning: extract_audio returned None (no audio stream?)")
    except Exception as e:
        logger.error(f"Error in extract_audio: {e}")

    # Step 2: Test Full Fingerprinting
    logger.info("Step 2: Testing fingerprint_file...")
    try:
        fingerprints = fingerprint_file(file_path)
        logger.info(f"Result: Generated {len(fingerprints)} fingerprints.")
        if len(fingerprints) > 0:
            logger.info(f"Sample fingerprint: {fingerprints[0]}")
    except Exception as e:
        logger.error(f"Error in fingerprint_file: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Test with the file found in the media directory
    media_dir = os.path.join(os.getcwd(), "media")
    # Find the MKV file
    test_file = None
    for f in os.listdir(media_dir):
        if f.endswith(".mkv"):
            test_file = os.path.join(media_dir, f)
            break
    
    if test_file:
        test_fingerprinting(test_file)
    else:
        logger.error("No MKV file found in media directory to test.")
        # Create a dummy file or exit?
        pass
