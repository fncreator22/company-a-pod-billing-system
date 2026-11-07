from fastapi import Header, HTTPException, status, Depends
from typing import Optional
from pydantic import BaseModel
from uuid import UUID

class CurrentUser(BaseModel):
    id: UUID
    email: str
    role: str # 'driver' | 'billing_executive'
    full_name: str

async def get_current_user(authorization: Optional[str] = Header(None)) -> CurrentUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token"
        )
    token = authorization.split(" ")[1]

    # Deterministic mock support for local prototype testing & CI/CD
    if token == "mock-driver-token":
        return CurrentUser(
            id=UUID("b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22"),
            email="driver@transport.com",
            role="driver",
            full_name="Suresh Kumar"
        )
    elif token == "mock-billing-token":
        return CurrentUser(
            id=UUID("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"),
            email="billing@transport.com",
            role="billing_executive",
            full_name="Rajesh Sharma"
        )
    
    # In live Supabase mode, decode JWT with SUPABASE_JWT_SECRET
    # (or call Supabase auth.get_user(token))
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials"
    )

def require_role(required_role: str):
    def role_checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Requires role '{required_role}'"
            )
        return user
    return role_checker
