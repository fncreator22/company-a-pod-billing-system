from fastapi import APIRouter, Depends, HTTPException, status, Response
from typing import List, Dict, Any
from uuid import UUID

from app.core.dependencies import get_current_user, CurrentUser, require_role
from app.schemas.all_schemas import (
    PodReviewActionRequest,
    BillingQueueItem,
    DashboardMetricsResponse,
    PublicPodViewResponse
)
from app.services.billing_service import billing_service
from app.services.pod_service import pod_service
from app.services.trip_service import trip_service

router = APIRouter(prefix="/api", tags=["Review & Billing"])

# --- Review Queue ---
@router.get("/pods/review")
async def get_review_queue(user: CurrentUser = Depends(require_role("billing_executive"))):
    """
    Fetch all PODs requiring manual review.
    """
    return billing_service.list_review_queue()

@router.patch("/pods/{pod_id}/review")
async def save_review_decision(
    pod_id: UUID,
    request: PodReviewActionRequest,
    user: CurrentUser = Depends(require_role("billing_executive"))
):
    """
    Record reviewer decision (approved, request_retake, rejected)
    with non-destructive corrections & shortage deductions.
    """
    try:
        updated_pod = billing_service.save_review_decision(
            pod_id=pod_id,
            request=request,
            reviewer_id=user.id
        )
        return {"status": "success", "pod": updated_pod}
    except KeyError as ke:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ke))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

# --- Billing Queue & CSV Export ---
@router.get("/billing/queue", response_model=List[BillingQueueItem])
async def get_billing_queue(user: CurrentUser = Depends(require_role("billing_executive"))):
    """
    Fetch all verified and approved records eligible for billing.
    """
    return billing_service.get_billing_queue()

@router.get("/billing/export")
async def export_billing_csv(user: CurrentUser = Depends(require_role("billing_executive"))):
    """
    Download Tally-compatible CSV of verified deliveries.
    Transitions records to 'exported'.
    """
    csv_data = billing_service.export_tally_csv()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tally_pod_export.csv"}
    )

# --- Dashboard Metrics ---
@router.get("/dashboard/metrics", response_model=DashboardMetricsResponse)
async def get_dashboard_metrics(user: CurrentUser = Depends(require_role("billing_executive"))):
    """
    Summary counters for the operational dashboard.
    """
    return billing_service.get_dashboard_metrics()

# --- Public Client POD Viewer (FR-18) ---
@router.get("/public/pod/{share_token}", response_model=PublicPodViewResponse)
async def view_public_pod(share_token: UUID):
    """
    Public read-only POD verification viewer (valid 30 days).
    Omits sensitive internal financials.
    """
    # Find pod by share_token
    target_pod = None
    for p in pod_service._pods.values():
        if p.get("share_token") == share_token:
            target_pod = p
            break

    if not target_pod:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="POD document not found or link expired")

    trip = trip_service._trips.get(target_pod["trip_id"], {})
    verif = pod_service._verifications.get(target_pod["id"], [{}])[-1] if target_pod["id"] in pod_service._verifications else {}

    return PublicPodViewResponse(
        trip_number=trip.get("trip_number", ""),
        customer_name=trip.get("customer_name", ""),
        vehicle_number=trip.get("vehicle_number", ""),
        destination=trip.get("destination", ""),
        goods_description=trip.get("goods_description", ""),
        delivery_date=verif.get("extracted_data", {}).get("delivery_date"),
        signed_image_url="https://mock.supabase.co/storage/v1/object/sign/pod-images/" + target_pod["storage_path"],
        verification_status=target_pod["verification_status"]
    )
