from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.dependencies import get_current_user, CurrentUser
from app.schemas.all_schemas import PodUploadResponse
from app.services.pod_service import pod_service
from app.services.trip_service import trip_service

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api", tags=["POD Captures"])

@router.post("/pods/upload", response_model=PodUploadResponse)
async def upload_company_driver_pod(
    trip_id: UUID = Form(...),
    client_upload_id: UUID = Form(...),
    file: UploadFile = File(...),
    capture_time: datetime = Form(default_factory=lambda: datetime.now(timezone.utc)),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    gps_accuracy_meters: Optional[float] = Form(None),
    mock_ai_scenario: Optional[str] = Form(None), # Used for deterministic testing
    user: CurrentUser = Depends(get_current_user)
):
    """
    Authenticated POD upload for company drivers.
    Enforces image compression validation (<300 KB), 8s AI timeout,
    and returns immediate deterministic verification results.
    """
    # Verify driver has access to this trip
    trip = trip_service.get_trip(trip_id=trip_id, user_role=user.role, user_id=user.id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found or unauthorized for this driver"
        )

    file_bytes = await file.read()
    try:
        response = await pod_service.process_upload(
            trip_id=trip_id,
            client_upload_id=client_upload_id,
            file_bytes=file_bytes,
            mime_type=file.content_type or "image/jpeg",
            capture_time=capture_time,
            latitude=latitude,
            longitude=longitude,
            gps_accuracy_meters=gps_accuracy_meters,
            submitted_by=user.id,
            mock_ai_scenario=mock_ai_scenario,
            expected_lr=trip.expected_lr_number
        )
        return response
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))

@router.post("/public/upload/{token}", response_model=PodUploadResponse)
@limiter.limit("10/minute")
async def upload_hired_driver_pod(
    token: str,
    request: Request,
    client_upload_id: UUID = Form(...),
    file: UploadFile = File(...),
    capture_time: datetime = Form(default_factory=lambda: datetime.now(timezone.utc)),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    gps_accuracy_meters: Optional[float] = Form(None),
    mock_ai_scenario: Optional[str] = Form(None)
):
    """
    Public rate-limited upload endpoint for hired drivers via mock SMS token.
    Tracks multi-attempt limits (up to 3) without requiring login.
    """
    token_info = pod_service.validate_hired_token(token)
    if not token_info:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Upload link is invalid, expired, or has reached its maximum attempts."
        )

    trip_id = token_info["trip_id"]
    trip = trip_service._trips.get(trip_id)
    expected_lr = trip.get("expected_lr_number") if trip else None

    file_bytes = await file.read()
    try:
        response = await pod_service.process_upload(
            trip_id=trip_id,
            client_upload_id=client_upload_id,
            file_bytes=file_bytes,
            mime_type=file.content_type or "image/jpeg",
            capture_time=capture_time,
            latitude=latitude,
            longitude=longitude,
            gps_accuracy_meters=gps_accuracy_meters,
            submitted_by=None,
            mock_ai_scenario=mock_ai_scenario,
            expected_lr=expected_lr
        )
        # Check if terminal state reached
        is_terminal = response.verification_status in ("verified", "needs_review")
        pod_service.increment_token_attempt(token, terminal=is_terminal)
        return response
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
