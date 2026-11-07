from pydantic import BaseModel, Field
from typing import Optional, Literal, List, Dict, Any
from uuid import UUID
from datetime import datetime, date

# --- Auth ---
class UserProfileResponse(BaseModel):
    id: UUID
    email: str
    role: str
    full_name: str

# --- Trips ---
class TripResponse(BaseModel):
    id: UUID
    trip_number: str
    customer_name: str
    goods_description: str
    vehicle_number: str
    destination: str
    trip_amount: float
    vehicle_type: str
    driver_id: Optional[UUID] = None
    vendor_name: Optional[str] = None
    expected_lr_number: Optional[str] = None
    invoice_number: Optional[str] = None
    expected_quantity: Optional[float] = None
    quantity_unit: Optional[str] = "units"
    trip_date: date
    pod_required: bool = True
    pod_status: Optional[str] = "pending"

class TripListResponse(BaseModel):
    items: List[TripResponse]
    total: int

class TripImportSummary(BaseModel):
    imported_count: int
    skipped_count: int
    errors: List[str]

# --- AI Extraction & Verification ---
class DocumentVerificationResult(BaseModel):
    lr_number: Optional[str] = None
    lr_number_confidence: float = 0.0
    detected_invoice_number: Optional[str] = None
    stamp_visible: bool = False
    signature_visible: bool = False
    delivered_quantity: Optional[float] = None
    quantity_unit: Optional[str] = None
    shortage_detected: bool = False
    damage_detected: bool = False
    remarks: Optional[str] = None
    delivery_date: Optional[str] = None
    overall_confidence: float = 0.0

def create_timeout_verification(error_msg: str = "AI_TIMEOUT") -> DocumentVerificationResult:
    return DocumentVerificationResult(
        overall_confidence=0.0,
        remarks=f"Verification failed: {error_msg}"
    )

def evaluate_decision(ai_result: Optional[DocumentVerificationResult], expected_lr: Optional[str], retake_count: int) -> str:
    if ai_result is None or ai_result.overall_confidence == 0.0:
        return "needs_review"
    if ai_result.overall_confidence < 0.85:
        return "needs_review"
    if ai_result.shortage_detected or ai_result.damage_detected:
        return "needs_review"
    if expected_lr and ai_result.lr_number != expected_lr:
        return "needs_review"
    if not ai_result.stamp_visible or not ai_result.signature_visible:
        if retake_count < 2:
            return "retake_requested"
        return "needs_review" # Auto-escalate after 2 retakes
    return "verified"

# --- POD Upload & Review ---
class PodUploadResponse(BaseModel):
    pod_id: UUID
    trip_id: UUID
    upload_status: Literal["uploaded"]
    verification_status: Literal["verified", "retake_requested", "needs_review", "failed"]
    attempt_number: int
    message: str

class PodReviewActionRequest(BaseModel):
    decision: Literal["approved", "rejected", "request_retake"]
    review_notes: Optional[str] = None
    corrected_quantity: Optional[float] = None
    deduction_amount: Optional[float] = 0.00
    adjusted_billing_amount: Optional[float] = None

class UploadLinkResponse(BaseModel):
    trip_id: UUID
    token: str
    upload_url: str
    sms_preview_text: str
    expires_at: datetime

# --- Billing & Dashboard ---
class BillingQueueItem(BaseModel):
    pod_id: UUID
    trip_id: UUID
    trip_number: str
    customer_name: str
    vehicle_number: str
    vehicle_type: str
    destination: str
    goods_description: str
    lr_number: Optional[str] = None
    delivered_quantity: Optional[float] = None
    quantity_unit: Optional[str] = None
    original_amount: float
    deduction_amount: float
    final_billed_amount: float
    billing_status: str

class DashboardMetricsResponse(BaseModel):
    total_trips: int
    pods_submitted: int
    pods_pending: int
    needs_review: int
    retake_requested: int
    billing_ready: int
    exported_count: int

class PublicPodViewResponse(BaseModel):
    trip_number: str
    customer_name: str
    vehicle_number: str
    destination: str
    goods_description: str
    delivery_date: Optional[str] = None
    signed_image_url: str
    verification_status: str
