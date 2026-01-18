# Cache Service - Redis-based caching for the support escalation agent
import redis.asyncio as redis
from typing import Any, Optional
import json
import os


class CacheService:
    """Redis-based caching service for context, rate limiting, and session data"""

    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self._client: Optional[redis.Redis] = None

    async def _get_client(self) -> redis.Redis:
        """Lazy initialization of Redis client"""
        if self._client is None:
            self._client = redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
        return self._client

    async def get(self, key: str) -> Optional[Any]:
        """Retrieve a value from cache

        Args:
            key: Cache key to retrieve

        Returns:
            Cached value (deserialized from JSON) or None if not found
        """
        try:
            client = await self._get_client()
            value = await client.get(key)
            if value is not None:
                return json.loads(value)
            return None
        except redis.RedisError as e:
            print(f"Cache get error: {e}")
            return None

    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Store a value in cache

        Args:
            key: Cache key
            value: Value to store (will be serialized to JSON)
            ttl: Time to live in seconds (default: 1 hour)

        Returns:
            True if successful, False otherwise
        """
        try:
            client = await self._get_client()
            serialized = json.dumps(value)
            await client.setex(key, ttl, serialized)
            return True
        except (redis.RedisError, json.JSONEncodeError) as e:
            print(f"Cache set error: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """Delete a key from cache

        Args:
            key: Cache key to delete

        Returns:
            True if key was deleted, False otherwise
        """
        try:
            client = await self._get_client()
            result = await client.delete(key)
            return result > 0
        except redis.RedisError as e:
            print(f"Cache delete error: {e}")
            return False

    async def increment(self, key: str, amount: int = 1) -> int:
        """Increment a counter in cache

        Args:
            key: Cache key for the counter
            amount: Amount to increment by (default: 1)

        Returns:
            New counter value
        """
        try:
            client = await self._get_client()
            return await client.incrby(key, amount)
        except redis.RedisError as e:
            print(f"Cache increment error: {e}")
            return 0

    async def expire(self, key: str, ttl: int) -> bool:
        """Set expiration time on a key

        Args:
            key: Cache key
            ttl: Time to live in seconds

        Returns:
            True if expiration was set, False otherwise
        """
        try:
            client = await self._get_client()
            return await client.expire(key, ttl)
        except redis.RedisError as e:
            print(f"Cache expire error: {e}")
            return False

    async def exists(self, key: str) -> bool:
        """Check if a key exists in cache

        Args:
            key: Cache key to check

        Returns:
            True if key exists, False otherwise
        """
        try:
            client = await self._get_client()
            return await client.exists(key) > 0
        except redis.RedisError as e:
            print(f"Cache exists error: {e}")
            return False

    async def get_many(self, keys: list[str]) -> dict[str, Any]:
        """Retrieve multiple values from cache

        Args:
            keys: List of cache keys to retrieve

        Returns:
            Dictionary of key-value pairs for found keys
        """
        try:
            client = await self._get_client()
            values = await client.mget(keys)
            result = {}
            for key, value in zip(keys, values):
                if value is not None:
                    result[key] = json.loads(value)
            return result
        except redis.RedisError as e:
            print(f"Cache get_many error: {e}")
            return {}

    async def close(self):
        """Close the Redis connection"""
        if self._client is not None:
            await self._client.close()
            self._client = None
