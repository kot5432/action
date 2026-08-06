from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from typing import Optional
import sqlite3
import os

# 設定管理
from backend.core.config import config

# データベース初期化
config.get_data_dir()
DB_PATH = config.DATABASE_PATH

def init_database():
    """MVP用データベース初期化"""
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

# データベース初期化実行
init_database()

# データベース接続
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# メインアプリケーション
app = FastAPI(
    title="ActionTracker MVP API",
    version="1.0.0",
    description="行動追跡API MVP"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ヘルスチェック
@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

# ダッシュボード
@app.get("/dashboard")
def get_dashboard():
    """
    ダッシュボードデータを取得
    Response: {current_session, today_summary}
    """
    conn = get_db()
    cur = conn.cursor()
    
    # 現在のセッション
    cur.execute('''
        SELECT app_name, service, category, start_time
        FROM sessions
        WHERE end_time IS NULL
        ORDER BY start_time DESC
        LIMIT 1
    ''')
    current = cur.fetchone()
    
    # 今日のサマリー
    today = datetime.now().strftime("%Y-%m-%d")
    cur.execute('''
        SELECT 
            COALESCE(SUM(duration_seconds), 0) as total_seconds,
            COUNT(*) as session_count
        FROM sessions
        WHERE DATE(start_time) = ?
    ''', (today,))
    today_summary = cur.fetchone()
    
    # 集中時間（開発・学習）
    cur.execute('''
        SELECT COALESCE(SUM(duration_seconds), 0) as focus_seconds
        FROM sessions
        WHERE DATE(start_time) = ?
        AND category IN ('開発', '学習')
    ''', (today,))
    focus_summary = cur.fetchone()
    
    # 娯楽時間（娯楽・SNS）
    cur.execute('''
        SELECT COALESCE(SUM(duration_seconds), 0) as distract_seconds
        FROM sessions
        WHERE DATE(start_time) = ?
        AND category IN ('娯楽', 'SNS')
    ''', (today,))
    distract_summary = cur.fetchone()
    
    conn.close()
    
    return {
        "current_session": {
            "app_name": current['app_name'] if current else None,
            "service": current['service'] if current else None,
            "category": current['category'] if current else None,
            "start_time": current['start_time'] if current else None
        } if current else None,
        "today_summary": {
            "total_minutes": int(today_summary['total_seconds'] / 60) if today_summary else 0,
            "session_count": today_summary['session_count'] if today_summary else 0,
            "focus_minutes": int(focus_summary['focus_seconds'] / 60) if focus_summary else 0,
            "distract_minutes": int(distract_summary['distract_seconds'] / 60) if distract_summary else 0
        }
    }

# タイムライン
@app.get("/timeline")
def get_timeline(date: Optional[str] = Query(None, description="日付 (YYYY-MM-DD), デフォルトは今日")):
    """
    タイムラインデータを取得
    Response: [{start, end, service, category, duration_seconds}]
    """
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    
    conn = get_db()
    cur = conn.cursor()
    
    cur.execute('''
        SELECT start_time, end_time, service, category, duration_seconds
        FROM sessions
        WHERE DATE(start_time) = ?
        ORDER BY start_time
    ''', (date,))
    
    sessions = []
    for row in cur.fetchall():
        sessions.append({
            "start": row['start_time'],
            "end": row['end_time'],
            "service": row['service'],
            "category": row['category'],
            "duration_seconds": row['duration_seconds']
        })
    
    conn.close()
    return sessions

# カテゴリ一覧
@app.get("/categories")
def get_categories():
    """
    カテゴリ一覧を取得
    Response: [{id, name, color}]
    """
    conn = get_db()
    cur = conn.cursor()
    
    cur.execute('SELECT id, name, color FROM categories ORDER BY name')
    categories = []
    for row in cur.fetchall():
        categories.append({
            "id": row['id'],
            "name": row['name'],
            "color": row['color']
        })
    
    conn.close()
    return categories

# カテゴリ作成
@app.post("/categories")
def create_category(name: str, color: str):
    """
    カテゴリを作成
    Response: {success: bool, id: int}
    """
    conn = get_db()
    cur = conn.cursor()
    
    cur.execute('''
        INSERT INTO categories (name, color)
        VALUES (?, ?)
    ''', (name, color))
    
    conn.commit()
    category_id = cur.lastrowid
    conn.close()
    
    return {"success": True, "id": category_id}

# カテゴリ更新
@app.put("/categories/{category_id}")
def update_category(category_id: int, name: Optional[str] = None, color: Optional[str] = None):
    """
    カテゴリを更新
    Response: {success: bool}
    """
    conn = get_db()
    cur = conn.cursor()
    
    if name:
        cur.execute('UPDATE categories SET name = ? WHERE id = ?', (name, category_id))
    if color:
        cur.execute('UPDATE categories SET color = ? WHERE id = ?', (color, category_id))
    
    conn.commit()
    conn.close()
    
    return {"success": True}

# カテゴリ削除
@app.delete("/categories/{category_id}")
def delete_category(category_id: int):
    """
    カテゴリを削除
    Response: {success: bool}
    """
    conn = get_db()
    cur = conn.cursor()
    
    cur.execute('DELETE FROM categories WHERE id = ?', (category_id,))
    
    conn.commit()
    conn.close()
    
    return {"success": True}
