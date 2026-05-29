"""
db/models.py — SQLAlchemy ORM models for Mitsuketa.
Tables: users, media, audio_fingerprints, video_fingerprints
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, Float,
    DateTime, ForeignKey, Enum as SAEnum, Index
)
from sqlalchemy.orm import relationship
from db.engine import Base


class User(Base):
    __tablename__ = "users"

    id           = Column(Integer, primary_key=True, index=True)
    username     = Column(String(30), unique=True, nullable=False, index=True)
    email        = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role         = Column(
        SAEnum("admin", "moderator", "viewer", name="user_role"),
        default="viewer",
        nullable=False,
        server_default="viewer",
    )
    is_active    = Column(Boolean, default=True, nullable=False, server_default="true")
    created_at   = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship — media registered by this user
    media = relationship(
        "Media",
        back_populates="uploader",
        foreign_keys="[Media.uploaded_by]",
    )


class Media(Base):
    __tablename__ = "media"

    id          = Column(Integer, primary_key=True, index=True)
    title       = Column(String(500), nullable=False)
    media_type  = Column(
        SAEnum("song", "movie", "unknown", name="media_type_enum"),
        default="unknown",
        nullable=False,
        server_default="unknown",
    )
    file_path   = Column(String(1000))
    duration    = Column(Float)
    added_at    = Column(DateTime, default=datetime.utcnow, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    uploader            = relationship("User", back_populates="media", foreign_keys=[uploaded_by])
    audio_fingerprints  = relationship("AudioFingerprint", back_populates="media", cascade="all, delete-orphan")
    video_fingerprints  = relationship("VideoFingerprint", back_populates="media", cascade="all, delete-orphan")


class AudioFingerprint(Base):
    __tablename__ = "audio_fingerprints"

    id               = Column(Integer, primary_key=True, index=True)
    media_id         = Column(Integer, ForeignKey("media.id", ondelete="CASCADE"), nullable=False)
    fingerprint_hash = Column(String(255), nullable=False)
    time_offset      = Column(Float)

    media = relationship("Media", back_populates="audio_fingerprints")

    __table_args__ = (
        Index("idx_audio_hash", "fingerprint_hash"),
        Index("idx_audio_hash_cover", "fingerprint_hash", "media_id", "time_offset"),
        Index("idx_audio_media", "media_id"),
    )


class VideoFingerprint(Base):
    __tablename__ = "video_fingerprints"

    id          = Column(Integer, primary_key=True, index=True)
    media_id    = Column(Integer, ForeignKey("media.id", ondelete="CASCADE"), nullable=False)
    frame_index = Column(Integer, nullable=False)
    phash       = Column(String(255), nullable=False)

    media = relationship("Media", back_populates="video_fingerprints")

    __table_args__ = (
        Index("idx_video_media", "media_id"),
    )
