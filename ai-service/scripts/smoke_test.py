"""
Smoke test runner for ClearFlow AI microservice.
Starts the Flask server on port 5005, issues requests to /health, /verify, and /predict,
records the responses verbatim, and shuts down the process cleanly.
"""

import os
import sys
import time
import subprocess
import requests
import json
import base64
from io import BytesIO
from PIL import Image

def make_test_b64(color=(220, 220, 220), noise=False):
    img = Image.new('RGB', (64, 64), color=color)
    if noise:
        pixels = img.load()
        for x in range(64):
            for y in range(64):
                if (x * y) % 5 == 0:
                    pixels[x, y] = (30, 30, 30)
    buf = BytesIO()
    img.save(buf, format='JPEG')
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode('utf-8')

def main():
    ai_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    python_exe = os.path.join(ai_dir, '.venv', 'Scripts', 'python.exe')
    app_py = os.path.join(ai_dir, 'app.py')
    
    port = 5005
    env = os.environ.copy()
    env['PORT'] = str(port)
    env['FLASK_ENV'] = 'production'
    
    print(f"[SMOKE] Starting Flask AI server on port {port}...")
    proc = subprocess.Popen([python_exe, app_py], cwd=ai_dir, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    base_url = f"http://127.0.0.1:{port}"
    
    # Wait for server to come up
    ready = False
    for attempt in range(15):
        try:
            r = requests.get(f"{base_url}/health", timeout=2)
            if r.status_code == 200:
                ready = True
                break
        except Exception:
            time.sleep(1)
            
    if not ready:
        print("[ERROR] Server failed to start within 15 seconds.")
        proc.kill()
        sys.exit(1)
        
    print("[SMOKE] Server is responsive. Recording smoke test calls:\n")
    
    # 1. GET /health
    print("=================== 1. GET /health ===================")
    r_health = requests.get(f"{base_url}/health", timeout=5)
    print(f"Status Code: {r_health.status_code}")
    print("Response JSON:")
    print(json.dumps(r_health.json(), indent=2))
    
    # 2. POST /verify
    print("\n=================== 2. POST /verify ===================")
    before_img = make_test_b64(color=(60, 60, 60), noise=True)
    after_img = make_test_b64(color=(240, 240, 240), noise=False)
    
    payload_verify = {
        'before_url': before_img,
        'after_url': after_img
    }
    r_verify = requests.post(f"{base_url}/verify", json=payload_verify, timeout=10)
    print(f"Status Code: {r_verify.status_code}")
    print("Response JSON:")
    print(json.dumps(r_verify.json(), indent=2))
    
    # 3. POST /predict
    print("\n=================== 3. POST /predict ===================")
    history = [
        {'date': f'2026-09-{i:02d}', 'count': 25 + (i % 6) * 4}
        for i in range(1, 22)
    ]
    r_predict = requests.post(f"{base_url}/predict", json={'history': history}, timeout=10)
    print(f"Status Code: {r_predict.status_code}")
    print("Response JSON:")
    print(json.dumps(r_predict.json(), indent=2))
    
    # Shutdown server
    print("\n[SMOKE] Shutting down test server...")
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()
    print("[SMOKE] Test server stopped successfully.")

if __name__ == '__main__':
    main()
