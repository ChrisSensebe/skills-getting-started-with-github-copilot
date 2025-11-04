import pytest
from fastapi.testclient import TestClient
from src.app import app

@pytest.fixture
def client():
    """Fixture that creates a test client for the FastAPI app"""
    return TestClient(app)

@pytest.fixture
def sample_activity():
    """Fixture that returns a sample activity data"""
    return {
        "name": "Test Activity",
        "description": "A test activity for unit testing",
        "schedule": "Mondays, 2:00 PM - 3:00 PM",
        "max_participants": 10,
        "participants": ["test@mergington.edu"]
    }

@pytest.fixture
def sample_email():
    """Fixture that returns a sample student email"""
    return "student@mergington.edu"