from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import List
from uuid import UUID
from app.core.dependencies import get_current_user, CurrentUser, require_role
from app.schemas.all_schemas import TripResponse, TripListResponse, TripImportSummary
from app.services.trip_service import trip_service

router = APIRouter(prefix="/api/trips", tags=["Trips"])

@router.get("", response_model=TripListResponse)
async def list_trips(user: CurrentUser = Depends(get_current_user)):
    """
    List trips visible to the authenticated user.
    Drivers see assigned trips only. Billing executives see all.
    """
    trips = trip_service.list_trips(user_role=user.role, user_id=user.id)
    return TripListResponse(items=trips, total=len(trips))

@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip(trip_id: UUID, user: CurrentUser = Depends(get_current_user)):
    """
    Get detailed trip information by ID.
    Enforces driver ownership check.
    """
    trip = trip_service.get_trip(trip_id=trip_id, user_role=user.role, user_id=user.id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found or unauthorized"
        )
    return trip

@router.post("/import", response_model=TripImportSummary)
async def import_trips_csv(
    file: UploadFile = File(...),
    user: CurrentUser = Depends(require_role("billing_executive"))
):
    """
    Import daily operational trips from a CSV file.
    Restricted to Billing Executives.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Please upload a .csv file."
        )

    content = (await file.read()).decode("utf-8")
    summary = trip_service.import_csv(content)
    return summary
