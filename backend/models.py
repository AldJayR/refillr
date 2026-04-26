from datetime import datetime, UTC
from typing import Annotated, Literal, Any
from pydantic import BaseModel, Field, ConfigDict, BeforeValidator, PlainSerializer

# Modern Pydantic v2 way to handle MongoDB ObjectIds
def validate_object_id(v: Any) -> str:
    if isinstance(v, str):
        return v
    return str(v)

# Type alias for serializable ObjectIds
SerializableObjectId = Annotated[
    str, 
    BeforeValidator(validate_object_id),
    PlainSerializer(lambda v: str(v), return_type=str)
]

class GeoPoint(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: list[float]  # [longitude, latitude]

class SavedAddress(BaseModel):
    label: Literal["home", "office", "other"] = "other"
    coordinates: list[float]
    address: str
    baranggay: str | None = None
    city: str | None = None
    isDefault: bool = False

class User(BaseModel):
    clerkId: str
    email: str
    firstName: str | None = None
    lastName: str | None = None
    phoneNumber: str | None = None
    savedAddresses: list[SavedAddress] = Field(default_factory=list)
    favoriteMerchants: list[str] = Field(default_factory=list)
    favoriteBrands: list[str] = Field(default_factory=list)
    role: Literal["customer", "merchant", "rider", "admin"] = "customer"

class Merchant(BaseModel):
    ownerUserId: str
    shopName: str
    doePermitNumber: str
    location: GeoPoint
    brandsAccepted: list[str] = Field(default_factory=list)
    pricing: dict[str, float] = Field(default_factory=dict)
    isOpen: bool = True
    isVerified: bool = False
    phoneNumber: str | None = None
    address: str | None = None
    baranggay: str | None = None
    city: str | None = None
    tankSizes: list[str] = Field(default_factory=list)
    deliveryRadiusMeters: float = 5000.0

class Order(BaseModel):
    userId: str | None = None  # Populated from auth
    merchantId: SerializableObjectId
    riderId: str | None = None
    tankBrand: Literal["Gasul", "Solane", "Petron", "other"]
    tankSize: Literal["2.7kg", "5kg", "11kg", "22kg", "50kg"]
    quantity: int = 1
    totalPrice: float
    status: Literal["pending", "accepted", "dispatched", "in_transit", "delivered", "cancelled"] = "pending"
    deliveryLocation: GeoPoint
    deliveryAddress: str
    notes: str | None = None
    acceptedAt: datetime | None = None
    dispatchedAt: datetime | None = None
    deliveredAt: datetime | None = None
    cancelledAt: datetime | None = None
    cancellationReason: str | None = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(UTC))

    model_config = ConfigDict(arbitrary_types_allowed=True)

class Rider(BaseModel):
    userId: str
    firstName: str
    lastName: str
    phoneNumber: str
    vehicleType: Literal["motorcycle", "bicycle", "sidecar"]
    plateNumber: str | None = None
    licenseNumber: str | None = None
    isOnline: bool = False
    isVerified: bool = False
    lastLocation: GeoPoint | None = None
    totalDeliveries: int = 0
    totalEarnings: float = 0.0

class DOEPriceEntry(BaseModel):
    brand: str
    size: str
    suggestedRetailPrice: float
    maxRetailPrice: float

class DOEConfig(BaseModel):
    weekLabel: str
    effectiveDate: datetime
    prices: list[DOEPriceEntry]
    isActive: bool = True
