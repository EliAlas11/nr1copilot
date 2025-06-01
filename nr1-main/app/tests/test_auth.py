import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_signup_and_login():
    signup_data = {"email": "test@example.com", "full_name": "Test User", "password": "password123"}
    resp = client.post("/api/v1/auth/signup", json=signup_data)
    assert resp.status_code == 200
    assert resp.json()["message"] == "User signed up"

    login_data = {"email": "test@example.com", "password": "password123"}
    resp = client.post("/api/v1/auth/login", json=login_data)
    assert resp.status_code == 200
    assert "access_token" in resp.json()
