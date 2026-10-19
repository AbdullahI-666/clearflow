# ClearFlow AI Microservice Upgrade Report

**Date of Execution**: 2026-10-15  
**Branch**: `feature/ai-classifier`  
**Engineer Role**: Autonomous AI Systems Engineer  
**Scope**: `ai-service/`, root `.gitignore`, `README.md`, `.github/workflows/ci-ai.yml` (Zero edits made to `server/` or `client/`).

---

## 1. Executive Summary & Step-by-Step Status

| Step | Description | Status | Key Deliverable / Outcome |
|---|---|---|---|
| **Step 0** | Safety Net, Backup & Contract Analysis | **DONE** | Created `..\clearflow_backup_2026-10-15.zip` (431,982 bytes). Switched to `feature/ai-classifier`. Verified image contract (supporting HTTP/HTTPS and base64 data URIs). |
| **Step 1** | Python 3.11 Runtime & Virtual Environment | **DONE** | Installed Python 3.11.9 via winget. Provisioned `ai-service\.venv`. Installed Flask, PyTorch CPU, Torchvision, Scikit-learn, Pandas, Pillow, Kagglehub, Pytest. Pinned exact versions in `requirements.txt`. |
| **Step 2** | Folder Hierarchy & Ignore Rules | **DONE** | Created `data/raw/public`, `data/raw/campus/clean`, `data/raw/campus/messy`, `data/processed`, `models`, `scripts`. Updated root `.gitignore`. Authored `CAMPUS_PHOTO_GUIDE.md`. |
| **Step 3** | Public Image Data Ingestion | **DONE** | Ingested `cdawn1/messy-vs-clean-room` (212 labeled images) and `faizalkarim/cleandirty-road-classification` (237 labeled images) via `kagglehub`. Inferred label mappings. Documented licenses in `DATA_SOURCES.md`. |
| **Step 4** | Cleanliness Classifier Training | **DONE** | Extracted 1024-dim ImageNet embeddings via `MobileNetV3-Small`. Trained balanced `LogisticRegression` pipeline. Combined test accuracy: **98.53%** (F1: 0.9846). Conducted exploratory domain-shift analysis. Saved `classifier_v1.joblib` and `classifier_v1.json`. |
| **Step 5** | Demand Forecaster Training | **DONE** | Queried NYC 311 Socrata API across 24 months (713 days, 1,145,531 incident requests). Trained linear regression model on rolling 7-day mean ratio. 28-day walk-forward MAE: **257.08 requests** (outperformed naive baseline by **39.67%** lower error). Saved `forecaster_v1.joblib` and `forecaster_v1.json`. |
| **Step 6** | Deterministic Microservice Service Overhaul | **DONE** | Replaced randomised heuristics in `app.py`. Enforced deterministic `changeScore`, perceptual duplicate checks, MobileNet cleanliness probabilities, strict input validation, and zero `random` module usage. Updated `GET /health` with real model metadata. |
| **Step 7** | Automated Testing & Smoke Test | **DONE** | Created 10 deterministic pytest unit tests (100% pass rate in 23.91s). Executed live smoke test against background server on port 5005. Removed `|| true` from `.github/workflows/ci-ai.yml`. |
| **Step 8** | Documentation & Reporting | **DONE** | Authored `MODEL_CARD.md`, `DATA_SOURCES.md`, `CAMPUS_PHOTO_GUIDE.md`, updated `README.md`, and compiled this final engineering report. |

---

## 2. Verbatim Command Log

The following shell and python commands were executed sequentially during the upgrade:

```powershell
# Step 0: Backup and Git Branching
tar.exe -a -c -f ..\clearflow_backup_2026-10-15.zip --exclude='node_modules' --exclude='.venv' --exclude='dist' --exclude='.git' .
git switch -c feature/ai-classifier

# Step 1: Environment Setup
winget install -e --id Python.Python.3.11 --source winget --accept-source-agreements --accept-package-agreements
py -3.11 -m venv ai-service\.venv
ai-service\.venv\Scripts\python.exe -m pip install flask flask-cors numpy pillow requests scikit-learn joblib pandas kagglehub pytest
ai-service\.venv\Scripts\python.exe -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Step 2: Folder Provisioning
powershell -Command "New-Item -ItemType Directory -Force -Path 'ai-service/data/raw/public', 'ai-service/data/raw/campus/clean', 'ai-service/data/raw/campus/messy', 'ai-service/data/processed', 'ai-service/models', 'ai-service/scripts'"

# Step 3: Dataset Ingestion
ai-service\.venv\Scripts\python.exe ai-service\scripts\fetch_kaggle.py

# Step 4: Classifier Training & Evaluation
ai-service\.venv\Scripts\python.exe ai-service\scripts\train_classifier.py

# Step 5: Forecaster Data Fetch & Training
ai-service\.venv\Scripts\python.exe ai-service\scripts\fetch_311.py
ai-service\.venv\Scripts\python.exe ai-service\scripts\train_forecaster.py

# Step 7: Tests and Smoke Test
ai-service\.venv\Scripts\python.exe -m pytest ai-service/tests -v
ai-service\.venv\Scripts\python.exe ai-service\scripts\smoke_test.py
```

---

## 3. Training & Evaluation Metrics (Verbatim Output)

### 3.1 Computer Vision Classifier (`scripts/train_classifier.py`)

```text
[DATA] Collected 449 total labeled images from public sources:
   - cdawn1_messy_vs_clean_room: 212 images (Clean=106, Dirty/Messy=106)
   - faizalkarim_cleandirty_road_classification: 237 images (Clean=113, Dirty/Messy=124)
[INFO] Loading MobileNetV3-Small feature extractor (CPU, eval mode)...
[INFO] Extracting MobileNetV3-Small embeddings...
[INFO] Features matrix shape: (449, 1024)
[SPLIT] Stratified Split Sizes: Train=313 (70%), Val=68 (15%), Test=68 (15%)
[TRAINING] Fitting StandardScaler + LogisticRegression...

=================== CLASSIFIER EVALUATION RESULTS ===================

--- THRESHOLD_0.50 ---
Combined Test: Accuracy=0.9853, Precision=1.0, Recall=0.9697, F1=0.9846, CM={'TN': 35, 'FP': 0, 'FN': 1, 'TP': 32}
  Source [cdawn1_messy_vs_clean_room]: Acc=1.0, Prec=1.0, Rec=1.0, F1=1.0, CM={'TN': 16, 'FP': 0, 'FN': 0, 'TP': 16}
  Source [faizalkarim_cleandirty_road_classification]: Acc=0.9722, Prec=1.0, Rec=0.9412, F1=0.9697, CM={'TN': 19, 'FP': 0, 'FN': 1, 'TP': 16}

--- THRESHOLD_0.75 ---
Combined Test: Accuracy=0.9853, Precision=1.0, Recall=0.9697, F1=0.9846, CM={'TN': 35, 'FP': 0, 'FN': 1, 'TP': 32}
  Source [cdawn1_messy_vs_clean_room]: Acc=1.0, Prec=1.0, Rec=1.0, F1=1.0, CM={'TN': 16, 'FP': 0, 'FN': 0, 'TP': 16}
  Source [faizalkarim_cleandirty_road_classification]: Acc=0.9722, Prec=1.0, Rec=0.9412, F1=0.9697, CM={'TN': 19, 'FP': 0, 'FN': 1, 'TP': 16}

=================== EXPLORATORY DOMAIN-SHIFT ===================
Train on [cdawn1_messy_vs_clean_room] -> Test on [faizalkarim_cleandirty_road_classification]:
   th=0.50: Acc=0.7595, Prec=0.85, Rec=0.6018, F1=0.7047
   th=0.75: Acc=0.7089, Prec=0.9074, Rec=0.4336, F1=0.5868
Train on [faizalkarim_cleandirty_road_classification] -> Test on [cdawn1_messy_vs_clean_room]:
   th=0.50: Acc=0.5802, Prec=0.8696, Rec=0.1887, F1=0.3101
   th=0.75: Acc=0.5425, Prec=1.0, Rec=0.0849, F1=0.1565
[CAMPUS] Insufficient campus photos (0 clean, 0 messy). Mark metrics as PROVISIONAL.
[SAVE] Saved model pipeline to: C:\Users\ikram\.gemini\antigravity\scratch\clearflow\ai-service\models\classifier_v1.joblib
[SAVE] Saved model metadata to: C:\Users\ikram\.gemini\antigravity\scratch\clearflow\ai-service\models\classifier_v1.json
[DONE] Total training and evaluation completed in 32.64s.
```

### 3.2 Demand Forecaster (`scripts/train_forecaster.py`)

```text
=========================================================
Training ClearFlow Service Demand Forecaster (v1)
=========================================================
[DATA] Clean feature dataframe constructed: 698 total days (2024-11-15 to 2026-10-13)

[WALK-FORWARD] Conducting 28-day walk-forward evaluation on test window:
   Period: 2026-09-16 to 2026-10-13

=================== FORECASTER WALK-FORWARD RESULTS ===================
Evaluation Window: 28 consecutive days
Model MAE (Daily Counts):          257.08 requests
Naive Baseline MAE (Counts):      426.14 requests ('same weekday last week')
Model MAE (Ratio to 7-day mean):   0.1232
Naive Baseline MAE (Ratio):       0.2005
[CONCLUSION] SUCCESS: The Linear Regression forecaster BEATS the naive baseline by 39.67% lower MAE.

[SAVE] Saved forecaster model to: C:\Users\ikram\.gemini\antigravity\scratch\clearflow\ai-service\models\forecaster_v1.joblib
[SAVE] Saved forecaster metadata to: C:\Users\ikram\.gemini\antigravity\scratch\clearflow\ai-service\models\forecaster_v1.json
```

---

## 4. Pytest Test Suite Results (Verbatim Output)

```text
============================= test session starts =============================
platform win32 -- Python 3.11.9, pytest-9.1.1, pluggy-1.6.0 -- C:\Users\ikram\.gemini\antigravity\scratch\clearflow\ai-service\.venv\Scripts\python.exe
cachedir: .pytest_cache
rootdir: C:\Users\ikram\.gemini\antigravity\scratch\clearflow\ai-service
configfile: pytest.ini
collecting ... collected 10 items

ai-service\tests\test_routes.py::test_no_random_import_in_app PASSED     [ 10%]
ai-service\tests\test_routes.py::test_health_endpoint PASSED             [ 20%]
ai-service\tests\test_routes.py::test_verify_missing_body_returns_400 PASSED [ 30%]
ai-service\tests\test_routes.py::test_verify_data_uri_input_works PASSED [ 40%]
ai-service\tests\test_routes.py::test_verify_identical_images_gives_duplicate_fail PASSED [ 50%]
ai-service\tests\test_routes.py::test_verify_unreachable_url_gives_flagged_with_manual_review PASSED [ 60%]
ai-service\tests\test_routes.py::test_verify_deterministic_same_output PASSED [ 70%]
ai-service\tests\test_routes.py::test_verify_missing_model_flagged PASSED [ 80%]
ai-service\tests\test_routes.py::test_predict_insufficient_data PASSED   [ 90%]
ai-service\tests\test_routes.py::test_predict_deterministic_and_forecaster_v1 PASSED [100%]

============================= 10 passed in 23.91s =============================
```

---

## 5. Live Smoke-Test Server Output (Verbatim Responses)

Executed against background service on port 5005 via `scripts/smoke_test.py`:

```json
/* 1. GET /health */
{
  "classifier_loaded": true,
  "classifier_version": "clearflow-cv-v1.0",
  "forecaster_loaded": true,
  "forecaster_version": "clearflow-forecaster-v1.0",
  "service": "clearflow-ai",
  "status": "healthy",
  "timestamp": "2026-10-15T09:10:06.345437+00:00",
  "torch_available": true
}

/* 2. POST /verify */
{
  "cleanProbability": 0.9734,
  "confidenceScore": 0.9734,
  "details": {
    "changeScore": 0.7482,
    "cleanProbability": 0.9734,
    "duplicate": false,
    "manualReviewRequired": false,
    "method": "mobilenet_v3_classifier",
    "minChange": 0.05,
    "reason": "Service successfully verified: space classified as clean and sufficient physical transformation verified.",
    "threshold": 0.75
  },
  "modelVersion": "clearflow-cv-v1.0",
  "processingTimeMs": 124,
  "result": "Pass"
}

/* 3. POST /predict */
{
  "dataPointsUsed": 21,
  "forecast": [
    {
      "confidence": 0.85,
      "date": "2026-10-16",
      "dayOfWeek": "Friday",
      "predictedRatio": 1.0504,
      "predictedRequests": 37,
      "recommendedStaff": 9
    },
    {
      "confidence": 0.85,
      "date": "2026-10-17",
      "dayOfWeek": "Saturday",
      "predictedRatio": 0.6189,
      "predictedRequests": 22,
      "recommendedStaff": 5
    },
    {
      "confidence": 0.85,
      "date": "2026-10-18",
      "dayOfWeek": "Sunday",
      "predictedRatio": 0.6456,
      "predictedRequests": 22,
      "recommendedStaff": 5
    },
    {
      "confidence": 0.85,
      "date": "2026-10-19",
      "dayOfWeek": "Monday",
      "predictedRatio": 1.1902,
      "predictedRequests": 38,
      "recommendedStaff": 9
    },
    {
      "confidence": 0.85,
      "date": "2026-10-20",
      "dayOfWeek": "Tuesday",
      "predictedRatio": 1.1737,
      "predictedRequests": 39,
      "recommendedStaff": 9
    },
    {
      "confidence": 0.85,
      "date": "2026-10-21",
      "dayOfWeek": "Wednesday",
      "predictedRatio": 1.1242,
      "predictedRequests": 38,
      "recommendedStaff": 9
    },
    {
      "confidence": 0.85,
      "date": "2026-10-22",
      "dayOfWeek": "Thursday",
      "predictedRatio": 1.114,
      "predictedRequests": 38,
      "recommendedStaff": 9
    }
  ],
  "method": "forecaster_v1",
  "modelVersion": "clearflow-forecaster-v1.0",
  "note": "Linear regression forecasting on rolling 7-day mean ratio",
  "overallConfidence": 0.85
}
```

---

## 6. Git Status and Diff Stat (Verbatim Output)

### 6.1 `git status --short`

```text
 M .github/workflows/ci-ai.yml
 M .gitignore
 M README.md
 M ai-service/app.py
 M ai-service/requirements.txt
 M ai-service/tests/test_routes.py
?? ai-service/CAMPUS_PHOTO_GUIDE.md
?? ai-service/DATA_SOURCES.md
?? ai-service/MODEL_CARD.md
?? ai-service/models/
?? ai-service/scripts/
```
*(Pre-existing staged changes in `server/` and `client/` from previous work remain untouched).*

### 6.2 `git diff --stat`

```text
 .github/workflows/ci-ai.yml     |   2 +-
 .gitignore                      |   2 +
 README.md                       |  33 +-
 ai-service/app.py               | 677 +++++++++++++++++++++++++---------------
 ai-service/requirements.txt     |  18 +-
 ai-service/tests/test_routes.py | 221 +++++++++++--
 6 files changed, 669 insertions(+), 284 deletions(-)
```

---

## 7. Recommended Server Patches (Non-Modifying)

Per Hard Rule 1, `server/` was strictly preserved without modification. If the team desires the Node.js Express backend to forward service verification requests to the newly trained Python Flask microservice (at `ENV.AI_SERVICE_URL = http://localhost:5001`), apply the following recommended patch:

### Recommended Patch for `server/src/services/ai.service.ts`:

```diff
--- a/server/src/services/ai.service.ts
+++ b/server/src/services/ai.service.ts
@@ -107,6 +107,24 @@ export const verifyServiceQuality = async (
   beforeUrl?: string,
   afterUrl?: string,
   customThreshold?: number
 ) => {
+  // Attempt calling external Flask AI microservice if accessible
+  try {
+    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5001';
+    const response = await fetch(`${aiServiceUrl}/verify`, {
+      method: 'POST',
+      headers: { 'Content-Type': 'application/json' },
+      body: JSON.stringify({ before_url: beforeUrl, after_url: afterUrl }),
+      signal: AbortSignal.timeout(6000)
+    });
+    if (response.ok) {
+      const data = await response.json();
+      return data;
+    }
+  } catch (err) {
+    // Fallback gracefully to in-process libvips vision pipeline
+  }
+
   // Execute real libvips vision pipeline
   const visionResult = await performAiQualityVerification(beforeUrl, afterUrl, threshold);
```

---

## 8. UNKNOWN / NEEDS A HUMAN

In compliance with forensic and auditing guidelines, the following elements require human decision-making:
1. **Campus Benchmark Dataset Collection**:
   - The computer vision classifier metrics are currently marked **PROVISIONAL** because they are trained and evaluated on public benchmark datasets (`cdawn1/messy-vs-clean-room` and `faizalkarim/cleandirty-road-classification`).
   - To achieve production institutional validation, team members must capture real campus facility photos following `ai-service/CAMPUS_PHOTO_GUIDE.md` (minimum 150 photos in `data/raw/campus/clean/` and 150 in `data/raw/campus/messy/`).
2. **Kaggle `cdawn1/messy-vs-clean-room` Legal License**:
   - The license for `cdawn1/messy-vs-clean-room` is **UNKNOWN** (no explicit license file was published by the original author on Kaggle). While suitable for research and academic FYP demonstration, commercial deployment would require explicit permission from the author.
3. **NYC 311 Institutional Volume Calibration**:
   - The 7-day demand forecaster predicts the ratio relative to a facility's rolling 7-day average using NYC 311 municipal proxy data. Once the institution logs 30+ days of live internal work order volume in MongoDB Atlas, retraining the forecaster on institutional data will yield campus-specific seasonal coefficients.
