"""
auth/dependencies.py — FastAPI route guards using direct DB calls.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from database import get_user_by_username
from auth.core import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Decode JWT → fetch user from DB → verify account is active."""
    payload = decode_token(token)
    username: str = payload.get("sub")

    user = get_user_by_username(username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account deactivated. Contact an administrator.",
        )
    return user


def require_role(*roles: str):
    """Factory: raises 403 if the current user's role is not in `roles`."""
    def checker(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user["role"] not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required: {' or '.join(roles)}.",
            )
        return current_user
    return checker


# Convenience shortcuts
require_authenticated = get_current_user
require_moderator     = require_role("moderator", "admin")
require_admin         = require_role("admin")
