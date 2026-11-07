import asyncio
from typing import Optional
from app.schemas.all_schemas import DocumentVerificationResult, create_timeout_verification

class GeminiVisionAdapter:
    """
    Adapter interface for Gemini Vision multimodal extraction.
    Enforces a strict 8-second timeout with deterministic fallback
    to prevent blocking mobile cellular uploads.
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
        """
        Extracts document fields from image bytes.
        Supports deterministic mock scenarios for test suites and offline demo:
        - 'clean': 100% clean verification
        - 'missing_stamp': stamp_visible=False -> triggers retake
        - 'shortage': shortage_detected=True -> triggers needs_review
        - 'timeout': simulates Gemini 8s timeout -> triggers fallback
        """
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
        # Deterministic simulation for test verification
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
                overall_confidence=0.92
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
                shortage_detected=True, # Shortage flagged!
                damage_detected=False,
                remarks="Received short 6 cartons; seal broken",
                delivery_date="2026-11-08",
                overall_confidence=0.89
            )

        # Default: Clean verification
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
            overall_confidence=0.96
        )

ai_provider = GeminiVisionAdapter()
