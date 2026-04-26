import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from dotenv import load_dotenv

# Load environment variables from the root .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = "refillr"

class DatabaseManager:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None

db_manager = DatabaseManager()

async def connect_to_mongo() -> None:
    db_manager.client = AsyncIOMotorClient(MONGODB_URI)
    db_manager.db = db_manager.client[DB_NAME]
    print(f"✅ Connected to MongoDB at {MONGODB_URI}")

async def close_mongo_connection() -> None:
    if db_manager.client:
        db_manager.client.close()
        print("🛑 MongoDB connection closed")

async def get_db() -> AsyncIOMotorDatabase:
    if db_manager.db is None:
        raise RuntimeError("Database not initialized")
    return db_manager.db
