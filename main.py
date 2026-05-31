import time
import csv
import json
import psutil
import win32gui
import win32process
from datetime import datetime

import re

def get_active_app():
    hwnd = win32gui.GetForegroundWindow()
    window_title = win32gui.GetWindowText(hwnd)
    _, pid = win32process.GetWindowThreadProcessId(hwnd)
    try:
        process = psutil.Process(pid)
        app_name = process.name()
        if window_title:
            # Edge特有の「および他〇〇ページ」やブラウザ名を綺麗に削る
            clean_title = re.sub(r'\s*および他\s*\d+\s*ページ.*', '', window_title)
            clean_title = re.sub(r'\s*-\s*Google Chrome$', '', clean_title)
            clean_title = re.sub(r'\s*-\s*Microsoft\s*Edge.*$', '', clean_title)
            
            # タイトルが長い場合は少し省略する
            short_title = clean_title[:40] + "..." if len(clean_title) > 40 else clean_title
            return f"{app_name} [{short_title}]"
        return app_name
    except:
        return "Unknown"

last_app = None
start_time = None

while True:
    now = datetime.now()
    app = get_active_app()

    if last_app is None:
        last_app = app
        start_time = now
        with open("current.json", "w", encoding="utf-8") as f:
            json.dump({"current_app": last_app, "previous_app": "-", "start_time": start_time.strftime("%H:%M:%S"), "start_timestamp": start_time.timestamp()}, f)

    elif app != last_app:
        end_time = now

        # 使用時間（秒）
        duration = (end_time - start_time).total_seconds()

        with open("log.csv", "a", newline="", encoding="utf-8") as f:
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
        with open("current.json", "w", encoding="utf-8") as f:
            json.dump({"current_app": last_app, "start_time": start_time.strftime("%H:%M:%S"), "start_timestamp": start_time.timestamp()}, f)

    time.sleep(2)