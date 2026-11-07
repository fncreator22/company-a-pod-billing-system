import pytest
from httpx import AsyncClient, ASGITransport
from uuid import uuid4
from app.main import app

@pytest.mark.asyncio
async def test_successful_clean_pod_upload_and_verification():
    transport = ASGITransport(app=app)
    headers = {"Authorization": "Bearer mock-driver-token"}
    trip_id = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01" # TRP-66120 assigned to driver
    client_upload_id = str(uuid4())
    fake_image_bytes = b"fake-jpg-content" * 50 # ~800 bytes (< 300 KB)

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/api/pods/upload",
            headers=headers,
            data={
                "trip_id": trip_id,
                "client_upload_id": client_upload_id,
                "mock_ai_scenario": "clean"
            },
            files={"file": ("pod.jpg", fake_image_bytes, "image/jpeg")}
        )

    assert res.status_code == 200
    data = res.json()
    assert data["upload_status"] == "uploaded"
    assert data["verification_status"] == "verified"
    assert data["attempt_number"] == 1

@pytest.mark.asyncio
async def test_missing_stamp_triggers_retake_requested():
    transport = ASGITransport(app=app)
    headers = {"Authorization": "Bearer mock-driver-token"}
    trip_id = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02" # TRP-66134
    client_upload_id = str(uuid4())
    fake_image_bytes = b"fake-jpg-content" * 50

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/api/pods/upload",
            headers=headers,
            data={
                "trip_id": trip_id,
                "client_upload_id": client_upload_id,
                "mock_ai_scenario": "missing_stamp"
            },
            files={"file": ("pod.jpg", fake_image_bytes, "image/jpeg")}
        )

    assert res.status_code == 200
    data = res.json()
    assert data["upload_status"] == "uploaded"
    assert data["verification_status"] == "retake_requested"

@pytest.mark.asyncio
async def test_oversized_image_rejected():
    transport = ASGITransport(app=app)
    headers = {"Authorization": "Bearer mock-driver-token"}
    trip_id = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01"
    oversized_bytes = b"x" * 350000 # 350 KB (> 300 KB limit)

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/api/pods/upload",
            headers=headers,
            data={
                "trip_id": trip_id,
                "client_upload_id": str(uuid4()),
            },
            files={"file": ("oversized.jpg", oversized_bytes, "image/jpeg")}
        )

    assert res.status_code == 400
    assert "exceeds 300 KB limit" in res.json()["detail"]

@pytest.mark.asyncio
async def test_hired_driver_upload_token_and_attempt_tracking():
    transport = ASGITransport(app=app)
    token = "hired-driver-token-141"
    fake_image_bytes = b"fake-jpg-content" * 50

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            f"/api/public/upload/{token}",
            data={
                "client_upload_id": str(uuid4()),
                "mock_ai_scenario": "shortage" # Scenario 3: Shortage 6 cartons
            },
            files={"file": ("pod.jpg", fake_image_bytes, "image/jpeg")}
        )

    assert res.status_code == 200
    data = res.json()
    assert data["verification_status"] == "needs_review"
