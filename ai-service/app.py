"""
ClearFlow AI Microservice
Deterministic, evidence-based computer vision verification and demand forecasting service.
Exposes GET /health, POST /verify, and POST /predict.
"""

import os
import sys
import json
import time
import base64
import hashlib
from datetime import datetime, timedelta, timezone
from io import BytesIO
from pathlib import Path

import numpy as np
import requests as http_requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image

import joblib
import pandas as pd

try:
    import torch
    import torchvision
    from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

app = Flask(__name__)
CORS(app)

# 10 MB maximum request payload limit
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / 'models'

# Configuration
AI_CONFIDENCE_THRESHOLD = float(os.environ.get('AI_CONFIDENCE_THRESHOLD', '0.75'))
AI_MIN_CHANGE = float(os.environ.get('AI_MIN_CHANGE', '0.05'))
MAX_IMAGE_BYTES = 10 * 1024 * 1024 # 10 MB
DOWNLOAD_TIMEOUT = 10 # 10 seconds

# Global Models and Metadata State
CLASSIFIER_MODEL = None
CLASSIFIER_META = {}
FORECASTER_MODEL = None
FORECASTER_META = {}
FEATURE_EXTRACTOR = None

class MobileNetFeatureExtractor:
    """Extracts 1024-dim ImageNet embeddings via torchvision MobileNetV3-Small on CPU."""
    def __init__(self):
        self.weights = MobileNet_V3_Small_Weights.DEFAULT
        self.transforms = self.weights.transforms()
        self.model = mobilenet_v3_small(weights=self.weights)
        self.model.classifier[3] = torch.nn.Identity()
        self.model.eval()

    def extract(self, img: Image.Image) -> np.ndarray:
        img_rgb = img.convert('RGB')
        tensor = self.transforms(img_rgb).unsqueeze(0)
        with torch.no_grad():
            feat = self.model(tensor)
        return feat.squeeze(0).numpy()

def load_models():
    """Load trained models and metadata from disk on startup."""
    global CLASSIFIER_MODEL, CLASSIFIER_META, FORECASTER_MODEL, FORECASTER_META, FEATURE_EXTRACTOR

    # 1. Classifier
    cls_joblib = MODELS_DIR / 'classifier_v1.joblib'
    cls_json = MODELS_DIR / 'classifier_v1.json'
    if cls_joblib.exists():
        try:
            CLASSIFIER_MODEL = joblib.load(cls_joblib)
            if cls_json.exists():
                with open(cls_json, 'r', encoding='utf-8') as f:
                    CLASSIFIER_META = json.load(f)
            if TORCH_AVAILABLE:
                FEATURE_EXTRACTOR = MobileNetFeatureExtractor()
            print(f"[AI] Successfully loaded classifier: {CLASSIFIER_META.get('model_version', 'v1')}")
        except Exception as e:
            print(f"[AI] Failed loading classifier model: {e}")

    # 2. Forecaster
    fc_joblib = MODELS_DIR / 'forecaster_v1.joblib'
    fc_json = MODELS_DIR / 'forecaster_v1.json'
    if fc_joblib.exists():
        try:
            FORECASTER_MODEL = joblib.load(fc_joblib)
            if fc_json.exists():
                with open(fc_json, 'r', encoding='utf-8') as f:
                    FORECASTER_META = json.load(f)
            print(f"[AI] Successfully loaded forecaster: {FORECASTER_META.get('model_version', 'v1')}")
        except Exception as e:
            print(f"[AI] Failed loading forecaster model: {e}")

load_models()

def parse_image_input(image_input: str) -> tuple[Image.Image | None, str | None]:
    """
    Decodes an image from an HTTP(S) URL or a base64 data: URI.
    Enforces scheme validation, 10 MB payload limit, and 10 s timeout.
    Returns (PIL.Image, error_message).
    """
    if not image_input or not isinstance(image_input, str):
        return None, "Image input must be a non-empty string"

    trimmed = image_input.strip()

    # Base64 data: URI
    if trimmed.startswith('data:'):
        if not trimmed.startswith(('data:image/', 'data:application/octet-stream;base64')):
            return None, "Invalid data URI scheme; expected data:image/..."
        
        comma_idx = trimmed.find(',')
        if comma_idx == -1:
            return None, "Malformed data URI: missing comma separator"
        
        b64_data = trimmed[comma_idx + 1:]
        try:
            raw_bytes = base64.b64decode(b64_data)
        except Exception as e:
            return None, f"Base64 decoding failed: {e}"

        if len(raw_bytes) > MAX_IMAGE_BYTES:
            return None, f"Image payload exceeds 10 MB limit ({len(raw_bytes)} bytes)"

        try:
            img = Image.open(BytesIO(raw_bytes))
            img.load()
            return img, None
        except Exception as e:
            return None, f"Failed to decode image from data URI: {e}"

    # HTTP / HTTPS URL
    if trimmed.startswith(('http://', 'https://')):
        try:
            resp = http_requests.get(trimmed, timeout=DOWNLOAD_TIMEOUT, stream=True)
            resp.raise_for_status()
            
            # Check content length header if provided
            cl = resp.headers.get('Content-Length')
            if cl and int(cl) > MAX_IMAGE_BYTES:
                return None, f"Remote image exceeds 10 MB limit ({cl} bytes)"
            
            raw_bytes = resp.content
            if len(raw_bytes) > MAX_IMAGE_BYTES:
                return None, f"Downloaded image exceeds 10 MB limit ({len(raw_bytes)} bytes)"
            
            img = Image.open(BytesIO(raw_bytes))
            img.load()
            return img, None
        except Exception as e:
            return None, f"Network fetch failed: {e}"

    return None, f"Unsupported image URI scheme. Only http://, https://, or data: URIs are allowed."

def compute_structural_change(img_before: Image.Image, img_after: Image.Image) -> float:
    """
    Deterministic structural change score between before and after images.
    Converts both images to 224x224 grayscale, normalizes to [0, 1] range,
    and calculates the mean absolute difference:
        changeScore = mean(|after_grayscale - before_grayscale|)
    Formula is deterministic and bounded in [0.0, 1.0].
    """
    b_gray = img_before.convert('L').resize((224, 224))
    a_gray = img_after.convert('L').resize((224, 224))
    
    b_arr = np.array(b_gray, dtype=np.float32) / 255.0
    a_arr = np.array(a_gray, dtype=np.float32) / 255.0
    
    diff = np.abs(a_arr - b_arr)
    return round(float(np.mean(diff)), 4)

def check_duplicate_image(img_before: Image.Image, img_after: Image.Image, change_score: float) -> bool:
    """
    Deterministic duplicate fraud detection.
    Evaluates perceptual dHash (8x8) and mean structural difference.
    If images are identical or near-identical, returns True.
    """
    if change_score < 0.005:
        return True

    # 8x8 Difference Hash
    def dhash(img: Image.Image) -> int:
        small = img.convert('L').resize((9, 8))
        arr = np.array(small, dtype=np.int32)
        diff = arr[:, 1:] > arr[:, :-1]
        bits = diff.flatten()
        val = 0
        for b in bits:
            val = (val << 1) | int(b)
        return val

    h1 = dhash(img_before)
    h2 = dhash(img_after)
    hamming_dist = bin(h1 ^ h2).count('1')
    
    # 0 or 1 bit difference out of 64 bits with small change indicates duplicate
    return hamming_dist <= 1 and change_score < 0.02


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint reporting loaded models and capabilities."""
    cls_ver = CLASSIFIER_META.get('model_version') if CLASSIFIER_MODEL else None
    fc_ver = FORECASTER_META.get('model_version') if FORECASTER_MODEL else None
    
    return jsonify({
        'status': 'healthy',
        'service': 'clearflow-ai',
        'classifier_loaded': CLASSIFIER_MODEL is not None,
        'classifier_version': cls_ver,
        'forecaster_loaded': FORECASTER_MODEL is not None,
        'forecaster_version': fc_ver,
        'torch_available': TORCH_AVAILABLE,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })


@app.route('/verify', methods=['POST'])
def verify_images():
    """
    Deterministic, Evidence-Based Service Verification.
    
    Evaluates:
    1. cleanProbability: classifier probability that the AFTER photo depicts a clean space.
    2. changeScore: mean absolute grayscale difference between before and after (224x224).
    3. duplicate: check for duplicate / identical photos.
    
    Result logic:
    - Pass: model loaded AND cleanProbability >= threshold (0.75) AND changeScore >= minChange (0.05) AND not duplicate
    - Fail: valid images but criteria not met
    - Flagged: missing model, failed fetch/decode, or manual review required
    """
    start_time = time.time()
    
    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({'error': 'Request body must be a JSON object'}), 400
    
    before_url = data.get('before_url')
    after_url = data.get('after_url')
    
    if not before_url or not after_url:
        return jsonify({'error': 'Both before_url and after_url are required'}), 400

    # Decode and validate before image
    before_img, err_before = parse_image_input(before_url)
    if err_before:
        processing_time = int((time.time() - start_time) * 1000)
        return jsonify({
            'confidenceScore': 0.0,
            'cleanProbability': 0.0,
            'result': 'Flagged',
            'modelVersion': CLASSIFIER_META.get('model_version', 'unloaded'),
            'processingTimeMs': processing_time,
            'details': {
                'manualReviewRequired': True,
                'reason': f"Before image fetch/decode failed: {err_before}",
                'method': 'manual_review',
                'threshold': AI_CONFIDENCE_THRESHOLD,
                'minChange': AI_MIN_CHANGE
            }
        })

    # Decode and validate after image
    after_img, err_after = parse_image_input(after_url)
    if err_after:
        processing_time = int((time.time() - start_time) * 1000)
        return jsonify({
            'confidenceScore': 0.0,
            'cleanProbability': 0.0,
            'result': 'Flagged',
            'modelVersion': CLASSIFIER_META.get('model_version', 'unloaded'),
            'processingTimeMs': processing_time,
            'details': {
                'manualReviewRequired': True,
                'reason': f"After image fetch/decode failed: {err_after}",
                'method': 'manual_review',
                'threshold': AI_CONFIDENCE_THRESHOLD,
                'minChange': AI_MIN_CHANGE
            }
        })

    # Check if classifier model and extractor are ready
    if CLASSIFIER_MODEL is None or FEATURE_EXTRACTOR is None:
        processing_time = int((time.time() - start_time) * 1000)
        return jsonify({
            'confidenceScore': 0.0,
            'cleanProbability': 0.0,
            'result': 'Flagged',
            'modelVersion': 'model_missing',
            'processingTimeMs': processing_time,
            'details': {
                'manualReviewRequired': True,
                'reason': 'Cleanliness classifier model file is missing or failed to load. Manual review required.',
                'method': 'manual_review',
                'threshold': AI_CONFIDENCE_THRESHOLD,
                'minChange': AI_MIN_CHANGE
            }
        })

    # 1. Deterministic Structural Difference (Grayscale 224x224 MAE)
    change_score = compute_structural_change(before_img, after_img)

    # 2. Duplicate Detection
    is_duplicate = check_duplicate_image(before_img, after_img, change_score)

    # 3. Cleanliness Classification on AFTER image
    try:
        after_embedding = FEATURE_EXTRACTOR.extract(after_img)
        # LogisticRegression predict_proba: [prob_dirty (0), prob_clean (1)]
        probs = CLASSIFIER_MODEL.predict_proba(after_embedding.reshape(1, -1))[0]
        clean_prob = round(float(probs[1]), 4)
    except Exception as e:
        processing_time = int((time.time() - start_time) * 1000)
        return jsonify({
            'confidenceScore': 0.0,
            'cleanProbability': 0.0,
            'result': 'Flagged',
            'modelVersion': CLASSIFIER_META.get('model_version', 'clearflow-cv-v1.0'),
            'processingTimeMs': processing_time,
            'details': {
                'manualReviewRequired': True,
                'reason': f"Classifier inference failed: {e}",
                'method': 'manual_review',
                'threshold': AI_CONFIDENCE_THRESHOLD,
                'minChange': AI_MIN_CHANGE
            }
        })

    # 4. Deterministic Verdict Logic
    confidence_score = clean_prob
    processing_time = int((time.time() - start_time) * 1000)

    if is_duplicate:
        result = 'Fail'
        reason = "Duplicate or near-identical before and after images detected (zero physical service progress)."
    elif clean_prob >= AI_CONFIDENCE_THRESHOLD and change_score >= AI_MIN_CHANGE:
        result = 'Pass'
        reason = "Service successfully verified: space classified as clean and sufficient physical transformation verified."
    else:
        result = 'Fail'
        reasons = []
        if clean_prob < AI_CONFIDENCE_THRESHOLD:
            reasons.append(f"Cleanliness probability ({clean_prob:.2f}) below threshold ({AI_CONFIDENCE_THRESHOLD:.2f})")
        if change_score < AI_MIN_CHANGE:
            reasons.append(f"Structural change score ({change_score:.2f}) below minimum change ({AI_MIN_CHANGE:.2f})")
        reason = "Verification rejected: " + "; ".join(reasons)

    return jsonify({
        'confidenceScore': confidence_score,
        'cleanProbability': clean_prob,
        'result': result,
        'modelVersion': CLASSIFIER_META.get('model_version', 'clearflow-cv-v1.0'),
        'processingTimeMs': processing_time,
        'details': {
            'cleanProbability': clean_prob,
            'changeScore': change_score,
            'duplicate': is_duplicate,
            'threshold': AI_CONFIDENCE_THRESHOLD,
            'minChange': AI_MIN_CHANGE,
            'manualReviewRequired': False,
            'reason': reason,
            'method': 'mobilenet_v3_classifier'
        }
    })


@app.route('/predict', methods=['POST'])
def predict_workload():
    """
    Deterministic 7-Day Workload Prediction endpoint.
    
    Logic:
    - >= 14 historical points & forecaster loaded: uses forecaster_v1 (ratio to 7-day rolling mean)
    - >= 7 historical points: deterministic 7-day moving average
    - < 7 points: flat forecast with method "insufficient_data" and confidence 0.0
    """
    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({'error': 'Request body must be a JSON object'}), 400

    history = data.get('history', [])
    if not isinstance(history, list):
        return jsonify({'error': 'History must be a list of daily data points'}), 400

    # Extract clean list of counts and dates
    valid_counts = []
    for h in history:
        if isinstance(h, dict) and 'count' in h:
            try:
                valid_counts.append(max(0, float(h['count'])))
            except (ValueError, TypeError):
                continue

    base_date = datetime.now(timezone.utc)
    model_version = FORECASTER_META.get('model_version', 'clearflow-forecaster-v1.0')

    # Path 1: Fewer than 7 days -> Insufficient data
    if len(valid_counts) < 7:
        flat_val = int(round(sum(valid_counts) / len(valid_counts))) if valid_counts else 10
        forecast = []
        for i in range(1, 8):
            day = base_date + timedelta(days=i)
            forecast.append({
                'date': day.strftime('%Y-%m-%d'),
                'dayOfWeek': day.strftime('%A'),
                'predictedRequests': max(1, flat_val),
                'recommendedStaff': max(1, flat_val // 4),
                'confidence': 0.0
            })
        return jsonify({
            'forecast': forecast,
            'modelVersion': model_version,
            'overallConfidence': 0.0,
            'dataPointsUsed': len(valid_counts),
            'method': 'insufficient_data',
            'note': 'Insufficient historical records (less than 7 days) — returning flat baseline with zero confidence'
        })

    # Path 2: Between 7 and 13 days (or model not loaded) -> Deterministic Moving Average
    if len(valid_counts) < 14 or FORECASTER_MODEL is None:
        recent_7 = valid_counts[-7:]
        moving_avg = sum(recent_7) / 7.0
        
        # Day of week adjustments (strictly deterministic multipliers derived from empirical patterns)
        dow_multipliers = {
            0: 1.15, # Monday
            1: 1.05, # Tuesday
            2: 1.00, # Wednesday
            3: 1.00, # Thursday
            4: 1.10, # Friday
            5: 0.70, # Saturday
            6: 0.65  # Sunday
        }
        
        forecast = []
        for i in range(1, 8):
            day = base_date + timedelta(days=i)
            mult = dow_multipliers[day.weekday()]
            predicted = max(1, int(round(moving_avg * mult)))
            forecast.append({
                'date': day.strftime('%Y-%m-%d'),
                'dayOfWeek': day.strftime('%A'),
                'predictedRequests': predicted,
                'recommendedStaff': max(1, predicted // 4),
                'confidence': 0.70
            })
            
        return jsonify({
            'forecast': forecast,
            'modelVersion': model_version,
            'overallConfidence': 0.70,
            'dataPointsUsed': len(valid_counts),
            'method': 'moving_average',
            'note': '7-day deterministic moving average with weekday seasonality weighting'
        })

    # Path 3: At least 14 days and forecaster_v1 model loaded
    try:
        rolling_7 = sum(valid_counts[-7:]) / 7.0
        lag_7_ratio = valid_counts[-7] / max(1.0, sum(valid_counts[-14:-7]) / 7.0)
        
        forecast = []
        current_rolling = rolling_7
        current_lag_ratio = min(2.5, max(0.3, lag_7_ratio))
        
        for i in range(1, 8):
            future_day = base_date + timedelta(days=i)
            dow = future_day.weekday()
            month = future_day.month
            
            # Construct exact feature row expected by forecaster_v1:
            # dow_0 through dow_6, month_norm, lag_7_ratio
            features = {}
            for d in range(7):
                features[f'dow_{d}'] = 1.0 if d == dow else 0.0
            features['month_norm'] = (month - 1) / 11.0
            features['lag_7_ratio'] = current_lag_ratio
            
            X_df = pd.DataFrame([features])
            pred_ratio = float(FORECASTER_MODEL.predict(X_df)[0])
            pred_ratio = max(0.3, min(2.5, pred_ratio)) # Guard rails
            
            pred_count = max(1, int(round(pred_ratio * current_rolling)))
            
            forecast.append({
                'date': future_day.strftime('%Y-%m-%d'),
                'dayOfWeek': future_day.strftime('%A'),
                'predictedRequests': pred_count,
                'recommendedStaff': max(1, pred_count // 4),
                'predictedRatio': round(pred_ratio, 4),
                'confidence': 0.85
            })
            
            # Roll forward rolling mean estimate
            current_rolling = (current_rolling * 6 + pred_count) / 7.0

        return jsonify({
            'forecast': forecast,
            'modelVersion': model_version,
            'overallConfidence': 0.85,
            'dataPointsUsed': len(valid_counts),
            'method': 'forecaster_v1',
            'note': 'Linear regression forecasting on rolling 7-day mean ratio'
        })

    except Exception as e:
        # Fallback to deterministic moving average if model calculation encounters unexpected error
        recent_7 = valid_counts[-7:]
        moving_avg = sum(recent_7) / 7.0
        forecast = []
        for i in range(1, 8):
            day = base_date + timedelta(days=i)
            predicted = max(1, int(round(moving_avg)))
            forecast.append({
                'date': day.strftime('%Y-%m-%d'),
                'dayOfWeek': day.strftime('%A'),
                'predictedRequests': predicted,
                'recommendedStaff': max(1, predicted // 4),
                'confidence': 0.65
            })
        return jsonify({
            'forecast': forecast,
            'modelVersion': model_version,
            'overallConfidence': 0.65,
            'dataPointsUsed': len(valid_counts),
            'method': 'moving_average',
            'error_note': f"Model execution error: {e}"
        })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_ENV', 'development') == 'development'
    
    print(f"[ClearFlow AI] Starting AI Microservice on port {port}")
    print(f"[ClearFlow AI] Classifier loaded: {CLASSIFIER_MODEL is not None}")
    print(f"[ClearFlow AI] Forecaster loaded: {FORECASTER_MODEL is not None}")
    print(f"[ClearFlow AI] Confidence threshold: {AI_CONFIDENCE_THRESHOLD}")
    print(f"[ClearFlow AI] Min change threshold: {AI_MIN_CHANGE}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
