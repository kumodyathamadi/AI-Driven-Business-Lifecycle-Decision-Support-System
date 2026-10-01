import re
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, AnalysisRecord
from backend.auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = "SME Entrepreneur"


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    user: UserResponse


def ensure_demo_user(db: Session) -> User:
    """
    Ensures a default demo user exists for SME360 AI evaluation,
    and assigns any existing orphan analysis records to this user.
    """
    demo_email = "demo@sme360.ai"
    user = db.query(User).filter(User.email == demo_email).first()
    
    if not user:
        user = User(
            email=demo_email,
            password_hash=hash_password("password123"),
            full_name="SME Demo Entrepreneur"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Link orphan records to demo user
    orphan_records = db.query(AnalysisRecord).filter(
        (AnalysisRecord.user_id == None) | (AnalysisRecord.user_id == "")
    ).all()
    if orphan_records:
        for r in orphan_records:
            r.user_id = user.id
        db.commit()

    return user


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    if not EMAIL_REGEX.match(request.email.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid email address."
        )

    existing = db.query(User).filter(User.email == request.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    if len(request.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    user = User(
        email=request.email.lower(),
        password_hash=hash_password(request.password),
        full_name=request.full_name or "SME Entrepreneur"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.email)
    return {
        "access_token": token,
        "token_type": "Bearer",
        "user": user
    }


@router.post("/login", response_model=AuthResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    # Ensure demo user exists on demand
    ensure_demo_user(db)

    user = db.query(User).filter(User.email == request.email.lower()).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    token = create_access_token(user.id, user.email)
    return {
        "access_token": token,
        "token_type": "Bearer",
        "user": user
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
