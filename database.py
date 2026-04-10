"""
Database Management Module for Mitsuketa
Handles SQLite database operations for storing and retrieving fingerprints.
"""

import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mitsuketa.db")


def get_connection():
    """Get a database connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Initialize the database schema."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            media_type TEXT NOT NULL CHECK(media_type IN ('song', 'movie', 'unknown')),
            file_path TEXT,
            duration REAL,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS audio_fingerprints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            media_id INTEGER NOT NULL,
            fingerprint_hash TEXT NOT NULL,
            time_offset REAL,
            FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS video_fingerprints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            media_id INTEGER NOT NULL,
            frame_index INTEGER NOT NULL,
            phash TEXT NOT NULL,
            FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_audio_hash ON audio_fingerprints(fingerprint_hash);
        CREATE INDEX IF NOT EXISTS idx_audio_hash_cover ON audio_fingerprints(fingerprint_hash, media_id, time_offset);
        CREATE INDEX IF NOT EXISTS idx_video_media ON video_fingerprints(media_id);
        CREATE INDEX IF NOT EXISTS idx_audio_media ON audio_fingerprints(media_id);
    """)

    conn.commit()
    conn.close()


def add_media(title: str, media_type: str, file_path: str = None, duration: float = None) -> int:
    """Add a new media entry and return its ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO media (title, media_type, file_path, duration) VALUES (?, ?, ?, ?)",
        (title, media_type, file_path, duration)
    )
    media_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return media_id


def store_audio_fingerprints(media_id: int, fingerprints: list):
    """
    Store audio fingerprints for a media entry.
    fingerprints: list of (hash_str, time_offset) tuples
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    # Batch inserts to avoid large transactions and potential limits
    BATCH_SIZE = 5000
    for i in range(0, len(fingerprints), BATCH_SIZE):
        batch = fingerprints[i : i + BATCH_SIZE]
        cursor.executemany(
            "INSERT INTO audio_fingerprints (media_id, fingerprint_hash, time_offset) VALUES (?, ?, ?)",
            [(media_id, fp_hash, offset) for fp_hash, offset in batch]
        )
        conn.commit()  # Commit each batch to keep transaction log small
        
    conn.close()


def store_video_fingerprints(media_id: int, fingerprints: list):
    """
    Store video fingerprints for a media entry.
    fingerprints: list of (frame_index, phash_str) tuples
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.executemany(
        "INSERT INTO video_fingerprints (media_id, frame_index, phash) VALUES (?, ?, ?)",
        [(media_id, frame_idx, phash) for frame_idx, phash in fingerprints]
    )
    conn.commit()
    conn.close()


def get_all_audio_fingerprints() -> list:
    """Get all audio fingerprints grouped by media_id."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT af.fingerprint_hash, af.time_offset, af.media_id, m.title
        FROM audio_fingerprints af
        JOIN media m ON af.media_id = m.id
        ORDER BY af.media_id, af.time_offset
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_audio_fingerprints_by_hash(hash_list: list) -> list:
    """Get audio fingerprints matching any of the given hashes."""
    if not hash_list:
        return []
        
    conn = get_connection()
    cursor = conn.cursor()
    
    # SQLite has a limit on variables (~999 or 32766 depending on version)
    # Process in chunks of 500 for safety (well within SQLite limits)
    CHUNK_SIZE = 500
    all_rows = []
    
    try:
        for i in range(0, len(hash_list), CHUNK_SIZE):
            chunk = hash_list[i : i + CHUNK_SIZE]
            placeholders = ",".join(["?"] * len(chunk))
            
            cursor.execute(f"""
                SELECT af.fingerprint_hash, af.time_offset, af.media_id, m.title
                FROM audio_fingerprints af
                JOIN media m ON af.media_id = m.id
                WHERE af.fingerprint_hash IN ({placeholders})
            """, chunk)
            
            all_rows.extend(cursor.fetchall())
    except Exception as e:
        print(f"DATABASE ERROR in get_audio_fingerprints_by_hash: {e}")
        raise e
    finally:
        conn.close()
    
    return [dict(r) for r in all_rows]


def get_all_video_fingerprints() -> list:
    """Get all video fingerprints."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT vf.frame_index, vf.phash, vf.media_id, m.title
        FROM video_fingerprints vf
        JOIN media m ON vf.media_id = m.id
        ORDER BY vf.media_id, vf.frame_index
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_media_by_id(media_id: int) -> dict:
    """Get a media entry by its ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM media WHERE id = ?", (media_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_all_media() -> list:
    """Get all registered media entries."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT m.*,
               COUNT(DISTINCT af.id) as audio_fp_count,
               COUNT(DISTINCT vf.id) as video_fp_count
        FROM media m
        LEFT JOIN audio_fingerprints af ON m.id = af.media_id
        LEFT JOIN video_fingerprints vf ON m.id = vf.media_id
        GROUP BY m.id
        ORDER BY m.added_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_media(media_id: int) -> bool:
    """Delete a media entry and its fingerprints."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM media WHERE id = ?", (media_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def get_media_count() -> int:
    """Get total number of registered media."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM media")
    count = cursor.fetchone()[0]
    conn.close()
    return count


def get_audio_hash_table() -> dict:
    """
    Load ALL audio fingerprints into a Python dict for in-memory O(1) lookup.
    Use this to eliminate SQL round-trips during matching for medium libraries.
    Returns: dict mapping hash_str → list of (media_id, time_offset, title)
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT af.fingerprint_hash, af.time_offset, af.media_id, m.title
        FROM audio_fingerprints af
        JOIN media m ON af.media_id = m.id
    """)
    rows = cursor.fetchall()
    conn.close()

    table = {}
    for row in rows:
        h = row['fingerprint_hash']
        if h not in table:
            table[h] = []
        table[h].append((row['media_id'], row['time_offset'], row['title']))
    return table
