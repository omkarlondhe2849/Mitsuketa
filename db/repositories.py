"""
db/repositories.py — Async database operations for Mitsuketa.
All functions are async and use SQLAlchemy AsyncSession.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import select, delete, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db.models import User, Media, AudioFingerprint, VideoFingerprint


# ─── User Repository ─────────────────────────────────────────────────────────

class UserRepo:

    @staticmethod
    async def create(
        db: AsyncSession,
        username: str,
        email: str,
        password_hash: str,
        role: str = "viewer",
    ) -> User:
        user = User(
            username=username,
            email=email,
            password_hash=password_hash,
            role=role,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def get_by_username(db: AsyncSession, username: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_all(db: AsyncSession) -> list[User]:
        result = await db.execute(select(User).order_by(User.created_at.desc()))
        return result.scalars().all()

    @staticmethod
    async def count(db: AsyncSession) -> int:
        result = await db.execute(select(func.count()).select_from(User))
        return result.scalar_one()

    @staticmethod
    async def update_role(db: AsyncSession, user_id: int, role: str) -> Optional[User]:
        await db.execute(
            update(User).where(User.id == user_id).values(role=role)
        )
        await db.commit()
        return await UserRepo.get_by_id(db, user_id)

    @staticmethod
    async def deactivate(db: AsyncSession, user_id: int) -> bool:
        result = await db.execute(
            update(User).where(User.id == user_id).values(is_active=False)
        )
        await db.commit()
        return result.rowcount > 0

    @staticmethod
    async def activate(db: AsyncSession, user_id: int) -> bool:
        result = await db.execute(
            update(User).where(User.id == user_id).values(is_active=True)
        )
        await db.commit()
        return result.rowcount > 0


# ─── Media Repository ────────────────────────────────────────────────────────

class MediaRepo:

    @staticmethod
    async def add(
        db: AsyncSession,
        title: str,
        media_type: str,
        file_path: str = None,
        duration: float = None,
        uploaded_by: int = None,
    ) -> int:
        media = Media(
            title=title,
            media_type=media_type,
            file_path=file_path,
            duration=duration,
            uploaded_by=uploaded_by,
        )
        db.add(media)
        await db.commit()
        await db.refresh(media)
        return media.id

    @staticmethod
    async def get_all(db: AsyncSession) -> list[dict]:
        result = await db.execute(
            select(
                Media,
                func.count(AudioFingerprint.id).label("audio_fp_count"),
                func.count(VideoFingerprint.id).label("video_fp_count"),
            )
            .outerjoin(AudioFingerprint, Media.id == AudioFingerprint.media_id)
            .outerjoin(VideoFingerprint, Media.id == VideoFingerprint.media_id)
            .group_by(Media.id)
            .order_by(Media.added_at.desc())
        )
        rows = result.all()
        return [
            {
                "id": row.Media.id,
                "title": row.Media.title,
                "media_type": row.Media.media_type,
                "file_path": row.Media.file_path,
                "duration": row.Media.duration,
                "added_at": str(row.Media.added_at),
                "uploaded_by": row.Media.uploaded_by,
                "audio_fp_count": row.audio_fp_count,
                "video_fp_count": row.video_fp_count,
            }
            for row in rows
        ]

    @staticmethod
    async def get_by_id(db: AsyncSession, media_id: int) -> Optional[dict]:
        result = await db.execute(select(Media).where(Media.id == media_id))
        media = result.scalar_one_or_none()
        if not media:
            return None
        return {
            "id": media.id,
            "title": media.title,
            "media_type": media.media_type,
            "file_path": media.file_path,
            "duration": media.duration,
            "added_at": str(media.added_at),
        }

    @staticmethod
    async def delete(db: AsyncSession, media_id: int) -> bool:
        result = await db.execute(delete(Media).where(Media.id == media_id))
        await db.commit()
        return result.rowcount > 0

    @staticmethod
    async def count(db: AsyncSession) -> int:
        result = await db.execute(select(func.count()).select_from(Media))
        return result.scalar_one()


# ─── Fingerprint Repository ──────────────────────────────────────────────────

class FingerprintRepo:

    @staticmethod
    async def bulk_insert_audio(
        db: AsyncSession,
        media_id: int,
        fingerprints: list,  # list of (hash_str, time_offset)
    ) -> int:
        BATCH_SIZE = 5000
        total = 0
        for i in range(0, len(fingerprints), BATCH_SIZE):
            batch = fingerprints[i: i + BATCH_SIZE]
            db.add_all([
                AudioFingerprint(
                    media_id=media_id,
                    fingerprint_hash=fp_hash,
                    time_offset=offset,
                )
                for fp_hash, offset in batch
            ])
            await db.commit()
            total += len(batch)
        return total

    @staticmethod
    async def bulk_insert_video(
        db: AsyncSession,
        media_id: int,
        fingerprints: list,  # list of (frame_index, phash_str)
    ) -> int:
        db.add_all([
            VideoFingerprint(
                media_id=media_id,
                frame_index=frame_idx,
                phash=phash,
            )
            for frame_idx, phash in fingerprints
        ])
        await db.commit()
        return len(fingerprints)
