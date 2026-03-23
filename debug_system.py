
import os
import sys
import logging
import sqlite3
from collections import defaultdict

# Add current directory
sys.path.append(os.getcwd())

from database import get_all_media, get_connection
from audio_fingerprint import fingerprint_file
from video_fingerprint import fingerprint_video
from matcher import match_audio, match_video, identify_clip

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def debug_database():
    logger.info("--- Database Status ---")
    media_list = get_all_media()
    logger.info(f"Total Media in DB: {len(media_list)}")
    for m in media_list:
        logger.info(f"ID: {m['id']} | Title: {m['title']} | Type: {m['media_type']}")
        logger.info(f"  Audio FPs: {m.get('audio_fp_count', 'N/A')}")
        logger.info(f"  Video FPs: {m.get('video_fp_count', 'N/A')}")
        
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM audio_fingerprints")
    af_count = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM video_fingerprints")
    vf_count = c.fetchone()[0]
    conn.close()
    logger.info(f"Total Audio Fingerprints in Table: {af_count}")
    logger.info(f"Total Video Fingerprints in Table: {vf_count}")
    logger.info("-----------------------")

def debug_file(file_path):
    logger.info(f"--- Debugging File: {os.path.basename(file_path)} ---")
    if not os.path.exists(file_path):
        logger.error("File not found!")
        return

    # 1. Fingerprint Generation
    logger.info("Generating Audio Fingerprints...")
    afps = fingerprint_file(file_path)
    logger.info(f"Generated: {len(afps)}")
    if len(afps) > 0:
        logger.info(f"Sample: {afps[0]}")

    logger.info("Generating Video Fingerprints...")
    vfps = fingerprint_video(file_path)
    logger.info(f"Generated: {len(vfps)}")
    if len(vfps) > 0:
        logger.info(f"Sample: {vfps[0]}")

    # 2. Matching against DB
    if len(afps) > 0:
        logger.info("Matching Audio against DB...")
        matches = match_audio(afps)
        if matches:
            for m in matches:
                logger.info(f"  Match: {m['title']} | Score: {m['score']}")
        else:
            logger.warning("  No Audio Matches found in DB.")

    if len(vfps) > 0:
        logger.info("Matching Video against DB...")
        matches = match_video(vfps)
        if matches:
            for m in matches:
                logger.info(f"  Match: {m['title']} | Score: {m['score']}")
        else:
            logger.warning("  No Video Matches found in DB.")

if __name__ == "__main__":
    debug_database()
    
    media_dir = os.path.join(os.getcwd(), "media")
    for f in os.listdir(media_dir):
        if f.endswith(".mkv") or f.endswith(".mp4"):
            debug_file(os.path.join(media_dir, f))
