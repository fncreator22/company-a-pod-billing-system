import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_check_returns_healthy():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/health")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "pod-management-api"
    assert data["version"] == "1.1"

@pytest.mark.asyncio
async def test_auth_dependency_mock_tokens():
    from app.core.dependencies import get_current_user
    from fastapi import HTTPException
    
    # Missing auth
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(None)
    assert exc_info.value.status_code == 401

    # Valid driver token
    driver = await get_current_user("Bearer mock-driver-token")
    assert driver.role == "driver"
    assert driver.email == "driver@transport.com"

    # Valid billing executive token
    executive = await get_current_user("Bearer mock-billing-token")
    assert executive.role == "billing_executive"
    assert executive.email == "billing@transport.com"
