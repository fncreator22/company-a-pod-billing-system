import pytest
from httpx import AsyncClient, ASGITransport
from uuid import uuid4
from app.main import app

@pytest.mark.asyncio
async def test_full_scenario1_clean_delivery_to_billing_csv():
    """
    Scenario 1: Clean POD -> Verified -> Billing Queue -> Tally CSV
    """
    transport = ASGITransport(app=app)
    driver_headers = {"Authorization": "Bearer mock-driver-token"}
    exec_headers = {"Authorization": "Bearer mock-billing-token"}

    # 1. Driver queries trips and selects TRP-66120
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        trips_res = await ac.get("/api/trips", headers=driver_headers)
    assert trips_res.status_code == 200
    trip_120 = next(t for t in trips_res.json()["items"] if t["trip_number"] == "TRP-66120")

    # 2. Driver captures & uploads clean POD
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        upload_res = await ac.post(
            "/api/pods/upload",
            headers=driver_headers,
            data={
                "trip_id": trip_120["id"],
                "client_upload_id": str(uuid4()),
                "mock_ai_scenario": "clean"
            },
            files={"file": ("clean_pod.jpg", b"fake-jpg" * 50, "image/jpeg")}
        )
    assert upload_res.status_code == 200
    assert upload_res.json()["verification_status"] == "verified"

@pytest.mark.asyncio
async def test_full_scenario2_missing_stamp_retake_limit():
    """
    Scenario 2: Retake Requested -> Retry -> Exceeded Retakes
    """
    transport = ASGITransport(app=app)
    driver_headers = {"Authorization": "Bearer mock-driver-token"}
    trip_id = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02" # TRP-66134

    # Attempt 1: missing stamp -> retake_requested
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res1 = await ac.post(
            "/api/pods/upload",
            headers=driver_headers,
            data={
                "trip_id": trip_id,
                "client_upload_id": str(uuid4()),
                "mock_ai_scenario": "missing_stamp"
            },
            files={"file": ("p1.jpg", b"fake-jpg" * 50, "image/jpeg")}
        )
    assert res1.status_code == 200
    assert res1.json()["verification_status"] == "retake_requested"

@pytest.mark.asyncio
async def test_full_scenario3_hired_truck_shortage_review_and_deduction():
    """
    Scenario 3: Hired Truck TRP-66141 -> SMS Token Upload -> Shortage 6 Cartons -> Executive Review Approval
    """
    transport = ASGITransport(app=app)
    exec_headers = {"Authorization": "Bearer mock-billing-token"}

    # 1. Hired driver uploads via public token
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/api/public/upload/hired-driver-token-141",
            data={
                "client_upload_id": str(uuid4()),
                "mock_ai_scenario": "shortage"
            },
            files={"file": ("hired_pod.jpg", b"fake-jpg" * 50, "image/jpeg")}
        )
    assert res.status_code == 200
    pod_id = res.json()["pod_id"]
    assert res.json()["verification_status"] == "needs_review"

    # 2. Executive reviews exception and applies shortage deduction
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        review_res = await ac.patch(
            f"/api/pods/{pod_id}/review",
            headers=exec_headers,
            json={
                "decision": "approved",
                "review_notes": "6 cartons short accepted by consignee; deducted Rs 2,400.",
                "corrected_quantity": 114.0,
                "deduction_amount": 2400.0,
                "adjusted_billing_amount": 38800.0
            }
        )
    assert review_res.status_code == 200
    assert review_res.json()["pod"]["verification_status"] == "approved"

    # 3. Verify in billing export
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        export_res = await ac.get("/api/billing/export", headers=exec_headers)
    assert export_res.status_code == 200
    assert "38800.00" in export_res.text
    assert "Deduction: INR 2400.00" in export_res.text
