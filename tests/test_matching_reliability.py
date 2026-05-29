
import os
import sys
import logging
import soundfile as sf
import numpy as np
import shutil

# Add current directory to path
sys.path.append(os.getcwd())

from database import init_db, add_media, store_audio_fingerprints, get_all_media
from audio_fingerprint import fingerprint_file, MIN_PEAK_AMPLITUDE
from matcher import match_audio, identify_clip

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s',
    handlers=[
        logging.FileHandler("reliability_log.txt", mode='w'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def create_test_audio(filename, duration=5, freq=440):
    sr = 22050
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # Create a complex signal to ensure good fingerprints
    audio = 0.5 * np.sin(2 * np.pi * freq * t) + \
            0.3 * np.sin(2 * np.pi * (freq * 1.5) * t) + \
            0.2 * np.sin(2 * np.pi * (freq * 0.5) * t)
    sf.write(filename, audio, sr)
    return filename

def test_reliability():
    logger.info("Initializing DB...")
    # remove db if exists for clean state
    if os.path.exists("mitsuketa.db"):
        os.remove("mitsuketa.db")
    init_db()

    # 1. Create a test audio file
    filename = "test_audio_match.wav"
    create_test_audio(filename)
    logger.info(f"Created {filename}")

    try:
        # 2. Register it (Generate fingerprints and store)
        logger.info("Registering media...")
        fps = fingerprint_file(filename)
        logger.info(f"Generated {len(fps)} fingerprints.")
        
        if len(fps) == 0:
            logger.error("No fingerprints generated! Check threshold.")
            return

        media_id = add_media("Test Audio", "song", filename, 5.0)
        store_audio_fingerprints(media_id, fps)
        logger.info(f"Stored in DB with ID {media_id}")

        # 3. Identify THE SAME file
        logger.info("Attempting to identify the same file...")
        
        # Test 1: Direct Matcher Call
        query_fps = fingerprint_file(filename)
        matches = match_audio(query_fps)
        logger.info("Match Results (Direct):")
        for m in matches:
            logger.info(f"  - {m['title']}: Score {m['score']} (matches: {m['match_count']}/{m['total_query_fps']})")

        # Test 2: Full Identification Flow
        result = identify_clip(filename)
        logger.info("Match Results (Identify Clip):")
        logger.info(f"  Match Found: {result['match_found']}")
        logger.info(f"  Confidence: {result['confidence']}")
        logger.info(f"  Method: {result['method_used']}")
        for step in result['analysis_steps']:
            logger.info(f"    Step: {step}")

    except Exception as e:
        logger.error(f"Test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Cleanup
        if os.path.exists(filename):
            os.remove(filename)

if __name__ == "__main__":
    test_reliability()
