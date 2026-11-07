from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(
    title="Road Transport POD Management API",
    version="1.1",
    description="Backend API for POD collection, AI verification, review, and billing preparation."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "pod-management-api",
        "environment": settings.ENVIRONMENT,
        "version": "1.1"
    }
