import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_driver_sees_only_assigned_trips():
    transport = ASGITransport(app=app)
    headers = {"Authorization": "Bearer mock-driver-token"}
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/trips", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    # Driver Suresh Kumar has 2 assigned trips (TRP-66120 and TRP-66134), TRP-66141 is hired/unassigned
    assert data["total"] == 2
    trip_numbers = [t["trip_number"] for t in data["items"]]
    assert "TRP-66120" in trip_numbers
    assert "TRP-66134" in trip_numbers
    assert "TRP-66141" not in trip_numbers

@pytest.mark.asyncio
async def test_executive_sees_all_trips():
    transport = ASGITransport(app=app)
    headers = {"Authorization": "Bearer mock-billing-token"}
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/trips", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 3
    trip_numbers = [t["trip_number"] for t in data["items"]]
    assert "TRP-66120" in trip_numbers
    assert "TRP-66134" in trip_numbers
    assert "TRP-66141" in trip_numbers

@pytest.mark.asyncio
async def test_driver_cannot_access_unassigned_trip_detail():
    transport = ASGITransport(app=app)
    headers = {"Authorization": "Bearer mock-driver-token"}
    # TRP-66141 id
    hired_trip_id = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03"
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(f"/api/trips/{hired_trip_id}", headers=headers)
    
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_csv_import_by_executive_and_rejection_for_driver():
    transport = ASGITransport(app=app)
    csv_payload = (
        "trip_number,customer_name,goods_description,vehicle_number,destination,trip_amount,vehicle_type,driver_id,expected_lr_number,expected_quantity,quantity_unit\n"
        "TRP-77001,Company X,Electronics,MH12 AB 1122,Mumbai,50000.0,company,b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22,LR-1001,50,boxes\n"
        "TRP-66120,Company B,Cement,MH20 EL 4521,Nagpur,38500.0,company,,LR-9921,500,bags\n" # Duplicate, should skip
    )
    
    # 1. Driver attempts import -> 403 Forbidden
    driver_headers = {"Authorization": "Bearer mock-driver-token"}
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/api/trips/import",
            headers=driver_headers,
            files={"file": ("trips.csv", csv_payload.encode("utf-8"), "text/csv")}
        )
    assert res.status_code == 403

    # 2. Executive imports -> 200 OK with 1 imported, 1 skipped duplicate
    exec_headers = {"Authorization": "Bearer mock-billing-token"}
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/api/trips/import",
            headers=exec_headers,
            files={"file": ("trips.csv", csv_payload.encode("utf-8"), "text/csv")}
        )
    assert res.status_code == 200
    summary = res.json()
    assert summary["imported_count"] == 1
    assert summary["skipped_count"] == 1
