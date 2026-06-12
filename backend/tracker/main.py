import time
import csv
import json
import os
import sys
from datetime import datetime

# プロジェクトルートをsys.pathに追加
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from backend.tracker.monitor import get_active_app

DATA_DIR = os.path.join(ROOT, "data")
os.makedirs(DATA_DIR, exist_ok=True)

log_file = os.path.join(DATA_DIR, "log.csv")
current_file = os.path.join(DATA_DIR, "current.json")

last_app = None
start_time = None

while True:
    now = datetime.now()
    app = get_active_app()

    if last_app is None:
        last_app = app
        start_time = now
        with open(current_file, "w", encoding="utf-8") as f:
            json.dump({
                "current_app": last_app, 
                "previous_app": "-", 
                "start_time": start_time.strftime("%H:%M:%S"), 
                "start_timestamp": start_time.timestamp()
            }, f)

    elif app != last_app:
        end_time = now

        # 使用時間（秒）
        duration = (end_time - start_time).total_seconds()

        with open(log_file, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                start_time.strftime("%Y-%m-%d"),
                start_time.strftime("%H:%M:%S"),
                end_time.strftime("%H:%M:%S"),
                last_app,
                int(duration)  # 秒
            ])

        print(start_time.strftime("%Y-%m-%d"), start_time.strftime("%H:%M:%S"), "-", end_time.strftime("%H:%M:%S"), last_app, f"{int(duration)}秒")

        last_app = app
        start_time = now
        with open(current_file, "w", encoding="utf-8") as f:
            json.dump({
                "current_app": last_app, 
                "start_time": start_time.strftime("%H:%M:%S"), 
                "start_timestamp": start_time.timestamp()
            }, f)

    time.sleep(2)