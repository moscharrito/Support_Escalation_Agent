# Authentication Service - API key validation and user authentication
import os
import hashlib
import secrets
from typing import Optional, Dict
from datetime import datetime, timedelta
from fastapi import HTTPException, Security, Depends
from fastapi.security import APIKeyHeader, APIKeyQuery
from ..database import get_db


# API Key header/query configuration
API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)
API_KEY_QUERY = APIKeyQuery(name="api_key", auto_error=False)


class AuthService:
    """Handles API key validation and authentication"""

    def __init__(self):
        # Load valid API keys from environment or database
        self._static_api_keys = self._load_static_keys()
        self._rate_limits: Dict[str, list] = {}

    def _load_static_keys(self) -> set:
        """Load static API keys from environment"""
        keys = set()

        # Primary API key
        primary_key = os.getenv("API_KEY")
        if primary_key:
            keys.add(self._hash_key(primary_key))

        # Additional keys (comma-separated)
        additional_keys = os.getenv("ADDITIONAL_API_KEYS", "")
        for key in additional_keys.split(","):
            key = key.strip()
            if key:
                keys.add(self._hash_key(key))

        return keys

    def _hash_key(self, key: str) -> str:
        """Hash an API key for secure comparison"""
        return hashlib.sha256(key.encode()).hexdigest()

    def validate_api_key(self, api_key: str) -> bool:
        """Validate an API key

        Args:
            api_key: The API key to validate

        Returns:
            True if valid, False otherwise
        """
        if not api_key:
            return False

        hashed = self._hash_key(api_key)
        return hashed in self._static_api_keys

    async def validate_api_key_db(self, api_key: str) -> Optional[Dict]:
        """Validate API key against database

        Args:
            api_key: The API key to validate

        Returns:
            API key metadata if valid, None otherwise
        """
        if not api_key:
            return None

        try:
            db = get_db()
            hashed = self._hash_key(api_key)

            key_doc = await db.api_keys.find_one({
                "key_hash": hashed,
                "is_active": True
            })

            if key_doc:
                # Check expiration
                if key_doc.get("expires_at"):
                    if datetime.utcnow() > key_doc["expires_at"]:
                        return None

                # Update last used timestamp
                await db.api_keys.update_one(
                    {"_id": key_doc["_id"]},
                    {"$set": {"last_used_at": datetime.utcnow()}}
                )

                return {
                    "key_id": str(key_doc["_id"]),
                    "name": key_doc.get("name"),
                    "scopes": key_doc.get("scopes", []),
                    "rate_limit": key_doc.get("rate_limit", 100)
                }

        except Exception as e:
            print(f"Database API key validation error: {e}")

        return None

    def check_rate_limit(
        self,
        api_key: str,
        limit: int = 100,
        window_seconds: int = 60
    ) -> bool:
        """Check if API key is within rate limits

        Args:
            api_key: The API key to check
            limit: Maximum requests allowed in window
            window_seconds: Time window in seconds

        Returns:
            True if within limits, False if exceeded
        """
        now = datetime.utcnow()
        cutoff = now - timedelta(seconds=window_seconds)

        # Get or initialize request timestamps for this key
        if api_key not in self._rate_limits:
            self._rate_limits[api_key] = []

        # Clean old entries
        self._rate_limits[api_key] = [
            ts for ts in self._rate_limits[api_key]
            if ts > cutoff
        ]

        # Check limit
        if len(self._rate_limits[api_key]) >= limit:
            return False

        # Record this request
        self._rate_limits[api_key].append(now)
        return True

    @staticmethod
    def generate_api_key() -> str:
        """Generate a new API key

        Returns:
            New API key string
        """
        return f"sk_{secrets.token_urlsafe(32)}"


# Global auth service instance
_auth_service = AuthService()


async def verify_api_key(
    api_key_header: Optional[str] = Security(API_KEY_HEADER),
    api_key_query: Optional[str] = Security(API_KEY_QUERY)
) -> str:
    """FastAPI dependency for API key verification

    Args:
        api_key_header: API key from header
        api_key_query: API key from query parameter

    Returns:
        Validated API key

    Raises:
        HTTPException: If API key is invalid or missing
    """
    api_key = api_key_header or api_key_query

    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="API key required. Provide via X-API-Key header or api_key query parameter."
        )

    # Try static key validation first (faster)
    if _auth_service.validate_api_key(api_key):
        # Check rate limit
        if not _auth_service.check_rate_limit(api_key):
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Please slow down."
            )
        return api_key

    # Try database validation
    key_info = await _auth_service.validate_api_key_db(api_key)
    if key_info:
        # Check rate limit with custom limit from key info
        rate_limit = key_info.get("rate_limit", 100)
        if not _auth_service.check_rate_limit(api_key, limit=rate_limit):
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Please slow down."
            )
        return api_key

    raise HTTPException(
        status_code=401,
        detail="Invalid API key"
    )


async def verify_api_key_optional(
    api_key_header: Optional[str] = Security(API_KEY_HEADER),
    api_key_query: Optional[str] = Security(API_KEY_QUERY)
) -> Optional[str]:
    """Optional API key verification (for public endpoints with optional auth)

    Returns:
        API key if valid, None otherwise
    """
    api_key = api_key_header or api_key_query

    if not api_key:
        return None

    if _auth_service.validate_api_key(api_key):
        return api_key

    key_info = await _auth_service.validate_api_key_db(api_key)
    if key_info:
        return api_key

    return None


def get_auth_service() -> AuthService:
    """Get auth service instance"""
    return _auth_service
