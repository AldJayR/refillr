from contextlib import asynccontextmanager
from datetime import datetime, UTC
from typing import Annotated

from bson import ObjectId
from fastapi import FastAPI, Header, HTTPException, Depends, Body
from motor.motor_asyncio import AsyncIOMotorDatabase

from .database import connect_to_mongo, close_mongo_connection, get_db
from .models import User, Merchant, Order, SavedAddress, Rider, DOEConfig

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()

app = FastAPI(
    title="Refillr Modern Python Backend",
    lifespan=lifespan
)

# --- DEPENDENCIES ---

async def get_current_user_id(x_user_id: Annotated[str | None, Header()] = None) -> str:
    """Simulates Clerk authentication via header."""
    if not x_user_id:
        return "user_2p8X...fake"
    return x_user_id

CurrentUser = Annotated[str, Depends(get_current_user_id)]
Database = Annotated[AsyncIOMotorDatabase, Depends(get_db)]

# --- ROUTES ---

@app.get("/")
async def root():
    return {"message": "Welcome to Refillr Python Backend (Modernized)"}

# --- USER FUNCTIONS ---

@app.get("/me/status")
async def get_my_account_status(user_id: CurrentUser, db: Database):
    user = await db.users.find_one({"clerkId": user_id})
    merchant = await db.merchants.find_one({"ownerUserId": user_id})
    rider = await db.riders.find_one({"userId": user_id})
    
    return {
        "role": user.get("role") if user else "customer",
        "hasMerchant": bool(merchant),
        "hasRider": bool(rider)
    }

@app.get("/me/addresses", response_model=list[SavedAddress])
async def get_saved_addresses(user_id: CurrentUser, db: Database):
    user = await db.users.find_one({"clerkId": user_id})
    return user.get("savedAddresses", []) if user else []

@app.post("/me/addresses")
async def save_address(user_id: CurrentUser, db: Database, address: SavedAddress):
    if address.isDefault:
        await db.users.update_one(
            {"clerkId": user_id}, 
            {"$set": {"savedAddresses.$[].isDefault": False}}
        )

    # Dictionary unpacking for modern updates
    update_data = {f"savedAddresses.$.{k}": v for k, v in address.model_dump().items()}
    
    result = await db.users.update_one(
        {"clerkId": user_id, "savedAddresses.label": address.label},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        await db.users.update_one(
            {"clerkId": user_id},
            {"$push": {"savedAddresses": address.model_dump()}},
            upsert=True
        )
    return {"success": True}

@app.delete("/me/addresses/{label}")
async def delete_address(user_id: CurrentUser, db: Database, label: str):
    await db.users.update_one(
        {"clerkId": user_id}, 
        {"$pull": {"savedAddresses": {"label": label}}}
    )
    return {"success": True}

# --- MERCHANT FUNCTIONS ---

@app.get("/merchants/me")
async def get_my_merchant(user_id: CurrentUser, db: Database):
    if doc := await db.merchants.find_one({"ownerUserId": user_id}):
        doc["_id"] = str(doc["_id"])
        return doc
    return None

@app.post("/merchants")
async def create_merchant(user_id: CurrentUser, db: Database, merchant: Merchant):
    data = merchant.model_dump()
    data["ownerUserId"] = user_id
    result = await db.merchants.insert_one(data)
    await db.users.update_one({"clerkId": user_id}, {"$set": {"role": "merchant"}})
    return {"id": str(result.inserted_id)}

@app.get("/merchants/nearby")
async def get_nearby_merchants(db: Database, lat: float, lng: float, radius: float = 5000):
    cursor = db.merchants.find({
        "location": {
            "$near": {
                "$geometry": {"type": "Point", "coordinates": [lng, lat]}, 
                "$maxDistance": radius
            }
        }
    })
    return [{**doc, "_id": str(doc["_id"])} async for doc in cursor]

@app.get("/merchants/{merchant_id}")
async def get_merchant_by_id(db: Database, merchant_id: str):
    query = {"_id": ObjectId(merchant_id)} if ObjectId.is_valid(merchant_id) else {"ownerUserId": merchant_id}
    if doc := await db.merchants.find_one(query):
        doc["_id"] = str(doc["_id"])
        return doc
    raise HTTPException(status_code=404, detail="Merchant not found")

# --- ORDER FUNCTIONS ---

@app.get("/orders/me")
async def get_user_orders(user_id: CurrentUser, db: Database):
    cursor = db.orders.find({"userId": user_id}).sort("createdAt", -1)
    return [{**doc, "_id": str(doc["_id"]), "merchantId": str(doc["merchantId"])} async for doc in cursor]

@app.post("/orders")
async def create_order(user_id: CurrentUser, db: Database, order: Order):
    data = order.model_dump()
    data["userId"] = user_id
    data["merchantId"] = ObjectId(order.merchantId)
    result = await db.orders.insert_one(data)
    return {"orderId": str(result.inserted_id)}

@app.post("/orders/{order_id}/status")
async def update_order_status(
    db: Database, 
    order_id: str, 
    status: Annotated[str, Body(embed=True)]
):
    await db.orders.update_one(
        {"_id": ObjectId(order_id)}, 
        {"$set": {"status": status, "updatedAt": datetime.now(UTC)}}
    )
    return {"success": True}

# --- RIDER FUNCTIONS ---

@app.get("/riders/me")
async def get_my_rider(user_id: CurrentUser, db: Database):
    if doc := await db.riders.find_one({"userId": user_id}):
        doc["_id"] = str(doc["_id"])
        return doc
    return None

@app.post("/riders/status")
async def update_rider_status(user_id: CurrentUser, db: Database, is_online: Annotated[bool, Body(embed=True)]):
    await db.riders.update_one({"userId": user_id}, {"$set": {"isOnline": is_online}})
    return {"success": True}

@app.get("/doe/config")
async def get_doe_config(db: Database):
    if doc := await db.doe_config.find_one({"isActive": True}, sort=[("effectiveDate", -1)]):
        doc["_id"] = str(doc["_id"])
        return doc
    return None
