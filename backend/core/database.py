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
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            pattern     TEXT NOT NULL,
            category    TEXT NOT NULL,
            priority    INTEGER DEFAULT 0,
            is_regex    BOOLEAN DEFAULT 0,
            enabled     BOOLEAN DEFAULT 1,
            created_at  DATETIME,
            updated_at  DATETIME
        )
    ''')

    # --- categories ---
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT NOT NULL UNIQUE,
            color      TEXT,
            created_at DATETIME,
            updated_at DATETIME
        )
    ''')

    # --- tags ---
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tags (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT NOT NULL UNIQUE,
            color      TEXT,
            created_at DATETIME
        )
    ''')

    # --- service_tags ---
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS service_tags (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            service     TEXT NOT NULL,
            tag_id      INTEGER,
            created_at  DATETIME,
                FOREIGN KEY (tag_id) REFERENCES tags(id),
                UNIQUE(service, tag_id)
        )
    ''')

    # --- settings ---
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT
        )
    ''')

    # --- notification_settings ---
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notification_settings (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            enabled     BOOLEAN DEFAULT 1,
            time        TEXT,
            last_sent   DATETIME,
            created_at  DATETIME,
            updated_at  DATETIME
        )
    ''')

    # --- session_blocks (セッション分割結果) ---
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS session_blocks (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            start_time       DATETIME NOT NULL,
            end_time         DATETIME NOT NULL,
            duration_seconds INTEGER,
            category         TEXT,
            is_focus         BOOLEAN DEFAULT 0,
            is_derail        BOOLEAN DEFAULT 0,
            focus_level      REAL,
            score_focus      REAL,
            score_derail     REAL,
            return_rate      REAL,
            date             DATE
        )
    ''')

    # --- focus_sessions (集中セッション) ---
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS focus_sessions (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            block_id         INTEGER,
            start_time       DATETIME NOT NULL,
            end_time         DATETIME NOT NULL,
            duration_seconds INTEGER,
            category         TEXT,
            return_rate      REAL,
                FOREIGN KEY (block_id) REFERENCES session_blocks(id)
        )
    ''')

    # --- derail_sessions (脱線セッション) ---
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS derail_sessions (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            block_id         INTEGER,
            start_time       DATETIME NOT NULL,
            end_time         DATETIME NOT NULL,
            duration_seconds INTEGER,
            from_category    TEXT,
            to_category      TEXT,
                FOREIGN KEY (block_id) REFERENCES session_blocks(id)
        )
    ''')

    # --- insights_cache (インサイトキャッシュ) ---
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS insights_cache (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            date             DATE NOT NULL,
            insight_type     TEXT,
            message          TEXT,
            metadata         TEXT,
            created_at       DATETIME,
                UNIQUE(date, insight_type)
        )
    ''')

    # --- daily_story (デイリーストーリー) ---
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS daily_story (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            date             DATE NOT NULL UNIQUE,
            story            TEXT,
            total_focus_minutes INTEGER,
            total_derail_count INTEGER,
            score            REAL,
            created_at       DATETIME
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
    # 新しいテーブルのインデックス
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_session_blocks_date     ON session_blocks(date)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_session_blocks_category ON session_blocks(category)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_focus_sessions_block_id ON focus_sessions(block_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_derail_sessions_block_id ON derail_sessions(block_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_insights_cache_date     ON insights_cache(date)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_daily_story_date       ON daily_story(date)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_category_rules_priority ON category_rules(priority)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_category_rules_enabled  ON category_rules(enabled)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_service_tags_service ON service_tags(service)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_service_tags_tag_id ON service_tags(tag_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_notification_settings_enabled ON notification_settings(enabled)')

    # category_rules にデフォルトデータを挿入
    _seed_category_rules(cursor)

    # categories にデフォルトデータを挿入
    _seed_categories(cursor)

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
    # 循環インポートを避けるために遅延インポート
    try:
        from backend.core.service_resolver import CATEGORY_RULES
        now = datetime.now()
        # 新しい構造に対応: pattern, category, priority, is_regex, enabled, created_at, updated_at
        cursor.executemany(
            "INSERT OR IGNORE INTO category_rules (pattern, category, priority, is_regex, enabled, created_at, updated_at) VALUES (?, ?, 0, 0, 1, ?, ?)",
            [(service, category, now, now) for service, category in CATEGORY_RULES.items()]
        )
    except ImportError:
        # service_resolverが利用できない場合はスキップ
        pass


def _seed_categories(cursor):
    """categories のデフォルト行を挿入（重複スキップ）"""
    default_categories = [
        ("開発", "#2563eb"),
        ("学習", "#16a34a"),
        ("娯楽", "#d97706"),
        ("SNS", "#f43f5e"),
        ("コミュニケーション", "#7c3aed"),
        ("その他", "#94a3b8"),
    ]
    now = datetime.now()
    cursor.executemany(
        "INSERT OR IGNORE INTO categories (name, color, created_at, updated_at) VALUES (?, ?, ?, ?)",
        [(name, color, now, now) for name, color in default_categories]
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


# ─────────────────────────────────────────────
# 行動スコアリング用ヘルパー関数
# ─────────────────────────────────────────────

def insert_session_block(start_time, end_time, duration_seconds, category,
                          is_focus=False, is_derail=False, focus_level=None,
                          score_focus=None, score_derail=None, return_rate=None, date=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO session_blocks (start_time, end_time, duration_seconds, category,
                                   is_focus, is_derail, focus_level, score_focus,
                                   score_derail, return_rate, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (start_time, end_time, duration_seconds, category, is_focus, is_derail,
          focus_level, score_focus, score_derail, return_rate, date))
    conn.commit()
    block_id = cursor.lastrowid
    conn.close()
    return block_id


def insert_focus_session(block_id, start_time, end_time, duration_seconds, category, return_rate=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO focus_sessions (block_id, start_time, end_time, duration_seconds, category, return_rate)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (block_id, start_time, end_time, duration_seconds, category, return_rate))
    conn.commit()
    focus_id = cursor.lastrowid
    conn.close()
    return focus_id


def insert_derail_session(block_id, start_time, end_time, duration_seconds, from_category, to_category):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO derail_sessions (block_id, start_time, end_time, duration_seconds, from_category, to_category)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (block_id, start_time, end_time, duration_seconds, from_category, to_category))
    conn.commit()
    derail_id = cursor.lastrowid
    conn.close()
    return derail_id


def upsert_insight_cache(date, insight_type, message, metadata=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO insights_cache (date, insight_type, message, metadata, created_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (date, insight_type, message, metadata, datetime.now()))
    conn.commit()
    conn.close()


def upsert_daily_story(date, story, total_focus_minutes=None, total_derail_count=None, score=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO daily_story (date, story, total_focus_minutes, total_derail_count, score, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (date, story, total_focus_minutes, total_derail_count, score, datetime.now()))
    conn.commit()
    conn.close()


def get_session_blocks_by_date(date):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM session_blocks WHERE date = ? ORDER BY start_time', (date,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_session_blocks(date):
    """セッションブロックを取得（エイリアス）"""
    return get_session_blocks_by_date(date)


def get_daily_story(date):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM daily_story WHERE date = ?', (date,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


# ─────────────────────────────────────────────
# Category Rules CRUD (新しい構造対応)
# ─────────────────────────────────────────────

def insert_category_rule(pattern, category, priority=0, is_regex=False, enabled=True):
    """新しいカテゴリルールを作成"""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now()
    cursor.execute('''
        INSERT INTO category_rules (pattern, category, priority, is_regex, enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (pattern, category, priority, is_regex, enabled, now, now))
    conn.commit()
    rule_id = cursor.lastrowid
    conn.close()
    return rule_id


def update_category_rule(rule_id, pattern=None, category=None, priority=None, is_regex=None, enabled=None):
    """カテゴリルールを更新"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    updates = []
    params = []
    
    if pattern is not None:
        updates.append("pattern = ?")
        params.append(pattern)
    if category is not None:
        updates.append("category = ?")
        params.append(category)
    if priority is not None:
        updates.append("priority = ?")
        params.append(priority)
    if is_regex is not None:
        updates.append("is_regex = ?")
        params.append(is_regex)
    if enabled is not None:
        updates.append("enabled = ?")
        params.append(enabled)
    
    updates.append("updated_at = ?")
    params.append(datetime.now())
    params.append(rule_id)
    
    cursor.execute(f'''
        UPDATE category_rules SET {", ".join(updates)} WHERE id = ?
    ''', params)
    conn.commit()
    conn.close()


def delete_category_rule(rule_id):
    """カテゴリルールを削除"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM category_rules WHERE id = ?', (rule_id,))
    conn.commit()
    conn.close()


def get_category_rules(enabled_only=True):
    """カテゴリルールを取得（優先度順）"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if enabled_only:
        cursor.execute('''
            SELECT * FROM category_rules 
            WHERE enabled = 1 
            ORDER BY priority DESC, created_at ASC
        ''')
    else:
        cursor.execute('''
            SELECT * FROM category_rules 
            ORDER BY priority DESC, created_at ASC
        ''')
    
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_category_rule(rule_id):
    """単一のカテゴリルールを取得"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM category_rules WHERE id = ?', (rule_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def test_category_rule(pattern, service_name, is_regex=False):
    """ルールがサービス名にマッチするかテスト"""
    if is_regex:
        import re
        try:
            return bool(re.search(pattern, service_name))
        except re.error:
            return False
    else:
        return pattern.lower() in service_name.lower()


# ─────────────────────────────────────────────
# Tags CRUD (行動タグ管理)
# ─────────────────────────────────────────────

def insert_tag(name, color=None):
    """新しいタグを作成"""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now()
    cursor.execute('''
        INSERT INTO tags (name, color, created_at)
        VALUES (?, ?, ?)
    ''', (name, color, now))
    conn.commit()
    tag_id = cursor.lastrowid
    conn.close()
    return tag_id


def update_tag(tag_id, name=None, color=None):
    """タグを更新"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    updates = []
    params = []
    
    if name is not None:
        updates.append("name = ?")
        params.append(name)
    if color is not None:
        updates.append("color = ?")
        params.append(color)
    
    if not updates:
        conn.close()
        return
    
    params.append(tag_id)
    
    cursor.execute(f'''
        UPDATE tags SET {", ".join(updates)} WHERE id = ?
    ''', params)
    conn.commit()
    conn.close()


def delete_tag(tag_id):
    """タグを削除（関連するservice_tagsも削除）"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 関連するservice_tagsを削除
    cursor.execute('DELETE FROM service_tags WHERE tag_id = ?', (tag_id,))
    # タグを削除
    cursor.execute('DELETE FROM tags WHERE id = ?', (tag_id,))
    
    conn.commit()
    conn.close()


def get_tags():
    """すべてのタグを取得"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM tags ORDER BY name')
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_tag(tag_id):
    """単一のタグを取得"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM tags WHERE id = ?', (tag_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def assign_tag_to_service(service, tag_id):
    """サービスにタグを割り当て"""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now()
    cursor.execute('''
        INSERT OR REPLACE INTO service_tags (service, tag_id, created_at)
        VALUES (?, ?, ?)
    ''', (service, tag_id, now))
    conn.commit()
    conn.close()


def remove_tag_from_service(service, tag_id):
    """サービスからタグを削除"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM service_tags WHERE service = ? AND tag_id = ?', (service, tag_id))
    conn.commit()
    conn.close()


def get_service_tags(service):
    """サービスのタグを取得"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT t.* FROM tags t
        JOIN service_tags st ON t.id = st.tag_id
        WHERE st.service = ?
        ORDER BY t.name
    ''', (service,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_tag_usage_stats(date=None):
    """タグ別の使用統計を取得"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if date:
        cursor.execute('''
            SELECT t.name, t.color, COUNT(*) as usage_count, 
                   SUM(s.duration_seconds) as total_duration
            FROM tags t
            JOIN service_tags st ON t.id = st.tag_id
            JOIN sessions s ON st.service = s.service
            WHERE DATE(s.start_time) = ?
            GROUP BY t.id
            ORDER BY usage_count DESC
        ''', (date,))
    else:
        cursor.execute('''
            SELECT t.name, t.color, COUNT(*) as usage_count,
                   SUM(s.duration_seconds) as total_duration
            FROM tags t
            JOIN service_tags st ON t.id = st.tag_id
            JOIN sessions s ON st.service = s.service
            GROUP BY t.id
            ORDER BY usage_count DESC
        ''')
    
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


# ─────────────────────────────────────────────
# Notification Settings CRUD (通知設定管理)
# ─────────────────────────────────────────────

def get_notification_settings():
    """通知設定を取得"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM notification_settings WHERE id = 1')
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def upsert_notification_settings(enabled=True, time=None):
    """通知設定を更新または作成"""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now()
    
    cursor.execute('''
        INSERT OR REPLACE INTO notification_settings (id, enabled, time, created_at, updated_at)
        VALUES (1, ?, ?, COALESCE((SELECT created_at FROM notification_settings WHERE id = 1), ?), ?)
    ''', (enabled, time, now, now))
    
    conn.commit()
    conn.close()


def update_last_sent():
    """最終送信時刻を更新"""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now()
    cursor.execute('UPDATE notification_settings SET last_sent = ? WHERE id = 1', (now,))
    conn.commit()
    conn.close()


def get_insights_cache(date):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM insights_cache WHERE date = ? ORDER BY created_at', (date,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]
