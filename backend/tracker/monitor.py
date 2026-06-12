import psutil
import win32gui
import win32process
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
