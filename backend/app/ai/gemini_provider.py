import asyncio
from typing import Optional, List
from app.schemas.all_schemas import DocumentVerificationResult, BoundingBox, create_timeout_verification

class GeminiVisionAdapter:
    """
    Adapter interface for Gemini Vision multimodal extraction.
    Enforces a strict 8-second timeout with deterministic fallback.
    Returns visual grounding bounding boxes for consignee stamp and signature.
    """
    def __init__(self, api_key: str = "mock-key", timeout_seconds: float = 8.0):
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds

    async def extract_and_verify(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg",
        mock_scenario: Optional[str] = None
    ) -> DocumentVerificationResult:
        try:
            return await asyncio.wait_for(
                self._execute_inference(image_bytes, mime_type, mock_scenario),
                timeout=self.timeout_seconds
            )
        except asyncio.TimeoutError:
            return create_timeout_verification("AI_TIMEOUT: Gemini Vision exceeded 8-second SLA")
        except Exception as e:
            return create_timeout_verification(f"AI_ERROR: {str(e)}")

    async def _execute_inference(
        self,
        image_bytes: bytes,
        mime_type: str,
        mock_scenario: Optional[str]
    ) -> DocumentVerificationResult:
        if mock_scenario == "timeout":
            await asyncio.sleep(self.timeout_seconds + 0.5)
            return DocumentVerificationResult()

        if mock_scenario == "missing_stamp":
            return DocumentVerificationResult(
                lr_number="LR-8841",
                lr_number_confidence=0.95,
                detected_invoice_number="INV-7740",
                stamp_visible=False, # Missing consignee stamp!
                signature_visible=True,
                delivered_quantity=25.0,
                quantity_unit="tons",
                shortage_detected=False,
                damage_detected=False,
                delivery_date="2026-11-08",
                overall_confidence=0.92,
                grounded_boxes=[
                    BoundingBox(ymin=0.72, xmin=0.60, ymax=0.88, xmax=0.88, label="Signature Detected (Clean)")
                ]
            )

        if mock_scenario == "shortage":
            return DocumentVerificationResult(
                lr_number="LR-7719",
                lr_number_confidence=0.94,
                detected_invoice_number="INV-9021",
                stamp_visible=True,
                signature_visible=True,
                delivered_quantity=114.0, # 120 expected - 6 short
                quantity_unit="cartons",
                shortage_detected=True,
                damage_detected=False,
                remarks="Received short 6 cartons; seal broken",
                delivery_date="2026-11-08",
                overall_confidence=0.89,
                grounded_boxes=[
                    BoundingBox(ymin=0.60, xmin=0.15, ymax=0.82, xmax=0.45, label="Consignee Rubber Stamp"),
                    BoundingBox(ymin=0.65, xmin=0.55, ymax=0.85, xmax=0.85, label="Authorized Signature"),
                    BoundingBox(ymin=0.35, xmin=0.10, ymax=0.48, xmax=0.75, label="Endorsement Remark: Short 6 Cartons")
                ]
            )

        # Default: Clean verification with normalized bounding boxes
        return DocumentVerificationResult(
            lr_number="LR-9921",
            lr_number_confidence=0.98,
            detected_invoice_number="INV-5510",
            stamp_visible=True,
            signature_visible=True,
            delivered_quantity=500.0,
            quantity_unit="bags",
            shortage_detected=False,
            damage_detected=False,
            delivery_date="2026-11-08",
            overall_confidence=0.96,
            grounded_boxes=[
                BoundingBox(ymin=0.62, xmin=0.18, ymax=0.84, xmax=0.48, label="Consignee Official Stamp"),
                BoundingBox(ymin=0.68, xmin=0.58, ymax=0.86, xmax=0.88, label="Gate Officer Signature")
            ]
        )

ai_provider = GeminiVisionAdapter()
