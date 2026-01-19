# Database Layer - MongoDB async database connection and operations
import os
from typing import Optional, AsyncGenerator
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from contextlib import asynccontextmanager


class DatabaseManager:
    """Manages MongoDB database connections"""

    _instance: Optional["DatabaseManager"] = None
    _client: Optional[AsyncIOMotorClient] = None
    _db: Optional[AsyncIOMotorDatabase] = None
    _connected: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._client is None:
            self.mongodb_url = os.getenv(
                "MONGODB_URL",
                "mongodb://localhost:27017"
            )
            self.database_name = os.getenv(
                "DATABASE_NAME",
                "support_escalation"
            )

    async def connect(self):
        """Establish database connection"""
        if self._client is None:
            try:
                self._client = AsyncIOMotorClient(
                    self.mongodb_url,
                    serverSelectionTimeoutMS=5000  # 5 second timeout
                )
                # Test the connection
                await self._client.admin.command('ping')
                self._db = self._client[self.database_name]

                # Create indexes
                await self._create_indexes()
                self._connected = True
            except Exception as e:
                print(f"Warning: Could not connect to MongoDB: {e}")
                print("Running in demo mode without database persistence")
                self._client = None
                self._db = None
                self._connected = False

    async def _create_indexes(self):
        """Create necessary database indexes"""
        if self._db is not None:
            # Tickets collection indexes
            await self._db.tickets.create_index("user_id")
            await self._db.tickets.create_index("status")
            await self._db.tickets.create_index("created_at")
            await self._db.tickets.create_index([
                ("user_id", 1),
                ("status", 1)
            ])

            # Responses collection indexes
            await self._db.responses.create_index("ticket_id")
            await self._db.responses.create_index("created_at")

            # Feedback collection indexes
            await self._db.feedback.create_index("ticket_id")
            await self._db.feedback.create_index("response_id")

    async def disconnect(self):
        """Close database connection"""
        if self._client is not None:
            self._client.close()
            self._client = None
            self._db = None

    @property
    def is_connected(self) -> bool:
        """Check if database is connected"""
        return self._connected

    @property
    def db(self) -> Optional[AsyncIOMotorDatabase]:
        """Get database instance"""
        return self._db

    @property
    def client(self) -> AsyncIOMotorClient:
        """Get client instance"""
        if self._client is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        return self._client


# Global database manager instance
_db_manager = DatabaseManager()


async def init_db():
    """Initialize database connection"""
    await _db_manager.connect()


async def close_db():
    """Close database connection"""
    await _db_manager.disconnect()


def get_db() -> AsyncIOMotorDatabase:
    """Get database instance for dependency injection

    Returns:
        AsyncIOMotorDatabase instance
    """
    return _db_manager.db


@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    """Context manager for database sessions

    Yields:
        AsyncIOMotorDatabase instance
    """
    try:
        yield _db_manager.db
    finally:
        pass  # Connection pooling handles cleanup


# Collection accessors for convenience
class Collections:
    """Database collection accessors"""

    @staticmethod
    def tickets():
        """Get tickets collection"""
        return _db_manager.db.tickets

    @staticmethod
    def responses():
        """Get responses collection"""
        return _db_manager.db.responses

    @staticmethod
    def feedback():
        """Get feedback collection"""
        return _db_manager.db.feedback

    @staticmethod
    def users():
        """Get users collection"""
        return _db_manager.db.users

    @staticmethod
    def metrics():
        """Get metrics collection"""
        return _db_manager.db.metrics


# Repository classes for data access patterns
class TicketRepository:
    """Repository for ticket operations"""

    def __init__(self):
        self.collection = Collections.tickets()

    async def create(self, ticket_data: dict) -> str:
        """Create a new ticket"""
        result = await self.collection.insert_one(ticket_data)
        return str(result.inserted_id)

    async def get_by_id(self, ticket_id: str) -> Optional[dict]:
        """Get ticket by ID"""
        return await self.collection.find_one({"id": ticket_id})

    async def get_by_user(
        self,
        user_id: str,
        status: Optional[str] = None,
        limit: int = 10
    ) -> list:
        """Get tickets for a user"""
        query = {"user_id": user_id}
        if status:
            query["status"] = status

        cursor = self.collection.find(query).sort(
            "created_at", -1
        ).limit(limit)

        return await cursor.to_list(length=limit)

    async def update(self, ticket_id: str, update_data: dict) -> bool:
        """Update a ticket"""
        result = await self.collection.update_one(
            {"id": ticket_id},
            {"$set": update_data}
        )
        return result.modified_count > 0

    async def get_pending(self, limit: int = 100) -> list:
        """Get pending tickets"""
        cursor = self.collection.find(
            {"status": "pending"}
        ).sort("created_at", 1).limit(limit)

        return await cursor.to_list(length=limit)


class ResponseRepository:
    """Repository for response operations"""

    def __init__(self):
        self.collection = Collections.responses()

    async def create(self, response_data: dict) -> str:
        """Create a new response"""
        result = await self.collection.insert_one(response_data)
        return str(result.inserted_id)

    async def get_by_ticket(self, ticket_id: str) -> Optional[dict]:
        """Get response for a ticket"""
        return await self.collection.find_one({"ticket_id": ticket_id})

    async def update(self, response_id: str, update_data: dict) -> bool:
        """Update a response"""
        result = await self.collection.update_one(
            {"id": response_id},
            {"$set": update_data}
        )
        return result.modified_count > 0


class FeedbackRepository:
    """Repository for feedback operations"""

    def __init__(self):
        self.collection = Collections.feedback()

    async def create(self, feedback_data: dict) -> str:
        """Create new feedback"""
        result = await self.collection.insert_one(feedback_data)
        return str(result.inserted_id)

    async def get_by_response(self, response_id: str) -> list:
        """Get feedback for a response"""
        cursor = self.collection.find({"response_id": response_id})
        return await cursor.to_list(length=100)

    async def get_recent(self, limit: int = 100) -> list:
        """Get recent feedback for model improvement"""
        cursor = self.collection.find().sort(
            "created_at", -1
        ).limit(limit)

        return await cursor.to_list(length=limit)
