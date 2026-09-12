import uuid
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from backend.app.api.v1.router import router as api_v1_router
from backend.app.core.exceptions import register_exception_handlers
from backend.app.core.logging import set_request_id


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Middleware that ensures every incoming request has a unique request_id.
    Injects request_id into contextvars for structured logging across stages.
    """
    async def dispatch(self, request: Request, call_next):
        # Retrieve x-request-id header or generate a new UUID
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        set_request_id(request_id)
        
        response = await call_next(request)
        
        # Append request-id back into the response header for auditability
        response.headers["x-request-id"] = request_id
        return response


def create_app() -> FastAPI:
    """FastAPI application factory."""
    app = FastAPI(
        title="NEXUS-CRIME",
        description="Multi-Source Crime Data Ingestion & Analytics Pipeline",
        version="1.0.0"
    )

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register Request ID middleware
    app.add_middleware(RequestIDMiddleware)

    # Register domain exception handlers
    register_exception_handlers(app)

    # Mount API version 1 routers
    app.include_router(api_v1_router, prefix="/api/v1")

    return app


app = create_app()
