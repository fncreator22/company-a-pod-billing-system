import pytest
from httpx import AsyncClient, ASGITransport
from uuid import uuid4
from app.main import app

@pytest.mark.asyncio
async def test_human_review_approves_shortage_with_deduction():
    transport = ASGITransport(app=app)
    driver_headers = {"Authorization": "Bearer mock-driver-token"}
    exec_headers = {"Authorization": "Bearer mock-billing-token"}

    # 1. Driver uploads POD with shortage
    trip_id = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01"
    client_upload_id = str(uuid4())
    fake_image_bytes = b"fake-jpg-content" * 50

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        upload_res = await ac.post(
            "/api/pods/upload",
            headers=driver_headers,
            data={
                "trip_id": trip_id,
                "client_upload_id": client_upload_id,
                "mock_ai_scenario": "shortage"
            },
            files={"file": ("pod.jpg", fake_image_bytes, "image/jpeg")}
        )
    assert upload_res.status_code == 200
    pod_id = upload_res.json()["pod_id"]

    # 2. Executive checks review queue
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        queue_res = await ac.get("/api/pods/review", headers=exec_headers)
    assert queue_res.status_code == 200
    queue = queue_res.json()
    assert any(item["pod"]["id"] == pod_id for item in queue)

    # 3. Executive records decision: Approved with Rs 1,200 shortage penalty deduction
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        review_res = await ac.patch(
            f"/api/pods/{pod_id}/review",
            headers=exec_headers,
            json={
                "decision": "approved",
                "review_notes": "Accepted shortage of 6 bags; adjusted freight rate.",
                "corrected_quantity": 494.0,
                "deduction_amount": 1200.0,
                "adjusted_billing_amount": 37300.0
            }
        )
    assert review_res.status_code == 200
    assert review_res.json()["pod"]["verification_status"] == "approved"

    # 4. Check billing queue reflects final adjusted amount (Rs 37,300)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        billing_res = await ac.get("/api/billing/queue", headers=exec_headers)
    assert billing_res.status_code == 200
    items = billing_res.json()
    billed_item = next((item for item in items if item["pod_id"] == pod_id), None)
    assert billed_item is not None
    assert billed_item["final_billed_amount"] == 37300.0
    assert billed_item["deduction_amount"] == 1200.0

    # 5. Export Tally CSV and confirm columns
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        export_res = await ac.get("/api/billing/export", headers=exec_headers)
    assert export_res.status_code == 200
    assert export_res.headers["content-type"].startswith("text/csv")
    csv_text = export_res.text
    assert "Trip Number,Customer Name" in csv_text
    assert "37300.00" in csv_text
    assert "Deduction: INR 1200.00" in csv_text

    # 6. Check Dashboard metrics after export
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        metrics_res = await ac.get("/api/dashboard/metrics", headers=exec_headers)
    assert metrics_res.status_code == 200
    metrics = metrics_res.json()
    assert metrics["total_trips"] >= 3
    assert metrics["exported_count"] >= 1
