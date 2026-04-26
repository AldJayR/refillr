# Refillr Python Backend (Fake)

This is a FastAPI-based backend that mirrors the functionality of the Refillr TanStack Start backend.
It is intended for testing and as a starting point for a full Python backend.

## Features

- **FastAPI**: Modern, fast (high-performance) web framework.
- **Motor**: Asynchronous MongoDB driver.
- **Pydantic**: Data validation and settings management.
- **Fake Auth**: Uses `X-User-Id` header to simulate the authenticated user.

## Setup

1.  **Environment**: Ensure you have a `.env` file in the root directory with `MONGODB_URI`.
2.  **Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
3.  **Run**:
    ```bash
    uvicorn main:app --reload --port 8000
    ```

## Endpoints

- `GET /me/status`: Get current user role and profile flags.
- `GET /me/addresses`: Get saved addresses.
- `POST /me/addresses`: Save or update an address.
- `GET /merchants/nearby`: Find nearby merchants (requires `lat`, `lng` queries).
- `GET /merchants/{id}`: Get merchant details.
- `GET /orders/me`: Get user's orders.
- `POST /orders`: Create a new refill request.
- `GET /doe/config`: Get active DOE configuration.

## Authentication (Fake)

Send an `X-User-Id` header with any request that requires authentication.
If omitted, it defaults to a fake user ID `user_2p8X...fake`.
