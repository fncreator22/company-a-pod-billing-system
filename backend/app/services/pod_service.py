from typing import Dict, Any, Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone
from app.schemas.all_schemas import (
    PodUploadResponse,
    DocumentVerificationResult,
    evaluate_decision
)
from app.ai.gemini_provider import ai_provider

class PodService:
    def __init__(self):
        # In-memory storage for PODs and attempts
        self._pods: Dict[UUID, Dict[str, Any]] = {}
        self._verifications: Dict[UUID, list] = {}
        self._upload_tokens: Dict[str, Dict[str, Any]] = {
            # Hired truck TRP-66141 mock token (sha256 of "hired-driver-token-141")
            "hired-driver-token-141": {
                "trip_id": UUID("c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03"),
                "attempt_count": 0,
                "max_attempts": 3,
                "is_revoked": False
            }
        }
        self._storage_mock: Dict[str, bytes] = {}

    async def process_upload(
        self,
        trip_id: UUID,
        client_upload_id: UUID,
        file_bytes: bytes,
        mime_type: str,
        capture_time: datetime,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        gps_accuracy_meters: Optional[float] = None,
        submitted_by: Optional[UUID] = None,
        mock_ai_scenario: Optional[str] = None,
        expected_lr: Optional[str] = None
    ) -> PodUploadResponse:
        # 1. Image Size Validation (Strict < 300 KB limit)
        if len(file_bytes) > 307200:
            raise ValueError(f"Image size exceeds 300 KB limit ({len(file_bytes)} bytes)")

        # 2. Idempotency Check: if client_upload_id exists, return existing status
        for pod in self._pods.values():
            if pod["client_upload_id"] == client_upload_id:
                return PodUploadResponse(
                    pod_id=pod["id"],
                    trip_id=pod["trip_id"],
                    upload_status="uploaded",
                    verification_status=pod["verification_status"],
                    attempt_number=pod["attempt_number"],
                    message="Idempotent duplicate submission acknowledged"
                )

        # 3. Determine attempt number and retake count for this trip
        existing_pods = [p for p in self._pods.values() if p["trip_id"] == trip_id]
        attempt_number = len(existing_pods) + 1
        retake_count = len(existing_pods)

        # 4. Storage Upload with Compensation Rollback
        storage_path = f"pods/{trip_id}/{attempt_number}_{client_upload_id}.jpg"
        self._storage_mock[storage_path] = file_bytes

        pod_id = uuid4()
        try:
            # 5. Call AI Provider with 8s timeout
            ai_result: DocumentVerificationResult = await ai_provider.extract_and_verify(
                image_bytes=file_bytes,
                mime_type=mime_type,
                mock_scenario=mock_ai_scenario
            )

            # 6. Apply Deterministic Workflow Rules
            final_status = evaluate_decision(ai_result, expected_lr=expected_lr, retake_count=retake_count)

            # 7. Record POD & Verification History
            pod_record = {
                "id": pod_id,
                "trip_id": trip_id,
                "submitted_by": submitted_by,
                "client_upload_id": client_upload_id,
                "storage_path": storage_path,
                "image_size_bytes": len(file_bytes),
                "mime_type": mime_type,
                "capture_time": capture_time,
                "uploaded_at": datetime.now(timezone.utc),
                "latitude": latitude,
                "longitude": longitude,
                "gps_accuracy_meters": gps_accuracy_meters,
                "upload_status": "uploaded",
                "verification_status": final_status,
                "retake_count": min(retake_count, 2),
                "attempt_number": attempt_number,
                "reviewer_id": None,
                "reviewed_at": None,
                "review_notes": None,
                "corrected_data": None,
                "share_token": uuid4(),
                "created_at": datetime.now(timezone.utc)
            }
            self._pods[pod_id] = pod_record

            verification_record = {
                "id": uuid4(),
                "pod_id": pod_id,
                "attempt_number": attempt_number,
                "storage_path": storage_path,
                "extracted_data": ai_result.model_dump(),
                "overall_confidence": ai_result.overall_confidence,
                "lr_match": ai_result.lr_number == expected_lr if expected_lr else True,
                "stamp_visible": ai_result.stamp_visible,
                "signature_visible": ai_result.signature_visible,
                "shortage_detected": ai_result.shortage_detected,
                "damage_detected": ai_result.damage_detected,
                "decision": final_status,
                "created_at": datetime.now(timezone.utc)
            }
            if pod_id not in self._verifications:
                self._verifications[pod_id] = []
            self._verifications[pod_id].append(verification_record)

            return PodUploadResponse(
                pod_id=pod_id,
                trip_id=trip_id,
                upload_status="uploaded",
                verification_status=final_status,
                attempt_number=attempt_number,
                message=f"POD processed successfully: {final_status}"
            )

        except Exception as e:
            # Compensation rollback: Clean storage leak
            if storage_path in self._storage_mock:
                del self._storage_mock[storage_path]
            raise e

    def validate_hired_token(self, token: str) -> Optional[Dict[str, Any]]:
        token_info = self._upload_tokens.get(token)
        if not token_info:
            return None
        if token_info["is_revoked"] or token_info["attempt_count"] >= token_info["max_attempts"]:
            return None
        return token_info

    def increment_token_attempt(self, token: str, terminal: bool = False):
        if token in self._upload_tokens:
            self._upload_tokens[token]["attempt_count"] += 1
            if terminal or self._upload_tokens[token]["attempt_count"] >= self._upload_tokens[token]["max_attempts"]:
                self._upload_tokens[token]["is_revoked"] = True

pod_service = PodService()
