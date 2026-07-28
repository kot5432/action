"""
データベース操作のテスト
"""
import pytest
import sys
import os
import sqlite3
from datetime import datetime

# プロジェクトルートをパスに追加
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.core.database import init_database, get_db_connection


@pytest.fixture
def test_db():
    """テスト用データベースのセットアップ"""
    # テスト用のデータベースパスを設定
    test_db_path = ":memory:"
    
    # テスト用データベースを初期化
    conn = sqlite3.connect(test_db_path)
    conn.row_factory = sqlite3.Row
    
    # datetimeアダプターを設定
    sqlite3.register_adapter(datetime, lambda x: x.isoformat())
    sqlite3.register_converter("DATETIME", lambda x: datetime.fromisoformat(x.decode()))
    
    # テーブルを作成
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            start_time DATETIME NOT NULL,
            end_time DATETIME NOT NULL,
            duration_seconds INTEGER,
            app_name TEXT,
            service TEXT,
            category TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transitions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME,
            from_service TEXT,
            to_service TEXT,
            from_category TEXT,
            to_category TEXT
        )
    ''')
    
    conn.commit()
    
    yield conn
    
    # テスト後にクリーンアップ
    conn.close()


def test_database_connection():
    """データベース接続のテスト"""
    conn = get_db_connection()
    assert conn is not None
    conn.close()


def test_insert_session(test_db):
    """セッション挿入のテスト"""
    cursor = test_db.cursor()
    
    cursor.execute('''
        INSERT INTO sessions (start_time, end_time, duration_seconds, app_name, service, category)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (datetime.now(), datetime.now(), 60, "TestApp", "test.com", "開発"))
    
    test_db.commit()
    
    cursor.execute('SELECT * FROM sessions WHERE app_name = ?', ("TestApp",))
    result = cursor.fetchone()
    
    assert result is not None
    assert result['app_name'] == "TestApp"
    assert result['service'] == "test.com"
    assert result['category'] == "開発"


def test_insert_transition(test_db):
    """遷移挿入のテスト"""
    cursor = test_db.cursor()
    
    cursor.execute('''
        INSERT INTO transitions (timestamp, from_service, to_service, from_category, to_category)
        VALUES (?, ?, ?, ?, ?)
    ''', (datetime.now(), "github.com", "stackoverflow.com", "開発", "開発"))
    
    test_db.commit()
    
    cursor.execute('SELECT * FROM transitions WHERE from_service = ?', ("github.com",))
    result = cursor.fetchone()
    
    assert result is not None
    assert result['from_service'] == "github.com"
    assert result['to_service'] == "stackoverflow.com"


def test_query_with_date_filter(test_db):
    """日付フィルター付きクエリのテスト"""
    cursor = test_db.cursor()
    
    # 今日のデータを挿入
    today = datetime.now()
    cursor.execute('''
        INSERT INTO sessions (start_time, end_time, duration_seconds, app_name, service, category)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (today, today, 60, "TestApp", "test.com", "開発"))
    
    # 昨日のデータを挿入
    yesterday = datetime.now().replace(day=today.day - 1)
    cursor.execute('''
        INSERT INTO sessions (start_time, end_time, duration_seconds, app_name, service, category)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (yesterday, yesterday, 60, "TestApp2", "test2.com", "娯楽"))
    
    test_db.commit()
    
    # 今日のデータをクエリ
    today_str = today.strftime("%Y-%m-%d")
    cursor.execute('''
        SELECT * FROM sessions WHERE DATE(start_time) = ?
    ''', (today_str,))
    
    results = cursor.fetchall()
    assert len(results) == 1
    assert results[0]['app_name'] == "TestApp"


def test_aggregate_query(test_db):
    """集計クエリのテスト"""
    cursor = test_db.cursor()
    
    # 複数のセッションを挿入
    for i in range(5):
        cursor.execute('''
            INSERT INTO sessions (start_time, end_time, duration_seconds, app_name, service, category)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (datetime.now(), datetime.now(), 60 * (i + 1), f"App{i}", f"service{i}.com", "開発"))
    
    test_db.commit()
    
    # 集計クエリ
    cursor.execute('''
        SELECT SUM(duration_seconds) as total, COUNT(*) as count FROM sessions
    ''')
    
    result = cursor.fetchone()
    assert result['total'] == 60 + 120 + 180 + 240 + 300  # 900秒
    assert result['count'] == 5
