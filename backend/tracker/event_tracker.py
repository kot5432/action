import time
import sys
import os
import json
from datetime import datetime
from threading import Thread
import queue

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from backend.tracker.monitor import get_active_app
from backend.core.database import insert_event, insert_session, insert_transition
from backend.core.service_resolver import resolve_service, should_mask

try:
    from pynput import mouse, keyboard
    PYNPUT_AVAILABLE = True
except ImportError:
    PYNPUT_AVAILABLE = False


PRIVACY_MODE = True
STATE_FILE = os.path.join(ROOT, "data", "current_session.json")


def _write_state(app_name, service, category, session_start_time):
    """現在のセッション状態をJSONファイルに書き出す（APIが読み込　）"""
    try:
        os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
        now = datetime.now()
        duration_sec = int((now - session_start_time).total_seconds()) if session_start_time else 0
        state = {
            "app_name":         app_name,
            "service":          service,
            "category":         category,
            "session_start":    session_start_time.isoformat() if session_start_time else None,
            "duration_seconds": duration_sec,
            "updated_at":       now.isoformat(),
        }
        tmp = STATE_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False)
        os.replace(tmp, STATE_FILE)
    except Exception:
        pass


class EventTracker:
    def __init__(self, idle_threshold=300):
        self.idle_threshold = idle_threshold
        self.last_activity_time = time.time()
        self.is_idle = False
        self.event_queue = queue.Queue()

        self.current_app = None
        self.current_service = None
        self.current_category = None
        self.current_window_title = None
        self.session_start_time = None

    # ─── 入力イベント ───────────────────────────────
    def _activity(self):
        self.last_activity_time = time.time()
        if self.is_idle:
            self.is_idle = False
            self.event_queue.put(('idle_end', None))

    def on_mouse_move(self, x, y):
        self._activity()

    def on_mouse_click(self, x, y, button, pressed):
        self._activity()
        self.event_queue.put(('mouse_active', None))

    def on_key_press(self, key):
        self._activity()
        self.event_queue.put(('keyboard_active', None))

    # ─── アイドル監視 ────────────────────────────────
    def check_idle(self):
        while True:
            time.sleep(10)
            if time.time() - self.last_activity_time > self.idle_threshold and not self.is_idle:
                self.is_idle = True
                self.event_queue.put(('idle_start', None))

    # ─── 状態ファイル定期書き込み ─────────────────────
    def flush_state(self):
        """2秒ごとに現在セッションをファイルへ書き出す"""
        while True:
            time.sleep(2)
            if self.current_app and self.session_start_time:
                _write_state(
                    self.current_app,
                    self.current_service,
                    self.current_category,
                    self.session_start_time,
                )

    # ─── ウィンドウ変更監視 ──────────────────────────
    def check_window_change(self):
        while True:
            time.sleep(2)
            raw = get_active_app()

            if '[' in raw:
                app_name     = raw.split('[')[0].strip()
                window_title = raw.split('[', 1)[1].rstrip(']')
            else:
                app_name     = raw
                window_title = None

            service, category = resolve_service(app_name, window_title or "")

            if PRIVACY_MODE and should_mask(service):
                service      = None
                window_title = '***'
                category     = "その他"

            changed = (service != self.current_service or app_name != self.current_app)

            if changed:
                if self.current_app and self.session_start_time:
                    end_time = datetime.now()
                    duration = int((end_time - self.session_start_time).total_seconds())
                    insert_session(
                        self.session_start_time, end_time, duration,
                        self.current_app, self.current_service, self.current_category,
                    )

                if self.current_service and service and self.current_service != service:
                    insert_transition(
                        datetime.now(),
                        self.current_service, service,
                        self.current_category, category,
                    )

                self.event_queue.put(('window_changed', {
                    'app_name':     app_name,
                    'service':      service,
                    'category':     category,
                    'window_title': window_title,
                }))

                self.current_app          = app_name
                self.current_service      = service
                self.current_category     = category
                self.current_window_title = window_title
                self.session_start_time   = datetime.now()

                # ウィンドウ切替時は即時書き込み
                _write_state(app_name, service, category, self.session_start_time)

    # ─── イベント処理 ────────────────────────────────
    def process_events(self):
        while True:
            try:
                event_type, data = self.event_queue.get(timeout=1)
                ts = datetime.now().strftime('%H:%M:%S')

                if event_type == 'window_changed':
                    insert_event(
                        event_type,
                        data['app_name'],
                        data['service'],
                        data['category'],
                        data['window_title'],
                    )
                    svc = data['service'] or data['app_name']
                    print(f"[{ts}] {svc} ({data['category']})")

                elif event_type in ('mouse_active', 'keyboard_active'):
                    insert_event(event_type, self.current_app,
                                 self.current_service, self.current_category,
                                 self.current_window_title)

                elif event_type == 'idle_start':
                    insert_event('idle_start', self.current_app,
                                 self.current_service, self.current_category)
                    print(f"[{ts}] Idle started")

                elif event_type == 'idle_end':
                    insert_event('idle_end', self.current_app,
                                 self.current_service, self.current_category)
                    print(f"[{ts}] Idle ended")

            except queue.Empty:
                continue

    # ─── 起動 ────────────────────────────────────────
    def start(self):
        print("Starting EventTracker (service-based schema)...")

        if PYNPUT_AVAILABLE:
            ml = mouse.Listener(on_move=self.on_mouse_move, on_click=self.on_mouse_click)
            kl = keyboard.Listener(on_press=self.on_key_press)
            ml.start()
            kl.start()

        Thread(target=self.check_idle,        daemon=True).start()
        Thread(target=self.check_window_change, daemon=True).start()
        Thread(target=self.process_events,    daemon=True).start()
        Thread(target=self.flush_state,       daemon=True).start()

        print("EventTracker started. Press Ctrl+C to stop.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nStopping EventTracker...")
            # 終了時にセッションを保存
            if self.current_app and self.session_start_time:
                end_time = datetime.now()
                duration = int((end_time - self.session_start_time).total_seconds())
                insert_session(
                    self.session_start_time, end_time, duration,
                    self.current_app, self.current_service, self.current_category,
                )
            # 状態ファイルを削除
            try:
                os.remove(STATE_FILE)
            except FileNotFoundError:
                pass
            if PYNPUT_AVAILABLE:
                ml.stop()
                kl.stop()


if __name__ == "__main__":
    EventTracker().start()
