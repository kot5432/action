import time
import sys
import os
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


class EventTracker:
    def __init__(self, idle_threshold=300):
        self.idle_threshold = idle_threshold
        self.last_activity_time = time.time()
        self.is_idle = False
        self.event_queue = queue.Queue()

        # 現在のセッション情報（app_name, service, category, window_title）
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
        self.event_queue.put(('mouse_active', None))

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

    # ─── ウィンドウ変更監視 ──────────────────────────
    def check_window_change(self):
        while True:
            time.sleep(2)
            raw = get_active_app()  # "msedge.exe [YouTube - Microsoft Edge]"

            # app_name と window_title を分離
            if '[' in raw:
                app_name    = raw.split('[')[0].strip()
                window_title = raw.split('[', 1)[1].rstrip(']')
            else:
                app_name     = raw
                window_title = None

            # サービス名とカテゴリを解決
            service, category = resolve_service(app_name, window_title or "")

            # プライバシーモード: 機密サービスはマスク
            if PRIVACY_MODE and should_mask(service):
                service      = None
                window_title = '***'
                category     = "その他"

            # ウィンドウが変わったか (service 単位で判定)
            changed = (service != self.current_service or app_name != self.current_app)

            if changed:
                # 前のセッションを記録
                if self.current_app and self.session_start_time:
                    end_time = datetime.now()
                    duration = int((end_time - self.session_start_time).total_seconds())
                    insert_session(
                        self.session_start_time, end_time, duration,
                        self.current_app, self.current_service, self.current_category,
                    )

                # 遷移を記録 (同一サービスへの戻りは除外)
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

        Thread(target=self.check_idle, daemon=True).start()
        Thread(target=self.check_window_change, daemon=True).start()
        Thread(target=self.process_events, daemon=True).start()

        print("EventTracker started. Press Ctrl+C to stop.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nStopping EventTracker...")
            if PYNPUT_AVAILABLE:
                ml.stop()
                kl.stop()


if __name__ == "__main__":
    EventTracker().start()
