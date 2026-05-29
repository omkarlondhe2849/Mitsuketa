"""
database.py — Direct PostgreSQL operations for Mitsuketa (psycopg2).
No ORM, no migrations framework. Pure SQL, clean and fast.
"""

import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

# ─── Connection config ────────────────────────────────────────────────────────

DB_CONFIG = {
    "host":     os.getenv("DB_HOST", "localhost"),
    "port":     int(os.getenv("DB_PORT", "5432")),
    "dbname":   os.getenv("DB_NAME", "mitsuketa"),
    "user":     os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", ""),
}


def get_connection():
    """Return a psycopg2 connection with RealDictCursor factory."""
    conn = psycopg2.connect(**DB_CONFIG)
    conn.cursor_factory = psycopg2.extras.RealDictCursor
    return conn


# ─── Schema Init ──────────────────────────────────────────────────────────────

def init_db():
    """Create all tables if they don't exist. Called once on startup."""
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id            SERIAL PRIMARY KEY,
            username      VARCHAR(30)  UNIQUE NOT NULL,
            email         VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role          VARCHAR(20)  NOT NULL DEFAULT 'viewer'
                          CHECK (role IN ('admin', 'moderator', 'viewer')),
            is_active     BOOLEAN NOT NULL DEFAULT TRUE,
            created_at    TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS media (
            id          SERIAL PRIMARY KEY,
            title       VARCHAR(500) NOT NULL,
            media_type  VARCHAR(20)  NOT NULL DEFAULT 'unknown'
                        CHECK (media_type IN ('song', 'movie', 'unknown')),
            file_path   TEXT,
            duration    FLOAT,
            added_at    TIMESTAMP NOT NULL DEFAULT NOW(),
            uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL
        );
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS audio_fingerprints (
            id               SERIAL PRIMARY KEY,
            media_id         INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
            fingerprint_hash VARCHAR(255) NOT NULL,
            time_offset      FLOAT
        );
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS video_fingerprints (
            id          SERIAL PRIMARY KEY,
            media_id    INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
            frame_index INTEGER NOT NULL,
            phash       VARCHAR(255) NOT NULL
        );
    """)

    # Indexes for fast fingerprint lookups
    cur.execute("CREATE INDEX IF NOT EXISTS idx_audio_hash       ON audio_fingerprints (fingerprint_hash);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_audio_hash_cover ON audio_fingerprints (fingerprint_hash, media_id, time_offset);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_audio_media      ON audio_fingerprints (media_id);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_video_media      ON video_fingerprints (media_id);")

    conn.commit()
    cur.close()
    conn.close()
    print("[DB] Schema ready.")


# ─── User Operations ──────────────────────────────────────────────────────────

def create_user(username: str, email: str, password_hash: str, role: str = "viewer") -> dict:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO users (username, email, password_hash, role)
           VALUES (%s, %s, %s, %s) RETURNING *""",
        (username, email, password_hash, role)
    )
    user = dict(cur.fetchone())
    conn.commit()
    cur.close()
    conn.close()
    return user


def get_user_by_username(username: str) -> dict | None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE username = %s", (username,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    return dict(row) if row else None


def get_user_by_email(email: str) -> dict | None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email = %s", (email,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    return dict(row) if row else None


def get_user_by_id(user_id: int) -> dict | None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    return dict(row) if row else None


def get_all_users() -> list:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users ORDER BY created_at DESC")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [dict(r) for r in rows]


def count_users() -> int:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) AS cnt FROM users")
    count = cur.fetchone()["cnt"]
    cur.close()
    conn.close()
    return count


def update_user_role(user_id: int, role: str) -> dict | None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE users SET role = %s WHERE id = %s RETURNING *",
        (role, user_id)
    )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    return dict(row) if row else None


def set_user_active(user_id: int, active: bool) -> bool:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE users SET is_active = %s WHERE id = %s",
        (active, user_id)
    )
    updated = cur.rowcount > 0
    conn.commit()
    cur.close()
    conn.close()
    return updated


# ─── Media Operations ─────────────────────────────────────────────────────────

def add_media(title: str, media_type: str, file_path: str = None,
              duration: float = None, uploaded_by: int = None) -> int:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO media (title, media_type, file_path, duration, uploaded_by)
           VALUES (%s, %s, %s, %s, %s) RETURNING id""",
        (title, media_type, file_path, duration, uploaded_by)
    )
    media_id = cur.fetchone()["id"]
    conn.commit()
    cur.close()
    conn.close()
    return media_id


def get_all_media() -> list:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT m.*,
               (SELECT COUNT(*) FROM audio_fingerprints af WHERE af.media_id = m.id) AS audio_fp_count,
               (SELECT COUNT(*) FROM video_fingerprints vf WHERE vf.media_id = m.id) AS video_fp_count
        FROM media m
        ORDER BY m.added_at DESC
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [dict(r) for r in rows]


def get_media_by_id(media_id: int) -> dict | None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM media WHERE id = %s", (media_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    return dict(row) if row else None


def delete_media(media_id: int) -> bool:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM media WHERE id = %s", (media_id,))
    deleted = cur.rowcount > 0
    conn.commit()
    cur.close()
    conn.close()
    return deleted


def get_media_count() -> int:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) AS cnt FROM media")
    count = cur.fetchone()["cnt"]
    cur.close()
    conn.close()
    return count


# ─── Fingerprint Operations ───────────────────────────────────────────────────

def store_audio_fingerprints(media_id: int, fingerprints: list):
    """fingerprints: list of (hash_str, time_offset) tuples."""
    conn = get_connection()
    cur = conn.cursor()
    BATCH = 5000
    for i in range(0, len(fingerprints), BATCH):
        batch = fingerprints[i: i + BATCH]
        psycopg2.extras.execute_values(
            cur,
            "INSERT INTO audio_fingerprints (media_id, fingerprint_hash, time_offset) VALUES %s",
            [(media_id, h, t) for h, t in batch]
        )
        conn.commit()
    cur.close()
    conn.close()


def store_video_fingerprints(media_id: int, fingerprints: list):
    """fingerprints: list of (frame_index, phash_str) tuples."""
    conn = get_connection()
    cur = conn.cursor()
    psycopg2.extras.execute_values(
        cur,
        "INSERT INTO video_fingerprints (media_id, frame_index, phash) VALUES %s",
        [(media_id, fi, ph) for fi, ph in fingerprints]
    )
    conn.commit()
    cur.close()
    conn.close()


def get_audio_fingerprints_by_hash(hash_list: list) -> list:
    """Chunked hash lookup for audio matching (used by matcher.py)."""
    if not hash_list:
        return []
    CHUNK = 500
    all_rows = []
    conn = get_connection()
    cur = conn.cursor()
    try:
        for i in range(0, len(hash_list), CHUNK):
            chunk = hash_list[i: i + CHUNK]
            cur.execute("""
                SELECT af.fingerprint_hash, af.time_offset, af.media_id, m.title
                FROM audio_fingerprints af
                JOIN media m ON af.media_id = m.id
                WHERE af.fingerprint_hash = ANY(%s)
            """, (chunk,))
            all_rows.extend(cur.fetchall())
    finally:
        cur.close()
        conn.close()
    return [dict(r) for r in all_rows]


def get_all_video_fingerprints() -> list:
    """Load all video fingerprints for BK-Tree builder."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT vf.frame_index, vf.phash, vf.media_id, m.title
        FROM video_fingerprints vf
        JOIN media m ON vf.media_id = m.id
        ORDER BY vf.media_id, vf.frame_index
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [dict(r) for r in rows]


def get_audio_hash_table() -> dict:
    """Load all audio FPs into a dict for fast in-memory lookup."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT af.fingerprint_hash, af.time_offset, af.media_id, m.title
        FROM audio_fingerprints af
        JOIN media m ON af.media_id = m.id
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    table = {}
    for row in rows:
        h = row["fingerprint_hash"]
        if h not in table:
            table[h] = []
        table[h].append((row["media_id"], row["time_offset"], row["title"]))
    return table
