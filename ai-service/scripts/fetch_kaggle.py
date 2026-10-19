"""
Fetch public datasets from Kaggle using kagglehub.
Downloads:
1. cdawn1/messy-vs-clean-room
2. faizalkarim/cleandirty-road-classification
"""

import os
import shutil
import sys
from pathlib import Path

VALID_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}

def count_images_in_dir(directory: Path):
    """Recursively count valid image files by extension."""
    counts = {}
    total = 0
    if not directory.exists():
        return counts, 0
    for root, _, files in os.walk(directory):
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in VALID_EXTENSIONS:
                rel = os.path.relpath(root, directory)
                counts[rel] = counts.get(rel, 0) + 1
                total += 1
    return counts, total

def check_credentials():
    """Check if Kaggle API credentials exist without printing contents."""
    has_env = bool(os.environ.get('KAGGLE_API_TOKEN') or (os.environ.get('KAGGLE_USERNAME') and os.environ.get('KAGGLE_KEY')))
    user_home = Path.home()
    kaggle_json = user_home / '.kaggle' / 'kaggle.json'
    has_file = kaggle_json.exists()
    return has_env, has_file

def main():
    base_dir = Path(__file__).resolve().parent.parent
    target_dir = base_dir / 'data' / 'raw' / 'public'
    target_dir.mkdir(parents=True, exist_ok=True)
    
    datasets = [
        ("cdawn1/messy-vs-clean-room", "cdawn1_messy_vs_clean_room"),
        ("faizalkarim/cleandirty-road-classification", "faizalkarim_cleandirty_road_classification"),
        ("asdasdasasdas/garbage-classification", "asdasdasasdas_garbage_classification"),
        ("mostafaabla/garbage-classification", "mostafaabla_garbage_classification")
    ]
    
    import kagglehub
    
    for slug, dest_name in datasets:
        print(f"\n==========================================")
        print(f"Fetching dataset: {slug}")
        print(f"==========================================")
        try:
            download_path = kagglehub.dataset_download(slug)
            print(f"[SUCCESS] Downloaded to cache: {download_path}")
            
            dest_path = target_dir / dest_name
            if dest_path.exists():
                print(f"[INFO] Destination {dest_path} already exists, refreshing...")
                shutil.rmtree(dest_path)
            
            shutil.copytree(download_path, dest_path)
            print(f"[SUCCESS] Copied to target: {dest_path}")
            
            subcounts, total = count_images_in_dir(dest_path)
            print(f"[IMAGE_COUNTS] Total images in {dest_name}: {total}")
            for sub, cnt in sorted(subcounts.items()):
                print(f"   - {sub}: {cnt} images")
                
        except Exception as e:
            print(f"[ERROR] Failed to fetch {slug}: {e}")
            has_env, has_file = check_credentials()
            print(f"[CREDENTIAL_CHECK] KAGGLE_API_TOKEN in env: {has_env}, kaggle.json exists: {has_file}")
            print(f"[STATUS] {slug} marked as UNAVAILABLE in this session.")

if __name__ == '__main__':
    main()
