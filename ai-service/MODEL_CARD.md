# Model Card: ClearFlow Computer Vision Verification Classifier & Forecaster

## 1. Model Details

### 1.1 Computer Vision Cleanliness Classifier (`classifier_v1`)
- **Model Identifier**: `clearflow-cv-v1.0`
- **Model Architecture**: Deep feature extraction via pretrained `torchvision.models.mobilenet_v3_small` (ImageNet weights, 1024-dimensional feature embeddings extracted from the penultimate layer) followed by a scikit-learn pipeline consisting of `StandardScaler` and `LogisticRegression(class_weight='balanced', max_iter=1000, random_state=42)`.
- **Primary Task**: Binary classification determining whether an AFTER-service facility photograph exhibits a clean space (`1`) or a messy / dirty space (`0`).
- **Decision Thresholds**:
  - Default decision threshold: `0.50`
  - Operational ClearFlow threshold (`AI_CONFIDENCE_THRESHOLD`): `0.75`
  - Structural change threshold (`AI_MIN_CHANGE`): `0.05`
- **Release Date**: 2026-10-15
- **Status**: **PROVISIONAL** (trained and evaluated on public benchmark datasets; campus-specific photo test set not yet collected).

### 1.2 Demand Forecaster (`forecaster_v1`)
- **Model Identifier**: `clearflow-forecaster-v1.0`
- **Model Architecture**: Scikit-learn `LinearRegression` predicting the daily multiplier ratio relative to the 7-day trailing moving average.
- **Input Features**: Day-of-week one-hot indicators (`dow_0` through `dow_6`), normalized month (`month_norm`), and 7-day lag ratio (`lag_7_ratio`).
- **Primary Task**: Scale-invariant 7-day rolling demand forecasting for multi-facility operations.

---

## 2. Intended Use and Scope
- **Intended Use**: Operational decision support and automated quality triage for facility management administrators.
  - Automatically flags service tickets where before and after photos are identical duplicates (anti-fraud).
  - Automatically approves clearly clean completions when confidence exceeds operational thresholds and physical visual transformation is confirmed.
  - Tunnels questionable or low-confidence completions to human supervisors for manual audit.
- **Out of Scope**:
  - Forensic legal proof of contractor actions.
  - Safety-critical or hazardous material inspection without human supervisor sign-off.
  - High-precision facial or personal identity verification (faces and people must be excluded).

---

## 3. Data Sources & Licensing

| Dataset Name | Source URL | License | Total Count | Class Breakdown |
|---|---|---|---|---|
| **Messy vs. Clean Room** | `cdawn1/messy-vs-clean-room` | **UNKNOWN** (No explicit license in Kaggle metadata) | 212 labeled images | 106 Clean (Class 1), 106 Messy (Class 0) |
| **Clean/Dirty Road Classification** | `faizalkarim/cleandirty-road-classification` | **CC0: Public Domain** | 237 labeled images | 113 Clean (Class 1), 124 Dirty (Class 0) |
| **NYC 311 Service Requests** | NYC Open Data Socrata API | **NYC Open Data Terms of Use** | 713 daily records (1,145,531 incident requests) | 24-month historical daily volume across 6 facility categories |
| **Campus Held-Out Set** | `ai-service/data/raw/campus/` | Internal Institution Data | 0 images (Quotas: 150 clean, 150 messy) | Pending physical site collection |

---

## 4. Performance Metrics (PROVISIONAL)

### 4.1 Cleanliness Classifier Performance
Evaluated using a stratified 70/15/15 split across both public data sources:
- **Train Split**: 313 images (70%)
- **Validation Split**: 68 images (15%)
- **Test Split**: 68 images (15%)

#### Combined Test Set Metrics
| Evaluation Threshold | Accuracy | Precision | Recall | F1 Score | Confusion Matrix |
|---|---|---|---|---|---|
| **Threshold = 0.50** | **98.53%** (0.9853) | **100.0%** (1.0000) | **96.97%** (0.9697) | **0.9846** | TN=35, FP=0, FN=1, TP=32 |
| **Threshold = 0.75** (Operational) | **98.53%** (0.9853) | **100.0%** (1.0000) | **96.97%** (0.9697) | **0.9846** | TN=35, FP=0, FN=1, TP=32 |

#### Per-Source Test Breakdown (at Threshold = 0.75)
- **Indoor Rooms (`cdawn1`)**: Accuracy = **100.0%**, Precision = 1.00, Recall = 1.00, F1 = 1.00 (16/16 clean, 16/16 messy correct).
- **Outdoor Grounds (`faizalkarim`)**: Accuracy = **97.22%**, Precision = 1.00, Recall = 0.9412, F1 = 0.9697 (19/19 dirty correct, 16/17 clean correct, 1 false negative).

### 4.2 Exploratory Domain-Shift Evaluation
Cross-domain transfer was tested by training on one environment type and evaluating exclusively on the other without fine-tuning:
1. **Train on Indoor Rooms (`cdawn1`) -> Test on Outdoor Roads (`faizalkarim`)**:
   - Threshold 0.50: Accuracy = **75.95%**, Precision = 0.8500, Recall = 0.6018, F1 = 0.7047
   - Threshold 0.75: Accuracy = **70.89%**, Precision = 0.9074, Recall = 0.4336, F1 = 0.5868
2. **Train on Outdoor Roads (`faizalkarim`) -> Test on Indoor Rooms (`cdawn1`)**:
   - Threshold 0.50: Accuracy = **58.02%**, Precision = 0.8696, Recall = 0.1887, F1 = 0.3101
   - Threshold 0.75: Accuracy = **54.25%**, Precision = 1.0000, Recall = 0.0849, F1 = 0.1565

*Finding*: Cross-domain evaluation demonstrates substantial domain shift between indoor rooms and outdoor asphalt/litter, highlighting why the unified model must be trained on diverse multi-environment datasets and why site-specific campus photos are recommended.

### 4.3 Forecaster Walk-Forward Evaluation
Walk-forward evaluation conducted on the final 28 consecutive days of the 24-month NYC 311 time series:
- **Forecaster Model MAE**: **257.08 requests/day** (Ratio error: `0.1232`)
- **Naive Baseline MAE ("same weekday last week")**: **426.14 requests/day** (Ratio error: `0.2005`)
- **Relative Improvement**: The linear regression forecaster outperforms the naive baseline by **39.67% lower MAE**.

---

## 5. Architectural Evolution & Rationale
- **Why the Original SVM/HOG Plan Was Replaced**:
  The initial design plan contemplated training a classical SVM on Histogram of Oriented Gradients (HOG) features. However, no curated institution-specific facility dataset existed on the machine, and HOG features are notoriously brittle to viewpoint shifts, shadows, and variable indoor lighting. Pretrained `MobileNetV3-Small` deep embeddings provide robust semantic spatial representations while retaining low CPU latency (~120 ms per inference).
- **Why the Randomised Heuristic Was Replaced**:
  The original `ai-service/app.py` implementation relied on `random.uniform()` to simulate confidence scores and predict workloads. This violated auditability, reproducibility, and compliance standards. The current pipeline is 100% deterministic: identical inputs yield identical outputs.

---

## 6. Limitations & Risk Factors
1. **Visual Proxy Only**: The model assesses visual cleanliness and spatial displacement. It cannot detect odorless chemical residue, hidden electrical faults, or sub-surface plumbing leaks.
2. **Camera Angle Sensitivity**: Drastic changes in perspective, extreme zooms, or obstructed camera lenses can skew structural change calculations (`changeScore`).
3. **Lighting & Contrast**: Extreme glare or pitch-black underexposure can degrade classification confidence.
4. **Proxy Demand Drift**: The workload model was trained on municipal 311 proxy data; internal corporate or university campuses may experience different academic or corporate schedule seasonality (e.g., semester breaks).

---

## 7. Retraining & Deployment Notes
- **Weight Download**: `torchvision` downloads the lightweight MobileNetV3-Small weight checkpoint (~9.8 MB) upon first initialization, caching it under `%USERPROFILE%\.cache\torch\hub\checkpoints\`. Subsequent runs execute 100% offline.
- **Retraining Process**:
  Once campus photos are collected following `CAMPUS_PHOTO_GUIDE.md`:
  ```powershell
  cd ai-service
  .\.venv\Scripts\python.exe scripts\train_classifier.py
  .\.venv\Scripts\python.exe scripts\train_forecaster.py
  ```
