"""
Pytest test suite for ClearFlow AI microservice.
Tests endpoints deterministically using synthetic in-memory images (no external network dependencies).
"""

import os
import sys
import json
import base64
import ast
from io import BytesIO
from PIL import Image
import pytest

# Ensure ai-service root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import app as app_module
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as test_client:
        yield test_client

def make_test_image_b64(color=(200, 200, 200), size=(64, 64), noise=False):
    """Generate a tiny synthetic JPEG image encoded as a data URI."""
    img = Image.new('RGB', size, color=color)
    if noise:
        # Deterministic pattern
        pixels = img.load()
        for x in range(size[0]):
            for y in range(size[1]):
                if (x + y) % 3 == 0:
                    pixels[x, y] = (50, 50, 50)
    buf = BytesIO()
    img.save(buf, format='JPEG')
    b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    return f"data:image/jpeg;base64,{b64}"


def test_no_random_import_in_app():
    """Verify that app.py strictly contains no imports or references to the random module."""
    app_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'app.py'))
    with open(app_path, 'r', encoding='utf-8') as f:
        tree = ast.parse(f.read())
    
    imported_modules = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for n in node.names:
                imported_modules.append(n.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imported_modules.append(node.module)
                
    assert 'random' not in imported_modules, "Hard Rule 5 violated: random module must not be imported in app.py"


def test_health_endpoint(client):
    """Test GET /health returns 200 OK and real model version strings (no 'simulated')."""
    response = client.get('/health')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'healthy'
    assert data['service'] == 'clearflow-ai'
    assert 'torch_available' in data
    assert 'classifier_loaded' in data
    assert 'forecaster_loaded' in data
    
    if data['classifier_version']:
        assert 'simulated' not in data['classifier_version'].lower()
    if data['forecaster_version']:
        assert 'simulated' not in data['forecaster_version'].lower()


def test_verify_missing_body_returns_400(client):
    """Test POST /verify with empty or invalid body returns 400."""
    r1 = client.post('/verify', data='not json', content_type='text/plain')
    assert r1.status_code == 400
    
    r2 = client.post('/verify', json={})
    assert r2.status_code == 400
    
    r3 = client.post('/verify', json={'before_url': 'data:image/jpeg;base64,abc'})
    assert r3.status_code == 400


def test_verify_data_uri_input_works(client):
    """Test POST /verify successfully accepts and evaluates base64 data: URIs."""
    before_b64 = make_test_image_b64(color=(50, 50, 50), noise=True)
    after_b64 = make_test_image_b64(color=(240, 240, 240), noise=False)
    
    response = client.post('/verify', json={
        'before_url': before_b64,
        'after_url': after_b64
    })
    assert response.status_code == 200
    data = json.loads(response.data)
    
    assert 'confidenceScore' in data
    assert 'cleanProbability' in data
    assert 'result' in data
    assert data['result'] in ['Pass', 'Fail', 'Flagged']
    assert 'details' in data
    assert 'changeScore' in data['details']
    assert data['details']['changeScore'] > 0.05
    assert data['details']['duplicate'] is False
    assert data['details']['manualReviewRequired'] is False


def test_verify_identical_images_gives_duplicate_fail(client):
    """Test that submitting identical images triggers duplicate detection and returns Fail."""
    img_b64 = make_test_image_b64(color=(180, 180, 180), noise=True)
    
    response = client.post('/verify', json={
        'before_url': img_b64,
        'after_url': img_b64
    })
    assert response.status_code == 200
    data = json.loads(response.data)
    
    assert data['result'] == 'Fail'
    assert data['details']['duplicate'] is True
    assert 'duplicate' in data['details']['reason'].lower()


def test_verify_unreachable_url_gives_flagged_with_manual_review(client):
    """Test that unreachable remote URLs give Flagged result with manualReviewRequired=True."""
    response = client.post('/verify', json={
        'before_url': 'http://127.0.0.1:59999/nonexistent_before.jpg',
        'after_url': 'http://127.0.0.1:59999/nonexistent_after.jpg'
    })
    assert response.status_code == 200
    data = json.loads(response.data)
    
    assert data['result'] == 'Flagged'
    assert data['confidenceScore'] == 0.0
    assert data['details']['manualReviewRequired'] is True
    assert 'network fetch failed' in data['details']['reason'].lower() or 'failed' in data['details']['reason'].lower()


def test_verify_deterministic_same_output(client):
    """Test that sending identical inputs twice produces exact identical responses (ignoring processingTimeMs)."""
    before_b64 = make_test_image_b64(color=(80, 80, 80), noise=True)
    after_b64 = make_test_image_b64(color=(220, 220, 220), noise=False)
    
    payload = {'before_url': before_b64, 'after_url': after_b64}
    
    res1 = client.post('/verify', json=payload)
    res2 = client.post('/verify', json=payload)
    
    assert res1.status_code == 200
    assert res2.status_code == 200
    
    d1 = json.loads(res1.data)
    d2 = json.loads(res2.data)
    
    # Ignore processingTimeMs
    d1.pop('processingTimeMs', None)
    d2.pop('processingTimeMs', None)
    
    assert d1 == d2, "POST /verify must be 100% deterministic: identical input must give identical output!"


def test_verify_missing_model_flagged(client, monkeypatch):
    """Test that when classifier model is missing, verify returns Flagged with manualReviewRequired=True."""
    before_b64 = make_test_image_b64(color=(100, 100, 100))
    after_b64 = make_test_image_b64(color=(200, 200, 200))
    
    # Temporarily set CLASSIFIER_MODEL to None
    monkeypatch.setattr(app_module, 'CLASSIFIER_MODEL', None)
    
    response = client.post('/verify', json={
        'before_url': before_b64,
        'after_url': after_b64
    })
    assert response.status_code == 200
    data = json.loads(response.data)
    
    assert data['result'] == 'Flagged'
    assert data['confidenceScore'] == 0.0
    assert data['details']['manualReviewRequired'] is True


def test_predict_insufficient_data(client):
    """Test POST /predict with fewer than 7 days returns method 'insufficient_data' and confidence 0."""
    short_history = [
        {'date': '2026-10-01', 'count': 12},
        {'date': '2026-10-02', 'count': 15},
        {'date': '2026-10-03', 'count': 10}
    ]
    response = client.post('/predict', json={'history': short_history})
    assert response.status_code == 200
    data = json.loads(response.data)
    
    assert data['method'] == 'insufficient_data'
    assert data['overallConfidence'] == 0.0
    assert len(data['forecast']) == 7
    for item in data['forecast']:
        assert 'date' in item
        assert 'predictedRequests' in item
        assert item['confidence'] == 0.0


def test_predict_deterministic_and_forecaster_v1(client):
    """Test POST /predict with 14+ days uses forecaster_v1 and is completely deterministic."""
    history = [
        {'date': f'2026-09-{i:02d}', 'count': 20 + (i % 5) * 3}
        for i in range(1, 20)
    ]
    
    payload = {'history': history}
    r1 = client.post('/predict', json=payload)
    r2 = client.post('/predict', json=payload)
    
    assert r1.status_code == 200
    assert r2.status_code == 200
    
    d1 = json.loads(r1.data)
    d2 = json.loads(r2.data)
    
    assert d1 == d2, "POST /predict must be 100% deterministic!"
    assert d1['method'] in ['forecaster_v1', 'moving_average']
    assert len(d1['forecast']) == 7
    assert d1['overallConfidence'] > 0.0
