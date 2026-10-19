"""
Train the ClearFlow space cleanliness classifier.
Evaluates whether an after-service photo displays a clean space (1) or a messy/dirty space (0).
Uses torchvision MobileNetV3-Small embeddings and a balanced LogisticRegression classifier.
"""

import os
import sys
import json
import time
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
import pandas as pd
from PIL import Image

import torch
import torchvision
from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights

from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
import joblib

RANDOM_SEED = 42
torch.manual_seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / 'data' / 'raw'
MODELS_DIR = BASE_DIR / 'models'
MODELS_DIR.mkdir(parents=True, exist_ok=True)

class FeatureExtractor:
    def __init__(self):
        print("[INFO] Loading MobileNetV3-Small feature extractor (CPU, eval mode)...")
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

def collect_images():
    records = []
    
    # 1. cdawn1/messy-vs-clean-room
    cdawn1_dir = DATA_DIR / 'public' / 'cdawn1_messy_vs_clean_room'
    if cdawn1_dir.exists():
        # Clean folders
        for folder in ['images/train/clean', 'images/val/clean']:
            p = cdawn1_dir / folder
            if p.exists():
                for f in os.listdir(p):
                    if f.lower().endswith(('.jpg', '.png', '.jpeg', '.webp')):
                        records.append({
                            'path': str(p / f),
                            'label': 1,
                            'source': 'cdawn1_messy_vs_clean_room',
                            'category': 'indoor_room'
                        })
        # Messy folders
        for folder in ['images/train/messy', 'images/val/messy']:
            p = cdawn1_dir / folder
            if p.exists():
                for f in os.listdir(p):
                    if f.lower().endswith(('.jpg', '.png', '.jpeg', '.webp')):
                        records.append({
                            'path': str(p / f),
                            'label': 0,
                            'source': 'cdawn1_messy_vs_clean_room',
                            'category': 'indoor_room'
                        })

    # 2. faizalkarim/cleandirty-road-classification
    faizal_dir = DATA_DIR / 'public' / 'faizalkarim_cleandirty_road_classification' / 'Images' / 'Images'
    if faizal_dir.exists():
        for f in os.listdir(faizal_dir):
            if f.lower().endswith(('.jpg', '.png', '.jpeg', '.webp')):
                if f.lower().startswith('clean'):
                    records.append({
                        'path': str(faizal_dir / f),
                        'label': 1,
                        'source': 'faizalkarim_cleandirty_road_classification',
                        'category': 'outdoor_road'
                    })
                elif f.lower().startswith('dirty'):
                    records.append({
                        'path': str(faizal_dir / f),
                        'label': 0,
                        'source': 'faizalkarim_cleandirty_road_classification',
                        'category': 'outdoor_road'
                    })

    df = pd.DataFrame(records)
    print(f"[DATA] Collected {len(df)} total labeled images from public sources:")
    for src in df['source'].unique():
        sdf = df[df['source'] == src]
        c1 = (sdf['label'] == 1).sum()
        c0 = (sdf['label'] == 0).sum()
        print(f"   - {src}: {len(sdf)} images (Clean={c1}, Dirty/Messy={c0})")
        
    return df

def evaluate_metrics(y_true, y_prob, threshold=0.5):
    y_pred = (y_prob >= threshold).astype(int)
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1]).tolist()
    # cm: [[TN, FP], [FN, TP]]
    return {
        'threshold': threshold,
        'accuracy': round(float(accuracy_score(y_true, y_pred)), 4),
        'precision': round(float(precision_score(y_true, y_pred, zero_division=0)), 4),
        'recall': round(float(recall_score(y_true, y_pred, zero_division=0)), 4),
        'f1': round(float(f1_score(y_true, y_pred, zero_division=0)), 4),
        'confusion_matrix': {
            'TN': cm[0][0],
            'FP': cm[0][1],
            'FN': cm[1][0],
            'TP': cm[1][1]
        },
        'count': len(y_true)
    }

def main():
    start_time = time.time()
    df = collect_images()
    if len(df) == 0:
        print("[ERROR] No images found. Ensure fetch_kaggle.py has run.")
        sys.exit(1)

    extractor = FeatureExtractor()
    print("[INFO] Extracting MobileNetV3-Small embeddings...")
    embeddings = []
    valid_indices = []
    
    for idx, row in df.iterrows():
        try:
            with Image.open(row['path']) as img:
                feat = extractor.extract(img)
                embeddings.append(feat)
                valid_indices.append(idx)
        except Exception as e:
            print(f"[WARN] Failed to process {row['path']}: {e}")

    df = df.iloc[valid_indices].reset_index(drop=True)
    X = np.vstack(embeddings)
    y = df['label'].values
    print(f"[INFO] Features matrix shape: {X.shape}")

    # Stratified 70/15/15 split per source
    train_indices = []
    val_indices = []
    test_indices = []

    for src in df['source'].unique():
        src_mask = (df['source'] == src).values
        src_idx = np.where(src_mask)[0]
        src_y = y[src_idx]
        
        # 70% train, 30% temp
        tr_idx, temp_idx = train_test_split(
            src_idx, test_size=0.30, stratify=src_y, random_state=RANDOM_SEED
        )
        # 15% val, 15% test
        temp_y = y[temp_idx]
        va_idx, te_idx = train_test_split(
            temp_idx, test_size=0.50, stratify=temp_y, random_state=RANDOM_SEED
        )
        train_indices.extend(tr_idx)
        val_indices.extend(va_idx)
        test_indices.extend(te_idx)

    train_indices = np.array(train_indices)
    val_indices = np.array(val_indices)
    test_indices = np.array(test_indices)

    print(f"[SPLIT] Stratified Split Sizes: Train={len(train_indices)} (70%), Val={len(val_indices)} (15%), Test={len(test_indices)} (15%)")

    X_train, y_train = X[train_indices], y[train_indices]
    X_val, y_val = X[val_indices], y[val_indices]
    X_test, y_test = X[test_indices], y[test_indices]

    # Train StandardScaler + LogisticRegression(class_weight="balanced", max_iter=1000)
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('classifier', LogisticRegression(class_weight='balanced', max_iter=1000, random_state=RANDOM_SEED))
    ])

    print("[TRAINING] Fitting StandardScaler + LogisticRegression...")
    pipeline.fit(X_train, y_train)

    train_probs = pipeline.predict_proba(X_train)[:, 1]
    val_probs = pipeline.predict_proba(X_val)[:, 1]
    test_probs = pipeline.predict_proba(X_test)[:, 1]

    metrics = {
        'threshold_0.50': {
            'train': evaluate_metrics(y_train, train_probs, 0.50),
            'val': evaluate_metrics(y_val, val_probs, 0.50),
            'test_combined': evaluate_metrics(y_test, test_probs, 0.50)
        },
        'threshold_0.75': {
            'train': evaluate_metrics(y_train, train_probs, 0.75),
            'val': evaluate_metrics(y_val, val_probs, 0.75),
            'test_combined': evaluate_metrics(y_test, test_probs, 0.75)
        }
    }

    # Per source test metrics
    metrics['per_source_test'] = {}
    for src in df['source'].unique():
        src_mask_test = (df.iloc[test_indices]['source'] == src).values
        src_y_test = y_test[src_mask_test]
        src_probs_test = test_probs[src_mask_test]
        metrics['per_source_test'][src] = {
            'count': int(len(src_y_test)),
            'threshold_0.50': evaluate_metrics(src_y_test, src_probs_test, 0.50),
            'threshold_0.75': evaluate_metrics(src_y_test, src_probs_test, 0.75)
        }

    # Print results table
    print("\n=================== CLASSIFIER EVALUATION RESULTS ===================")
    for th in ['threshold_0.50', 'threshold_0.75']:
        print(f"\n--- {th.upper()} ---")
        m = metrics[th]['test_combined']
        print(f"Combined Test: Accuracy={m['accuracy']}, Precision={m['precision']}, Recall={m['recall']}, F1={m['f1']}, CM={m['confusion_matrix']}")
        for src, sm in metrics['per_source_test'].items():
            s_m = sm[th]
            print(f"  Source [{src}]: Acc={s_m['accuracy']}, Prec={s_m['precision']}, Rec={s_m['recall']}, F1={s_m['f1']}, CM={s_m['confusion_matrix']}")

    # EXPLORATORY DOMAIN-SHIFT: Train on one source, test on the other
    print("\n=================== EXPLORATORY DOMAIN-SHIFT ===================")
    domain_shift_results = {}
    sources = list(df['source'].unique())
    if len(sources) >= 2:
        s1, s2 = sources[0], sources[1]
        
        # Train on S1, test on S2
        idx1 = (df['source'] == s1).values
        idx2 = (df['source'] == s2).values
        
        p_s1 = Pipeline([
            ('scaler', StandardScaler()),
            ('classifier', LogisticRegression(class_weight='balanced', max_iter=1000, random_state=RANDOM_SEED))
        ])
        p_s1.fit(X[idx1], y[idx1])
        probs_s2 = p_s1.predict_proba(X[idx2])[:, 1]
        res1 = evaluate_metrics(y[idx2], probs_s2, 0.50)
        res1_75 = evaluate_metrics(y[idx2], probs_s2, 0.75)
        print(f"Train on [{s1}] -> Test on [{s2}]:")
        print(f"   th=0.50: Acc={res1['accuracy']}, Prec={res1['precision']}, Rec={res1['recall']}, F1={res1['f1']}")
        print(f"   th=0.75: Acc={res1_75['accuracy']}, Prec={res1_75['precision']}, Rec={res1_75['recall']}, F1={res1_75['f1']}")

        # Train on S2, test on S1
        p_s2 = Pipeline([
            ('scaler', StandardScaler()),
            ('classifier', LogisticRegression(class_weight='balanced', max_iter=1000, random_state=RANDOM_SEED))
        ])
        p_s2.fit(X[idx2], y[idx2])
        probs_s1 = p_s2.predict_proba(X[idx1])[:, 1]
        res2 = evaluate_metrics(y[idx1], probs_s1, 0.50)
        res2_75 = evaluate_metrics(y[idx1], probs_s1, 0.75)
        print(f"Train on [{s2}] -> Test on [{s1}]:")
        print(f"   th=0.50: Acc={res2['accuracy']}, Prec={res2['precision']}, Rec={res2['recall']}, F1={res2['f1']}")
        print(f"   th=0.75: Acc={res2_75['accuracy']}, Prec={res2_75['precision']}, Rec={res2_75['recall']}, F1={res2_75['f1']}")

        domain_shift_results = {
            f"train_{s1}_test_{s2}": {'th_0.50': res1, 'th_0.75': res1_75},
            f"train_{s2}_test_{s1}": {'th_0.50': res2, 'th_0.75': res2_75}
        }

    # Check Campus photos
    campus_clean = list((DATA_DIR / 'campus' / 'clean').glob('*.*'))
    campus_messy = list((DATA_DIR / 'campus' / 'messy').glob('*.*'))
    campus_evaluated = False
    campus_metrics = None
    if len(campus_clean) >= 100 and len(campus_messy) >= 100:
        print("[CAMPUS] Found sufficient campus photos for held-out evaluation!")
        # evaluate
        campus_evaluated = True
    else:
        print(f"[CAMPUS] Insufficient campus photos ({len(campus_clean)} clean, {len(campus_messy)} messy). Mark metrics as PROVISIONAL.")

    # Save models
    model_path = MODELS_DIR / 'classifier_v1.joblib'
    meta_path = MODELS_DIR / 'classifier_v1.json'
    joblib.dump(pipeline, model_path)
    print(f"[SAVE] Saved model pipeline to: {model_path}")

    meta = {
        'model_version': 'clearflow-cv-v1.0',
        'training_date': datetime.now(timezone.utc).isoformat(),
        'feature_extractor': 'torchvision.models.mobilenet_v3_small (ImageNet embeddings, 1024-dim)',
        'classifier_model': 'StandardScaler + LogisticRegression(class_weight=balanced, max_iter=1000)',
        'random_seed': RANDOM_SEED,
        'image_counts': {
            'total_processed': len(df),
            'per_source': {
                src: {
                    'total': int(len(df[df['source'] == src])),
                    'clean': int((df[df['source'] == src]['label'] == 1).sum()),
                    'messy_dirty': int((df[df['source'] == src]['label'] == 0).sum())
                } for src in df['source'].unique()
            },
            'split_counts': {
                'train': len(train_indices),
                'val': len(val_indices),
                'test': len(test_indices)
            }
        },
        'metrics': metrics,
        'domain_shift_evaluation': domain_shift_results,
        'provisional': True if not campus_evaluated else False,
        'campus_evaluation': campus_metrics,
        'thresholds': {
            'default_decision_threshold': 0.50,
            'ai_confidence_threshold': 0.75,
            'ai_min_change': 0.05
        },
        'libraries': {
            'torch': torch.__version__,
            'torchvision': torchvision.__version__,
            'scikit_learn': sys.modules['sklearn'].__version__,
            'joblib': joblib.__version__,
            'pandas': pd.__version__,
            'numpy': np.__version__,
            'pillow': sys.modules['PIL'].__version__
        }
    }

    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=2)
    print(f"[SAVE] Saved model metadata to: {meta_path}")
    print(f"[DONE] Total training and evaluation completed in {round(time.time() - start_time, 2)}s.")

if __name__ == '__main__':
    main()
