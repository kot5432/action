"""
テストデータ挿入スクリプト
過去のログを見れるようにするためのサンプルデータを挿入
"""

import sqlite3
from datetime import datetime, timedelta
import sys
import os

# モジュールパスを追加
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from core.config import config

# データベースパス
config.get_data_dir()
DB_PATH = config.DATABASE_PATH

def init_database():
    """データベース初期化"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # sessionsテーブル
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
    
    # categoriesテーブル
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT NOT NULL UNIQUE,
            color      TEXT,
            created_at DATETIME,
            updated_at DATETIME
        )
    ''')
    
    # デフォルトカテゴリの挿入
    default_categories = [
        ('開発', '#3b82f6'),
        ('学習', '#10b981'),
        ('娯楽', '#f59e0b'),
        ('SNS', '#f43f5e'),
        ('コミュニケーション', '#a78bfa'),
        ('その他', '#64748b'),
    ]
    
    for name, color in default_categories:
        cursor.execute('INSERT OR IGNORE INTO categories (name, color, created_at) VALUES (?, ?, datetime("now"))', (name, color))
    
    conn.commit()
    conn.close()

def insert_test_data():
    # データベース初期化
    init_database()
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # 今日の日付
    today = datetime.now()
    
    # 過去7日分のテストデータを作成
    test_sessions = [
        # 今日のデータ
        {
            'start_time': today.replace(hour=9, minute=0, second=0),
            'end_time': today.replace(hour=9, minute=30, second=0),
            'app_name': 'Visual Studio Code',
            'service': 'vscode',
            'category': '開発',
            'duration_seconds': 1800
        },
        {
            'start_time': today.replace(hour=9, minute=30, second=0),
            'end_time': today.replace(hour=10, minute=0, second=0),
            'app_name': 'Google Chrome',
            'service': 'github.com',
            'category': '開発',
            'duration_seconds': 1800
        },
        {
            'start_time': today.replace(hour=10, minute=0, second=0),
            'end_time': today.replace(hour=10, minute=15, second=0),
            'app_name': 'Google Chrome',
            'service': 'youtube.com',
            'category': '娯楽',
            'duration_seconds': 900
        },
        {
            'start_time': today.replace(hour=10, minute=15, second=0),
            'end_time': today.replace(hour=12, minute=0, second=0),
            'app_name': 'Visual Studio Code',
            'service': 'vscode',
            'category': '開発',
            'duration_seconds': 6300
        },
        {
            'start_time': today.replace(hour=12, minute=0, second=0),
            'end_time': today.replace(hour=13, minute=0, second=0),
            'app_name': 'Slack',
            'service': 'slack',
            'category': 'コミュニケーション',
            'duration_seconds': 3600
        },
        {
            'start_time': today.replace(hour=13, minute=0, second=0),
            'end_time': today.replace(hour=15, minute=0, second=0),
            'app_name': 'Visual Studio Code',
            'service': 'vscode',
            'category': '開発',
            'duration_seconds': 7200
        },
        {
            'start_time': today.replace(hour=15, minute=0, second=0),
            'end_time': today.replace(hour=15, minute=30, second=0),
            'app_name': 'Google Chrome',
            'service': 'twitter.com',
            'category': 'SNS',
            'duration_seconds': 1800
        },
        {
            'start_time': today.replace(hour=15, minute=30, second=0),
            'end_time': today.replace(hour=17, minute=0, second=0),
            'app_name': 'Visual Studio Code',
            'service': 'vscode',
            'category': '開発',
            'duration_seconds': 5400
        },
    ]
    
    # 昨日のデータ
    yesterday = today - timedelta(days=1)
    test_sessions.extend([
        {
            'start_time': yesterday.replace(hour=10, minute=0, second=0),
            'end_time': yesterday.replace(hour=12, minute=0, second=0),
            'app_name': 'Visual Studio Code',
            'service': 'vscode',
            'category': '開発',
            'duration_seconds': 7200
        },
        {
            'start_time': yesterday.replace(hour=12, minute=0, second=0),
            'end_time': yesterday.replace(hour=13, minute=0, second=0),
            'app_name': 'Google Chrome',
            'service': 'youtube.com',
            'category': '娯楽',
            'duration_seconds': 3600
        },
        {
            'start_time': yesterday.replace(hour=13, minute=0, second=0),
            'end_time': yesterday.replace(hour=15, minute=0, second=0),
            'app_name': 'Visual Studio Code',
            'service': 'vscode',
            'category': '開発',
            'duration_seconds': 7200
        },
        {
            'start_time': yesterday.replace(hour=15, minute=0, second=0),
            'end_time': yesterday.replace(hour=16, minute=0, second=0),
            'app_name': 'Google Chrome',
            'service': 'twitter.com',
            'category': 'SNS',
            'duration_seconds': 3600
        },
        {
            'start_time': yesterday.replace(hour=16, minute=0, second=0),
            'end_time': yesterday.replace(hour=18, minute=0, second=0),
            'app_name': 'Visual Studio Code',
            'service': 'vscode',
            'category': '開発',
            'duration_seconds': 7200
        },
    ])
    
    # 2日前のデータ
    day_before_yesterday = today - timedelta(days=2)
    test_sessions.extend([
        {
            'start_time': day_before_yesterday.replace(hour=9, minute=0, second=0),
            'end_time': day_before_yesterday.replace(hour=11, minute=0, second=0),
            'app_name': 'Visual Studio Code',
            'service': 'vscode',
            'category': '開発',
            'duration_seconds': 7200
        },
        {
            'start_time': day_before_yesterday.replace(hour=11, minute=0, second=0),
            'end_time': day_before_yesterday.replace(hour=12, minute=0, second=0),
            'app_name': 'Google Chrome',
            'service': 'stackoverflow.com',
            'category': '学習',
            'duration_seconds': 3600
        },
        {
            'start_time': day_before_yesterday.replace(hour=12, minute=0, second=0),
            'end_time': day_before_yesterday.replace(hour=14, minute=0, second=0),
            'app_name': 'Visual Studio Code',
            'service': 'vscode',
            'category': '開発',
            'duration_seconds': 7200
        },
        {
            'start_time': day_before_yesterday.replace(hour=14, minute=0, second=0),
            'end_time': day_before_yesterday.replace(hour=15, minute=0, second=0),
            'app_name': 'Google Chrome',
            'service': 'youtube.com',
            'category': '娯楽',
            'duration_seconds': 3600
        },
        {
            'start_time': day_before_yesterday.replace(hour=15, minute=0, second=0),
            'end_time': day_before_yesterday.replace(hour=17, minute=0, second=0),
            'app_name': 'Visual Studio Code',
            'service': 'vscode',
            'category': '開発',
            'duration_seconds': 7200
        },
    ])
    
    # データ挿入
    for session in test_sessions:
        cursor.execute('''
            INSERT INTO sessions (start_time, end_time, duration_seconds, app_name, service, category)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            session['start_time'].isoformat(),
            session['end_time'].isoformat(),
            session['duration_seconds'],
            session['app_name'],
            session['service'],
            session['category']
        ))
    
    conn.commit()
    print(f"挿入したセッション数: {len(test_sessions)}")
    print(f"データベース: {DB_PATH}")
    
    # 確認クエリ
    cursor.execute('SELECT COUNT(*) as count FROM sessions')
    count = cursor.fetchone()['count']
    print(f"総セッション数: {count}")
    
    conn.close()

if __name__ == '__main__':
    insert_test_data()
