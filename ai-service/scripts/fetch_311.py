"""
Fetch NYC 311 daily service request volume by complaint type using Socrata SoQL API.
Maps municipal complaint types to ClearFlow facility service categories:
- Cleaning: 'UNSANITARY CONDITION', 'Dirty Condition', 'Graffiti'
- Plumbing: 'PLUMBING', 'WATER LEAK'
- Electrical: 'Street Light Condition', 'Traffic Signal Condition'
- Pest Control: 'Rodent'
- Gardening / Grounds: 'Damaged Tree', 'Overgrown Tree/Branches'
- Waste: 'Missed Collection', 'Illegal Dumping'
"""

import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
import pandas as pd
import requests

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / 'data' / 'processed'
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_CSV = PROCESSED_DIR / 'daily_counts.csv'

NYC_311_URL = 'https://data.cityofnewyork.us/resource/erm2-nwe9.json'

CATEGORY_MAP = {
    'UNSANITARY CONDITION': 'Cleaning',
    'Dirty Condition': 'Cleaning',
    'Graffiti': 'Cleaning',
    'PLUMBING': 'Plumbing',
    'WATER LEAK': 'Plumbing',
    'Street Light Condition': 'Electrical',
    'Traffic Signal Condition': 'Electrical',
    'Rodent': 'Pest Control',
    'Damaged Tree': 'Gardening',
    'Overgrown Tree/Branches': 'Gardening',
    'Missed Collection': 'Waste',
    'Illegal Dumping': 'Waste'
}

def generate_month_ranges(num_months=24):
    """Generate (start_str, end_str) pairs for the last num_months."""
    ranges = []
    # Anchor to 2026-10-01 as the latest full reference month
    now = datetime(2026, 10, 1)
    for i in range(num_months):
        end_date = now - timedelta(days=i * 30)
        # normalize to first of month
        m = end_date.month
        y = end_date.year
        # start of this month
        start_m = datetime(y, m, 1)
        # end of this month (start of next month)
        if m == 12:
            next_m = datetime(y + 1, 1, 1)
        else:
            next_m = datetime(y, m + 1, 1)
        
        s_str = start_m.strftime('%Y-%m-%dT00:00:00')
        e_str = next_m.strftime('%Y-%m-%dT00:00:00')
        if (s_str, e_str) not in ranges:
            ranges.append((s_str, e_str))
            
    ranges.sort()
    return ranges

def fetch_month_counts(start_str, end_str, max_retries=3):
    types_str = ", ".join([f"'{k}'" for k in CATEGORY_MAP.keys()])
    params = {
        '$select': 'date_trunc_ymd(created_date) as day, complaint_type, count(unique_key) as cnt',
        '$where': f"created_date >= '{start_str}' AND created_date < '{end_str}' AND complaint_type in ({types_str})",
        '$group': 'day, complaint_type',
        '$order': 'day ASC',
        '$limit': 5000
    }
    
    for attempt in range(1, max_retries + 1):
        try:
            r = requests.get(NYC_311_URL, params=params, timeout=35)
            if r.status_code == 200:
                return r.json()
            elif r.status_code == 429:
                print(f"  [429 Rate Limit] Backing off {attempt * 5}s...")
                time.sleep(attempt * 5)
            else:
                print(f"  [HTTP {r.status_code}] Attempt {attempt} failed: {r.text[:100]}")
                time.sleep(2)
        except Exception as e:
            print(f"  [Timeout/Error] Attempt {attempt} for {start_str[:10]}: {e}")
            time.sleep(3)
            
    return None

def main():
    print("=========================================================")
    print("Fetching NYC 311 Daily Service Request Volumes via SoQL")
    print("=========================================================")
    
    month_ranges = generate_month_ranges(24)
    print(f"[INFO] Fetching {len(month_ranges)} months of daily aggregates ({month_ranges[0][0][:10]} to {month_ranges[-1][1][:10]})...")
    
    all_rows = []
    failed_months = 0
    
    for idx, (s, e) in enumerate(month_ranges, 1):
        print(f"[{idx}/{len(month_ranges)}] Fetching {s[:10]} to {e[:10]}...", end=" ", flush=True)
        t0 = time.time()
        records = fetch_month_counts(s, e)
        if records:
            print(f"OK ({len(records)} records, {round(time.time() - t0, 2)}s)")
            for r in records:
                day_raw = r.get('day', '')
                day_clean = day_raw.split('T')[0] if 'T' in day_raw else day_raw[:10]
                ctype = r.get('complaint_type', 'Other')
                cnt = int(r.get('cnt', 0))
                all_rows.append({
                    'date': day_clean,
                    'complaint_type': ctype,
                    'category': CATEGORY_MAP.get(ctype, 'Other'),
                    'count': cnt
                })
        else:
            print(f"FAILED")
            failed_months += 1
            
        # Polite pause
        time.sleep(0.5)

    if not all_rows:
        print("[ERROR] API fetch completely failed. Unable to produce daily_counts.csv.")
        sys.exit(1)

    print(f"\n[INFO] Total raw record slices retrieved: {len(all_rows)}")
    df_raw = pd.DataFrame(all_rows)
    
    # Pivot to daily totals and category breakdowns
    daily_totals = df_raw.groupby('date')['count'].sum().reset_index().rename(columns={'count': 'total_requests'})
    
    # Category pivot
    cat_pivot = df_raw.pivot_table(index='date', columns='category', values='count', aggfunc='sum', fill_value=0).reset_index()
    
    merged = pd.merge(daily_totals, cat_pivot, on='date', how='left').sort_values('date').reset_index(drop=True)
    
    merged.to_csv(OUTPUT_CSV, index=False)
    print(f"[SUCCESS] Saved {len(merged)} daily rows to: {OUTPUT_CSV}")
    print(f"[PREVIEW] Head of daily_counts.csv:")
    print(merged.head())
    print(f"[PREVIEW] Tail of daily_counts.csv:")
    print(merged.tail())
    print(f"[SUMMARY] Total requests aggregated: {merged['total_requests'].sum():,}")

if __name__ == '__main__':
    main()
