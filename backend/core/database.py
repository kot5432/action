import sqlite3
import os
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(ROOT, "data")
DB_PATH = os.path.join(DATA_DIR, "action_tracker.db")

def get_db_connection():
    """SQLiteデータベース接続を取得"""
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    """データベースとテーブルを初期化"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # eventsテーブル
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME NOT NULL,
            event_type TEXT NOT NULL,
            app_name TEXT,
            window_title TEXT,
            domain TEXT,
            metadata TEXT
        )
    ''')
    
    # sessionsテーブル
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            start_time DATETIME NOT NULL,
            end_time DATETIME NOT NULL,
            duration_seconds INTEGER,
            app_name TEXT,
            domain TEXT
        )
    ''')
    
    # transitionsテーブル
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transitions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME,
            from_app TEXT,
            from_domain TEXT,
            to_app TEXT,
            to_domain TEXT
        )
    ''')
    
    # category_rulesテーブル
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS category_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain TEXT,
            category TEXT
        )
    ''')
    
    # インデックス作成
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_transitions_timestamp ON transitions(timestamp)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_category_rules_domain ON category_rules(domain)')
    
    conn.commit()
    conn.close()
    print(f"Database initialized at {DB_PATH}")

def insert_event(event_type, app_name, window_title=None, domain=None, metadata=None):
    """イベントをinsert"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO events (timestamp, event_type, app_name, window_title, domain, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (datetime.now(), event_type, app_name, window_title, domain, metadata))
    conn.commit()
    event_id = cursor.lastrowid
    conn.close()
    return event_id

def insert_session(start_time, end_time, duration_seconds, app_name, domain=None):
    """セッションをinsert"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO sessions (start_time, end_time, duration_seconds, app_name, domain)
        VALUES (?, ?, ?, ?, ?)
    ''', (start_time, end_time, duration_seconds, app_name, domain))
    conn.commit()
    session_id = cursor.lastrowid
    conn.close()
    return session_id

def insert_transition(timestamp, from_app, from_domain, to_app, to_domain):
    """遷移をinsert"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO transitions (timestamp, from_app, from_domain, to_app, to_domain)
        VALUES (?, ?, ?, ?, ?)
    ''', (timestamp, from_app, from_domain, to_app, to_domain))
    conn.commit()
    conn.close()

def upsert_category_rule(domain, category):
    """カテゴリルールをupsert"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO category_rules (domain, category)
        VALUES (?, ?)
    ''', (domain, category))
    conn.commit()
    conn.close()

def get_category_by_domain(domain):
    """ドメインからカテゴリを取得"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT category FROM category_rules WHERE domain = ?', (domain,))
    row = cursor.fetchone()
    conn.close()
    return row['category'] if row else None

if __name__ == "__main__":
    init_database()
    
    # サンプルカテゴリルールの挿入
    sample_rules = [
        ("github.com", "開発"),
        ("gitlab.com", "開発"),
        ("stackoverflow.com", "開発"),
        ("chatgpt.com", "学習"),
        ("youtube.com", "娯楽"),
        ("twitter.com", "SNS"),
        ("x.com", "SNS"),
        ("facebook.com", "SNS"),
        ("instagram.com", "SNS"),
        ("linkedin.com", "SNS"),
        ("gmail.com", "コミュニケーション"),
        ("outlook.com", "コミュニケーション"),
        ("slack.com", "コミュニケーション"),
        ("discord.com", "コミュニケーション"),
    ]
    
    for domain, category in sample_rules:
        upsert_category_rule(domain, category)
    
    print("Sample category rules inserted")
