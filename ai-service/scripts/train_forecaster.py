"""
Train the ClearFlow service demand forecaster.
Fits a LinearRegression model to predict the ratio of daily requests to the 7-day rolling mean.
Features:
- day_of_week (one-hot or categorized)
- month
- 7-day lag ratio (volume(t-7) / rolling_mean_7)
- 7-day rolling mean

Evaluates using walk-forward validation on the last 28 days against the naive baseline
'same weekday last week' (volume(t-7)).
"""

import os
import sys
import json
import time
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
import joblib

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / 'data' / 'processed'
MODELS_DIR = BASE_DIR / 'models'
MODELS_DIR.mkdir(parents=True, exist_ok=True)

DATA_CSV = PROCESSED_DIR / 'daily_counts.csv'
MODEL_JOB = MODELS_DIR / 'forecaster_v1.joblib'
MODEL_JSON = MODELS_DIR / 'forecaster_v1.json'

def build_features_df(csv_path: Path):
    df = pd.read_csv(csv_path)
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date').reset_index(drop=True)
    
    # Filter out anomalous tail days (e.g., partial logging on scrape day)
    median_vol = df['total_requests'].median()
    df = df[df['total_requests'] >= median_vol * 0.2].reset_index(drop=True)
    
    df['day_of_week'] = df['date'].dt.dayofweek # 0=Mon, 6=Sun
    df['month'] = df['date'].dt.month
    
    # 7-day rolling mean of past 7 days (excluding current day t)
    # shift(1) ensures no data leakage from day t
    df['rolling_mean_7'] = df['total_requests'].shift(1).rolling(window=7).mean()
    
    # 7-day lag (requests on same weekday last week)
    df['lag_7'] = df['total_requests'].shift(7)
    
    # Ratio of day t-7 to its prior rolling mean
    df['lag_7_ratio'] = df['lag_7'] / df['rolling_mean_7'].shift(7).replace(0, np.nan)
    
    # Target: Ratio of day t requests to rolling_mean_7
    df['target_ratio'] = df['total_requests'] / df['rolling_mean_7'].replace(0, np.nan)
    
    # Drop warm-up rows (first 14 days needed for lag and rolling calculations)
    df_clean = df.dropna().reset_index(drop=True)
    return df_clean

def get_feature_matrix(df_subset):
    # One-hot encode day of week (7 days)
    dow_dummies = pd.get_dummies(df_subset['day_of_week'], prefix='dow')
    for d in range(7):
        col = f'dow_{d}'
        if col not in dow_dummies.columns:
            dow_dummies[col] = 0
    dow_dummies = dow_dummies[[f'dow_{d}' for d in range(7)]]
    
    # Normalized month (1-12)
    month_norm = (df_subset[['month']] - 1) / 11.0
    month_norm.columns = ['month_norm']
    
    # Lag 7 ratio clipped to reasonable bounds
    lag_7_ratio = df_subset[['lag_7_ratio']].clip(0.3, 2.5)
    
    X = pd.concat([dow_dummies.reset_index(drop=True), month_norm.reset_index(drop=True), lag_7_ratio.reset_index(drop=True)], axis=1)
    return X

def main():
    print("=========================================================")
    print("Training ClearFlow Service Demand Forecaster (v1)")
    print("=========================================================")
    
    if not DATA_CSV.exists():
        print(f"[ERROR] Data file {DATA_CSV} not found. Run fetch_311.py first.")
        sys.exit(1)
        
    df = build_features_df(DATA_CSV)
    print(f"[DATA] Clean feature dataframe constructed: {len(df)} total days ({df['date'].min().strftime('%Y-%m-%d')} to {df['date'].max().strftime('%Y-%m-%d')})")
    
    # Walk-forward evaluation on the last 28 days
    eval_days = 28
    if len(df) <= eval_days + 30:
        print("[ERROR] Insufficient days for 28-day walk-forward evaluation.")
        sys.exit(1)
        
    split_idx = len(df) - eval_days
    
    print(f"\n[WALK-FORWARD] Conducting 28-day walk-forward evaluation on test window:")
    print(f"   Period: {df.iloc[split_idx]['date'].strftime('%Y-%m-%d')} to {df.iloc[-1]['date'].strftime('%Y-%m-%d')}")
    
    model_errors_counts = []
    baseline_errors_counts = []
    
    model_errors_ratio = []
    baseline_errors_ratio = []
    
    evaluation_log = []
    
    for i in range(split_idx, len(df)):
        # Training window: all days prior to day i
        train_df = df.iloc[:i]
        test_row = df.iloc[i:i+1]
        
        X_tr = get_feature_matrix(train_df)
        y_tr = train_df['target_ratio'].values
        
        X_te = get_feature_matrix(test_row)
        actual_ratio = test_row['target_ratio'].values[0]
        actual_count = test_row['total_requests'].values[0]
        rolling_7 = test_row['rolling_mean_7'].values[0]
        
        # Model fit & predict
        reg = LinearRegression()
        reg.fit(X_tr, y_tr)
        pred_ratio = float(reg.predict(X_te)[0])
        pred_count = pred_ratio * rolling_7
        
        # Naive Baseline: same weekday last week (lag_7)
        naive_count = float(test_row['lag_7'].values[0])
        naive_ratio = naive_count / rolling_7
        
        # Compute errors
        err_model_c = abs(pred_count - actual_count)
        err_base_c = abs(naive_count - actual_count)
        
        err_model_r = abs(pred_ratio - actual_ratio)
        err_base_r = abs(naive_ratio - actual_ratio)
        
        model_errors_counts.append(err_model_c)
        baseline_errors_counts.append(err_base_c)
        model_errors_ratio.append(err_model_r)
        baseline_errors_ratio.append(err_base_r)
        
        evaluation_log.append({
            'date': test_row['date'].dt.strftime('%Y-%m-%d').values[0],
            'weekday': test_row['date'].dt.day_name().values[0],
            'actual_count': int(actual_count),
            'model_pred_count': round(pred_count, 1),
            'naive_baseline_count': round(naive_count, 1),
            'actual_ratio': round(actual_ratio, 4),
            'model_pred_ratio': round(pred_ratio, 4),
            'err_model_count': round(err_model_c, 1),
            'err_base_count': round(err_base_c, 1)
        })

    mae_model_counts = float(np.mean(model_errors_counts))
    mae_base_counts = float(np.mean(baseline_errors_counts))
    
    mae_model_ratio = float(np.mean(model_errors_ratio))
    mae_base_ratio = float(np.mean(baseline_errors_ratio))
    
    beats_baseline = mae_model_counts < mae_base_counts
    pct_diff = ((mae_base_counts - mae_model_counts) / mae_base_counts) * 100
    
    print("\n=================== FORECASTER WALK-FORWARD RESULTS ===================")
    print(f"Evaluation Window: {eval_days} consecutive days")
    print(f"Model MAE (Daily Counts):          {round(mae_model_counts, 2)} requests")
    print(f"Naive Baseline MAE (Counts):      {round(mae_base_counts, 2)} requests ('same weekday last week')")
    print(f"Model MAE (Ratio to 7-day mean):   {round(mae_model_ratio, 4)}")
    print(f"Naive Baseline MAE (Ratio):       {round(mae_base_ratio, 4)}")
    
    if beats_baseline:
        print(f"[CONCLUSION] SUCCESS: The Linear Regression forecaster BEATS the naive baseline by {round(pct_diff, 2)}% lower MAE.")
    else:
        print(f"[CONCLUSION] The model did NOT beat the naive baseline ({round(-pct_diff, 2)}% higher error than naive).")

    # Fit final model on all data
    X_full = get_feature_matrix(df)
    y_full = df['target_ratio'].values
    final_model = LinearRegression()
    final_model.fit(X_full, y_full)
    
    # Save artifacts
    joblib.dump(final_model, MODEL_JOB)
    print(f"\n[SAVE] Saved forecaster model to: {MODEL_JOB}")
    
    feature_names = list(X_full.columns)
    coef_dict = {f: round(float(c), 5) for f, c in zip(feature_names, final_model.coef_)}
    
    metadata = {
        'model_version': 'clearflow-forecaster-v1.0',
        'training_date': datetime.now(timezone.utc).isoformat(),
        'model_type': 'LinearRegression (Ratio to 7-day rolling mean)',
        'data_source': 'NYC 311 Service Requests (24-month proxy)',
        'total_training_days': len(df),
        'date_range': {
            'start': df['date'].min().strftime('%Y-%m-%d'),
            'end': df['date'].max().strftime('%Y-%m-%d')
        },
        'feature_names': feature_names,
        'intercept': round(float(final_model.intercept_), 5),
        'coefficients': coef_dict,
        'walk_forward_evaluation': {
            'evaluation_days': eval_days,
            'model_mae_requests': round(mae_model_counts, 2),
            'naive_baseline_mae_requests': round(mae_base_counts, 2),
            'model_mae_ratio': round(mae_model_ratio, 4),
            'naive_baseline_mae_ratio': round(mae_base_ratio, 4),
            'beats_baseline': beats_baseline,
            'improvement_percentage': round(pct_diff, 2)
        },
        'libraries': {
            'scikit_learn': sys.modules['sklearn'].__version__,
            'joblib': joblib.__version__,
            'pandas': pd.__version__,
            'numpy': np.__version__
        }
    }
    
    with open(MODEL_JSON, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
    print(f"[SAVE] Saved forecaster metadata to: {MODEL_JSON}")

if __name__ == '__main__':
    main()
