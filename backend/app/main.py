from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.api.trips import router as trips_router
from app.api.pods import router as pods_router, limiter
from app.api.review import router as review_router
from app.api.audio import router as audio_router

app = FastAPI(
    title="Road Transport POD Management API",
    version="1.1",
    description="Backend API for POD collection, AI verification, review, and billing preparation."
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trips_router)
app.include_router(pods_router)
app.include_router(review_router)
app.include_router(audio_router)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "pod-management-api",
        "environment": settings.ENVIRONMENT,
        "version": "1.1"
    }
