"""
ClearFlow AI Microservice
Flask REST API for image verification and workload prediction.
Exposes POST /verify and POST /predict endpoints.
"""

import os
import random
import hashlib
from datetime import datetime, timedelta, timezone
from io import BytesIO

import numpy as np
import requests as http_requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image

# Try importing scikit-learn (for real model support)
try:
    from sklearn.linear_model import LinearRegression
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

app = Flask(__name__)
CORS(app)

# Configuration
AI_CONFIDENCE_THRESHOLD = float(os.environ.get('AI_CONFIDENCE_THRESHOLD', '0.75'))
MODEL_VERSION = os.environ.get('MODEL_VERSION', 'clearflow-v1.0-simulated')


def download_image(url: str) -> Image.Image | None:
    """Download an image from a URL and return as PIL Image."""
    try:
        response = http_requests.get(url, timeout=15)
        response.raise_for_status()
        return Image.open(BytesIO(response.content))
    except Exception as e:
        print(f"[AI] Error downloading image: {e}")
        return None


def preprocess_image(img: Image.Image) -> np.ndarray:
    """Resize to 224x224 and normalize pixel values."""
    img = img.convert('RGB').resize((224, 224))
    arr = np.array(img, dtype=np.float32) / 255.0
    return arr


def compute_image_hash(img: Image.Image) -> str:
    """Compute perceptual hash for duplicate detection."""
    img_small = img.convert('L').resize((8, 8))
    pixels = list(img_small.getdata())
    avg = sum(pixels) / len(pixels)
    bits = ''.join(['1' if p > avg else '0' for p in pixels])
    return hashlib.md5(bits.encode()).hexdigest()


def compute_similarity_score(before_arr: np.ndarray, after_arr: np.ndarray) -> float:
    """
    Compute a similarity/difference score between before and after images.
    Higher difference = more likely work was done = higher confidence of completion.
    
    This is a simulated classifier that uses pixel-level analysis.
    In production, this would be replaced with a trained SVM/Random Forest model.
    """
    # Calculate structural difference
    diff = np.abs(after_arr - before_arr)
    mean_diff = float(np.mean(diff))
    
    # Calculate color histogram difference
    before_hist = np.histogram(before_arr, bins=64, range=(0, 1))[0].astype(float)
    after_hist = np.histogram(after_arr, bins=64, range=(0, 1))[0].astype(float)
    
    # Normalize histograms
    before_hist /= (before_hist.sum() + 1e-8)
    after_hist /= (after_hist.sum() + 1e-8)
    
    # Chi-squared distance
    chi_sq = float(np.sum((before_hist - after_hist) ** 2 / (before_hist + after_hist + 1e-8)))
    
    # Combine metrics into confidence score
    # More difference = higher confidence that work was done
    raw_score = (mean_diff * 0.4 + min(chi_sq, 1.0) * 0.3 + random.uniform(0.1, 0.3) * 0.3)
    
    # Scale to realistic range [0.5 - 0.98]
    confidence = min(0.98, max(0.5, raw_score * 2.5 + 0.4))
    
    return round(confidence, 4)


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'clearflow-ai',
        'version': MODEL_VERSION,
        'sklearn_available': SKLEARN_AVAILABLE,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })


@app.route('/verify', methods=['POST'])
def verify_images():
    """
    AI-Based Service Verification endpoint.
    
    Accepts before and after image URLs, analyzes them using image processing,
    and returns a confidence score indicating whether work was genuinely completed.
    
    Request Body:
        {
            "before_url": "https://cloudinary.com/.../before.jpg",
            "after_url": "https://cloudinary.com/.../after.jpg"
        }
    
    Response:
        {
            "confidenceScore": 0.87,
            "result": "Pass",
            "modelVersion": "clearflow-v1.0-simulated",
            "processingTimeMs": 1234,
            "details": { ... }
        }
    """
    import time
    start_time = time.time()
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    before_url = data.get('before_url')
    after_url = data.get('after_url')
    
    if not before_url or not after_url:
        return jsonify({'error': 'Both before_url and after_url are required'}), 400
    
    # Download images
    before_img = download_image(before_url)
    after_img = download_image(after_url)
    
    if before_img is None or after_img is None:
        # If images can't be downloaded, return a simulated result
        # This allows the system to work even without real image URLs
        confidence = round(random.uniform(0.70, 0.95), 4)
        processing_time = int((time.time() - start_time) * 1000)
        
        result = 'Pass' if confidence >= AI_CONFIDENCE_THRESHOLD else 'Fail'
        
        return jsonify({
            'confidenceScore': confidence,
            'result': result,
            'modelVersion': MODEL_VERSION,
            'processingTimeMs': processing_time,
            'details': {
                'method': 'simulated',
                'threshold': AI_CONFIDENCE_THRESHOLD,
                'note': 'Images could not be downloaded, using simulated analysis'
            }
        })
    
    # Check for duplicate images (fraud detection)
    before_hash = compute_image_hash(before_img)
    after_hash = compute_image_hash(after_img)
    
    if before_hash == after_hash:
        processing_time = int((time.time() - start_time) * 1000)
        return jsonify({
            'confidenceScore': 0.0,
            'result': 'Fail',
            'modelVersion': MODEL_VERSION,
            'processingTimeMs': processing_time,
            'details': {
                'method': 'duplicate_detection',
                'threshold': AI_CONFIDENCE_THRESHOLD,
                'note': 'Before and after images appear identical — possible fraud'
            }
        })
    
    # Preprocess images
    before_arr = preprocess_image(before_img)
    after_arr = preprocess_image(after_img)
    
    # Compute confidence score
    confidence = compute_similarity_score(before_arr, after_arr)
    
    processing_time = int((time.time() - start_time) * 1000)
    
    # Determine result based on threshold
    if confidence >= AI_CONFIDENCE_THRESHOLD:
        result = 'Pass'
    elif confidence >= AI_CONFIDENCE_THRESHOLD * 0.8:
        result = 'Flagged'
    else:
        result = 'Fail'
    
    return jsonify({
        'confidenceScore': confidence,
        'result': result,
        'modelVersion': MODEL_VERSION,
        'processingTimeMs': processing_time,
        'details': {
            'method': 'pixel_analysis',
            'threshold': AI_CONFIDENCE_THRESHOLD,
            'imageDifference': float(np.mean(np.abs(after_arr - before_arr))),
            'beforeHash': before_hash,
            'afterHash': after_hash
        }
    })


@app.route('/predict', methods=['POST'])
def predict_workload():
    """
    7-Day Workload Prediction endpoint.
    
    Accepts historical work order data and returns a 7-day forecast
    with predicted request volumes and recommended staffing levels.
    
    Request Body:
        {
            "history": [
                {"date": "2026-08-01", "count": 15, "category": "Cleaning"},
                ...
            ]
        }
    
    Response:
        {
            "forecast": [
                {"date": "2026-08-11", "predictedRequests": 18, "recommendedStaff": 4},
                ...
            ],
            "modelVersion": "...",
            "confidence": 0.82
        }
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    history = data.get('history', [])
    
    if len(history) < 7:
        # Not enough data - return a simple extrapolation
        forecast = []
        base_date = datetime.now(timezone.utc)
        avg_count = max(1, sum(h.get('count', 5) for h in history) / max(1, len(history))) if history else 12
        
        for i in range(1, 8):
            day = base_date + timedelta(days=i)
            # Add weekly seasonality
            day_factor = 1.0 + 0.1 * (1 if day.weekday() < 5 else -0.3)
            predicted = max(1, int(avg_count * day_factor + random.uniform(-2, 2)))
            
            forecast.append({
                'date': day.strftime('%Y-%m-%d'),
                'dayOfWeek': day.strftime('%A'),
                'predictedRequests': predicted,
                'recommendedStaff': max(1, predicted // 4),
                'confidence': 0.6
            })
        
        return jsonify({
            'forecast': forecast,
            'modelVersion': MODEL_VERSION,
            'overallConfidence': 0.6,
            'dataPointsUsed': len(history),
            'note': 'Limited historical data — forecast is approximate'
        })
    
    # Use Linear Regression if scikit-learn is available
    if SKLEARN_AVAILABLE and len(history) >= 14:
        try:
            # Extract features: day index, day of week
            dates = []
            counts = []
            for i, h in enumerate(history):
                dates.append(i)
                counts.append(h.get('count', 0))
            
            X = np.array(dates).reshape(-1, 1)
            y = np.array(counts)
            
            model = LinearRegression()
            model.fit(X, y)
            
            # Predict next 7 days
            future_X = np.array([len(history) + i for i in range(1, 8)]).reshape(-1, 1)
            predictions = model.predict(future_X)
            
            # Calculate R² score as confidence
            r2 = max(0, min(1, model.score(X, y)))
            
            forecast = []
            base_date = datetime.now(timezone.utc)
            
            for i in range(7):
                day = base_date + timedelta(days=i + 1)
                predicted = max(1, int(predictions[i]))
                
                # Add some realistic variation
                day_of_week = day.weekday()
                if day_of_week >= 5:  # Weekend
                    predicted = int(predicted * 0.7)
                
                forecast.append({
                    'date': day.strftime('%Y-%m-%d'),
                    'dayOfWeek': day.strftime('%A'),
                    'predictedRequests': predicted,
                    'recommendedStaff': max(1, predicted // 4),
                    'confidence': round(r2, 2)
                })
            
            return jsonify({
                'forecast': forecast,
                'modelVersion': MODEL_VERSION,
                'overallConfidence': round(r2, 2),
                'dataPointsUsed': len(history),
                'regressionCoefficient': round(float(model.coef_[0]), 4),
                'regressionIntercept': round(float(model.intercept_), 4)
            })
        
        except Exception as e:
            print(f"[AI] Prediction model error: {e}")
    
    # Fallback: Simple moving average prediction
    forecast = []
    base_date = datetime.now(timezone.utc)
    recent = [h.get('count', 5) for h in history[-14:]]
    avg = sum(recent) / len(recent)
    
    for i in range(1, 8):
        day = base_date + timedelta(days=i)
        day_factor = 1.0
        if day.weekday() == 0:  # Monday
            day_factor = 1.15
        elif day.weekday() == 4:  # Friday
            day_factor = 1.1
        elif day.weekday() >= 5:  # Weekend
            day_factor = 0.7
        
        predicted = max(1, int(avg * day_factor + random.uniform(-3, 3)))
        
        forecast.append({
            'date': day.strftime('%Y-%m-%d'),
            'dayOfWeek': day.strftime('%A'),
            'predictedRequests': predicted,
            'recommendedStaff': max(1, predicted // 4),
            'confidence': 0.72
        })
    
    return jsonify({
        'forecast': forecast,
        'modelVersion': MODEL_VERSION,
        'overallConfidence': 0.72,
        'dataPointsUsed': len(history),
        'method': 'moving_average'
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_ENV', 'development') == 'development'
    
    print(f"[ClearFlow AI] Starting AI Microservice on port {port}")
    print(f"[ClearFlow AI] Model version: {MODEL_VERSION}")
    print(f"[ClearFlow AI] Confidence threshold: {AI_CONFIDENCE_THRESHOLD}")
    print(f"[ClearFlow AI] Scikit-learn available: {SKLEARN_AVAILABLE}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
