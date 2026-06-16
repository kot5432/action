import time
import sys
import os
from datetime import datetime
from pynput import mouse, keyboard
from threading import Thread
import queue

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from backend.tracker.monitor import get_active_app
from backend.core.database import insert_event
from backend.core.domain_extractor import extract_domain, mask_sensitive_info

# プライバシーモード設定
PRIVACY_MODE = True

def should_mask_domain(domain):
    """
    プライバシーモード対象のドメインか判定
    """
    if not PRIVACY_MODE or not domain:
        return False
    
    privacy_domains = [
        'bank', 'securities', 'finance', 'password', 'vault',
        '1password', 'bitwarden', 'lastpass'
    ]
    
    domain_lower = domain.lower()
    for privacy_domain in privacy_domains:
        if privacy_domain in domain_lower:
            return True
    
    return False

class EventTracker:
    def __init__(self, idle_threshold=300):  # 5分でアイドル判定
        self.idle_threshold = idle_threshold
        self.last_activity_time = time.time()
        self.is_idle = False
        self.event_queue = queue.Queue()
        self.current_app = None
        self.current_window_title = None
        self.current_domain = None
        self.session_start_time = None
        
    def on_mouse_move(self, x, y):
        """マウス移動イベント"""
        self.last_activity_time = time.time()
        if self.is_idle:
            self.is_idle = False
            self.event_queue.put(('idle_end', None))
        self.event_queue.put(('mouse_active', None))
    
    def on_mouse_click(self, x, y, button, pressed):
        """マウスクリックイベント"""
        self.last_activity_time = time.time()
        if self.is_idle:
            self.is_idle = False
            self.event_queue.put(('idle_end', None))
        self.event_queue.put(('mouse_active', None))
    
    def on_key_press(self, key):
        """キーボード押下イベント"""
        self.last_activity_time = time.time()
        if self.is_idle:
            self.is_idle = False
            self.event_queue.put(('idle_end', None))
        self.event_queue.put(('keyboard_active', None))
    
    def check_idle(self):
        """アイドル状態をチェック"""
        while True:
            time.sleep(10)  # 10秒ごとにチェック
            idle_duration = time.time() - self.last_activity_time
            if idle_duration > self.idle_threshold and not self.is_idle:
                self.is_idle = True
                self.event_queue.put(('idle_start', None))
    
    def check_window_change(self):
        """ウィンドウ変更をチェック"""
        while True:
            time.sleep(2)  # 2秒ごとにチェック
            app_info = get_active_app()
            
            # アプリ名とウィンドウタイトルを分離
            if '[' in app_info:
                app_name = app_info.split('[')[0].strip()
                window_title = app_info.split('[')[1].rstrip(']')
            else:
                app_name = app_info
                window_title = None
            
            # ドメインを抽出
            domain = extract_domain(window_title) if window_title else None
            
            # プライバシーモード: 機密ドメインをマスク
            if should_mask_domain(domain):
                domain = None
                window_title = '***'
            
            # ウィンドウが変更された場合
            if app_name != self.current_app or window_title != self.current_window_title:
                if self.current_app:
                    # 前のセッションを記録
                    if self.session_start_time:
                        end_time = datetime.now()
                        duration = int((end_time - self.session_start_time).total_seconds())
                        from backend.core.database import insert_session
                        insert_session(
                            self.session_start_time,
                            end_time,
                            duration,
                            self.current_app,
                            self.current_domain
                        )
                    
                    # 遷移を記録
                    if self.current_app and app_name != self.current_app:
                        from backend.core.database import insert_transition
                        insert_transition(
                            datetime.now(),
                            self.current_app,
                            self.current_domain,
                            app_name,
                            domain
                        )
                
                # 新しいウィンドウ変更イベント
                self.event_queue.put(('window_changed', {
                    'app_name': app_name,
                    'window_title': window_title,
                    'domain': domain
                }))
                
                self.current_app = app_name
                self.current_window_title = window_title
                self.current_domain = domain
                self.session_start_time = datetime.now()
    
    def process_events(self):
        """イベントを処理してデータベースに保存"""
        while True:
            try:
                event_type, event_data = self.event_queue.get(timeout=1)
                
                if event_type == 'window_changed':
                    insert_event(
                        event_type,
                        event_data['app_name'],
                        event_data['window_title'],
                        event_data['domain']
                    )
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] Window changed: {event_data['app_name']}")
                
                elif event_type in ['mouse_active', 'keyboard_active']:
                    insert_event(event_type, self.current_app, self.current_window_title, self.current_domain)
                
                elif event_type == 'idle_start':
                    insert_event('idle_start', self.current_app, self.current_window_title, self.current_domain)
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] Idle started")
                
                elif event_type == 'idle_end':
                    insert_event('idle_end', self.current_app, self.current_window_title, self.current_domain)
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] Idle ended")
                
            except queue.Empty:
                continue
    
    def start(self):
        """トラッキングを開始"""
        print("Starting EventTracker...")
        
        # マウスリスナー
        mouse_listener = mouse.Listener(
            on_move=self.on_mouse_move,
            on_click=self.on_mouse_click
        )
        mouse_listener.start()
        
        # キーボードリスナー
        keyboard_listener = keyboard.Listener(on_press=self.on_key_press)
        keyboard_listener.start()
        
        # アイドルチェックスレッド
        idle_thread = Thread(target=self.check_idle, daemon=True)
        idle_thread.start()
        
        # ウィンドウ変更チェックスレッド
        window_thread = Thread(target=self.check_window_change, daemon=True)
        window_thread.start()
        
        # イベント処理スレッド
        process_thread = Thread(target=self.process_events, daemon=True)
        process_thread.start()
        
        print("EventTracker started. Press Ctrl+C to stop.")
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nStopping EventTracker...")
            mouse_listener.stop()
            keyboard_listener.stop()

if __name__ == "__main__":
    tracker = EventTracker()
    tracker.start()
