import sqlite3
import os
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(ROOT, "data")
DB_PATH = os.path.join(DATA_DIR, "action_tracker.db")


def get_db_connection():
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_database():
    """
    DBとテーブルを初期化する。
    スキーマ変更時は既存テーブルを再作成する。
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # スキーマバージョン管理: service カラムがなければ再作成
    _migrate_if_needed(cursor)

    # --- events ---
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp     DATETIME NOT NULL,
            event_type    TEXT NOT NULL,
            app_name      TEXT,
            service       TEXT,
            category      TEXT,
            window_title  TEXT,
            metadata      TEXT
        )
    ''')

    # --- sessions ---
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            start_time       DATETIME NOT NULL,
            end_time         DATETIME NOT NULL,
            duration_seconds INTEGER,
            app_name         TEXT,
            service          TEXT,
            category         TEXT
        )
    ''')

    # --- transitions ---
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transitions (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp      DATETIME,
            from_service   TEXT,
            to_service     TEXT,
            from_category  TEXT,
            to_category    TEXT
        )
    ''')

    # --- category_rules ---
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS category_rules (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            service  TEXT UNIQUE,
            category TEXT
        )
    ''')

    # インデックス
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_events_timestamp   ON events(timestamp)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_events_service      ON events(service)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_events_category     ON events(category)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_service    ON sessions(service)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_trans_timestamp     ON transitions(timestamp)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_trans_services      ON transitions(from_service, to_service)')

    # category_rules にデフォルトデータを挿入
    _seed_category_rules(cursor)

    conn.commit()
    conn.close()
    print(f"Database initialized at {DB_PATH}")


def _migrate_if_needed(cursor):
    """
    旧スキーマ（domain カラム）が残っている場合はテーブルを削除して再作成させる。
    """
    try:
        cursor.execute("PRAGMA table_info(events)")
        columns = [row[1] for row in cursor.fetchall()]
        if columns and "service" not in columns:
            # 旧スキーマ検出: 全テーブルを削除
            for tbl in ("events", "sessions", "transitions", "category_rules"):
                cursor.execute(f"DROP TABLE IF EXISTS {tbl}")
            print("[migration] Dropped old schema tables (domain → service)")
    except Exception:
        pass


def _seed_category_rules(cursor):
    """category_rules のデフォルト行を挿入（重複スキップ）"""
    from backend.core.service_resolver import CATEGORY_RULES
    cursor.executemany(
        "INSERT OR IGNORE INTO category_rules (service, category) VALUES (?, ?)",
        list(CATEGORY_RULES.items())
    )


# ─────────────────────────────────────────────
# CRUD ヘルパー
# ─────────────────────────────────────────────

def insert_event(event_type, app_name, service=None, category=None,
                 window_title=None, metadata=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO events (timestamp, event_type, app_name, service, category, window_title, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (datetime.now(), event_type, app_name, service, category, window_title, metadata))
    conn.commit()
    event_id = cursor.lastrowid
    conn.close()
    return event_id


def insert_session(start_time, end_time, duration_seconds,
                   app_name, service=None, category=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO sessions (start_time, end_time, duration_seconds, app_name, service, category)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (start_time, end_time, duration_seconds, app_name, service, category))
    conn.commit()
    session_id = cursor.lastrowid
    conn.close()
    return session_id


def insert_transition(timestamp, from_service, to_service,
                      from_category=None, to_category=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO transitions (timestamp, from_service, to_service, from_category, to_category)
        VALUES (?, ?, ?, ?, ?)
    ''', (timestamp, from_service, to_service, from_category, to_category))
    conn.commit()
    conn.close()


def upsert_category_rule(service, category):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO category_rules (service, category) VALUES (?, ?)
    ''', (service, category))
    conn.commit()
    conn.close()


def get_category_by_service(service):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT category FROM category_rules WHERE service = ?', (service,))
    row = cursor.fetchone()
    conn.close()
    return row['category'] if row else None
