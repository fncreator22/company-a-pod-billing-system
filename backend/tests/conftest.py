import pytest
from app.services.pod_service import pod_service
from app.services.billing_service import billing_service
from app.services.trip_service import trip_service, INITIAL_TRIPS
from uuid import UUID

@pytest.fixture(autouse=True)
def reset_in_memory_state():
    # Reset in-memory singletons before each test to guarantee test isolation
    pod_service._pods.clear()
    pod_service._verifications.clear()
    pod_service._storage_mock.clear()
    pod_service._upload_tokens = {
        "hired-driver-token-141": {
            "trip_id": UUID("c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03"),
            "attempt_count": 0,
            "max_attempts": 3,
            "is_revoked": False
        }
    }
    trip_service._trips = {t["id"]: dict(t) for t in INITIAL_TRIPS}
    billing_service._billing_records = {
        UUID("c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01"): {
            "id": UUID("d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01"),
            "pod_id": UUID("d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a00"),
            "trip_id": UUID("c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01"),
            "original_amount": 38500.0,
            "deduction_amount": 0.0,
            "final_billed_amount": 38500.0,
            "billing_status": "billing_ready",
            "exported_at": None,
            "export_reference": None
        }
    }
    yield
