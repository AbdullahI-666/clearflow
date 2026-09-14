import os
import sys
import json
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_health_endpoint(client):
    """Test GET /health returns 200 OK and healthy status."""
    response = client.get('/health')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'healthy'
    assert 'version' in data

def test_verify_missing_body(client):
    """Test POST /verify with empty body returns 400."""
    response = client.post('/verify', json={})
    assert response.status_code == 400

def test_verify_simulation(client):
    """Test POST /verify with mock image URLs returns valid confidence score."""
    response = client.post('/verify', json={
        'before_url': 'https://res.cloudinary.com/demo/image/upload/sample_before.jpg',
        'after_url': 'https://res.cloudinary.com/demo/image/upload/sample_after.jpg'
    })
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'confidenceScore' in data
    assert data['result'] in ['Pass', 'Fail', 'Flagged']
    assert 'processingTimeMs' in data

def test_predict_workload(client):
    """Test POST /predict with 7-day history returns 7-day forecast."""
    sample_history = [
        {'date': '2026-08-10', 'count': 12, 'category': 'Cleaning'},
        {'date': '2026-08-11', 'count': 15, 'category': 'Electrical'},
        {'date': '2026-08-12', 'count': 14, 'category': 'Plumbing'},
        {'date': '2026-08-13', 'count': 18, 'category': 'Cleaning'},
        {'date': '2026-08-14', 'count': 20, 'category': 'Waste'},
        {'date': '2026-08-15', 'count': 9, 'category': 'Gardening'},
        {'date': '2026-08-16', 'count': 8, 'category': 'Cleaning'},
    ]
    response = client.post('/predict', json={'history': sample_history})
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'forecast' in data
    assert len(data['forecast']) == 7
    for item in data['forecast']:
        assert 'date' in item
        assert 'predictedRequests' in item
        assert 'recommendedStaff' in item
