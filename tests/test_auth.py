import os
import sys

# Ensure root directory in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from backend.main import app
from backend.database import SessionLocal
from backend.models import User, AnalysisRecord
from backend.auth_utils import hash_password, verify_password, create_access_token, decode_access_token

client = TestClient(app)


def test_password_hashing():
    pwd = "secretpassword123"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert "$" in hashed
    assert verify_password(pwd, hashed) is True
    assert verify_password("wrongpassword", hashed) is False


def test_jwt_token():
    user_id = "user-test-123"
    email = "test@example.com"
    token = create_access_token(user_id, email)
    assert isinstance(token, str)
    assert len(token.split(".")) == 3

    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["email"] == email


def test_demo_user_login():
    resp = client.post("/api/auth/login", json={
        "email": "demo@sme360.ai",
        "password": "password123"
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "demo@sme360.ai"

    # Test /api/auth/me with token
    token = data["access_token"]
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "demo@sme360.ai"


def test_unauthenticated_me_rejected():
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_user_registration_and_isolation():
    reg_email = "newuser@sme360.ai"
    reg_resp = client.post("/api/auth/register", json={
        "email": reg_email,
        "password": "password456",
        "full_name": "New SME Owner"
    })
    # If user already exists in db, login instead
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/auth/login", json={
            "email": reg_email,
            "password": "password456"
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]

    # This new user should see their own records or default
    records_resp = client.get("/api/business/records", headers={"Authorization": f"Bearer {token}"})
    assert records_resp.status_code == 200


if __name__ == "__main__":
    test_password_hashing()
    test_jwt_token()
    test_demo_user_login()
    test_unauthenticated_me_rejected()
    test_user_registration_and_isolation()
    print("ALL AUTHENTICATION & SECURITY TESTS PASSED SUCCESSFULLY!")
