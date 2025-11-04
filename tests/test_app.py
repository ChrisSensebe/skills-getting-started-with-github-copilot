import pytest
from fastapi import status

def test_root_redirect(client):
    """Test that root path serves or redirects to static/index.html"""
    response = client.get("/")
    # FastAPI peut retourner soit une redirection 307, soit servir directement le fichier
    assert response.status_code in (status.HTTP_200_OK, status.HTTP_307_TEMPORARY_REDIRECT)
    if response.status_code == status.HTTP_307_TEMPORARY_REDIRECT:
        assert response.headers["location"] == "/static/index.html"
    else:
        assert "text/html" in response.headers["content-type"]

def test_get_activities(client):
    """Test getting all activities"""
    response = client.get("/activities")
    assert response.status_code == status.HTTP_200_OK
    activities = response.json()
    assert isinstance(activities, dict)
    assert len(activities) > 0
    
    # Verify activity structure
    activity = list(activities.values())[0]
    assert all(key in activity for key in ["description", "schedule", "max_participants", "participants"])
    assert isinstance(activity["participants"], list)

def test_signup_success(client):
    """Test successful activity signup"""
    response = client.post("/activities/Chess Club/signup?email=new@mergington.edu")
    assert response.status_code == status.HTTP_200_OK
    result = response.json()
    assert "message" in result
    assert "new@mergington.edu" in result["message"]
    assert "Chess Club" in result["message"]
    
    # Verify participant was added
    activities = client.get("/activities").json()
    assert "new@mergington.edu" in activities["Chess Club"]["participants"]

def test_signup_duplicate(client):
    """Test signup with already registered email"""
    # First signup
    email = "duplicate@mergington.edu"
    client.post(f"/activities/Chess Club/signup?email={email}")
    
    # Try to signup again
    response = client.post(f"/activities/Chess Club/signup?email={email}")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already signed up" in response.json()["detail"]

def test_signup_nonexistent_activity(client):
    """Test signup for non-existent activity"""
    response = client.post("/activities/NonExistentClub/signup?email=test@mergington.edu")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "not found" in response.json()["detail"]

def test_unregister_success(client):
    """Test successful unregistration from activity"""
    # First register a participant
    email = "tounregister@mergington.edu"
    client.post(f"/activities/Chess Club/signup?email={email}")
    
    # Then unregister them
    response = client.delete(f"/activities/Chess Club/participants?email={email}")
    assert response.status_code == status.HTTP_200_OK
    result = response.json()
    assert "message" in result
    assert email in result["message"]
    
    # Verify participant was removed
    activities = client.get("/activities").json()
    assert email not in activities["Chess Club"]["participants"]

def test_unregister_not_registered(client):
    """Test unregistering a participant who isn't registered"""
    response = client.delete("/activities/Chess Club/participants?email=notregistered@mergington.edu")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "Participant not found" in response.json()["detail"]

def test_unregister_nonexistent_activity(client):
    """Test unregistering from non-existent activity"""
    response = client.delete("/activities/NonExistentClub/participants?email=test@mergington.edu")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "Activity not found" in response.json()["detail"]

def test_max_participants(client):
    """Test signup when activity is full"""
    activity_name = "Chess Club"
    
    # Get current max participants
    activities = client.get("/activities").json()
    max_participants = activities[activity_name]["max_participants"]
    current_participants = activities[activity_name]["participants"]
    
    # Fill up the activity
    for i in range(len(current_participants), max_participants):
        email = f"student{i}@mergington.edu"
        response = client.post(f"/activities/{activity_name}/signup?email={email}")
        assert response.status_code == status.HTTP_200_OK
    
    # Try to add one more participant
    response = client.post(f"/activities/{activity_name}/signup?email=extra@mergington.edu")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "full" in response.json()["detail"].lower()