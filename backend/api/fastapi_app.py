from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from typing import Optional, List
import sqlite3
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(ROOT, "data")
DB_PATH = os.path.join(DATA_DIR, "action_tracker.db")

app = FastAPI(title="ActionTracker API", version="1.0.0")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# プライバシーモード設定
PRIVACY_MODE = True

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def mask_sensitive_data(domain: Optional[str], window_title: Optional[str]) -> tuple:
    """
    プライバシーモード: 機密データをマスク
    """
    if not PRIVACY_MODE:
        return domain, window_title
    
    # プライバシーモード対象ドメイン
    privacy_domains = [
        'bank', 'securities', 'finance', 'password', 'vault',
        '1password', 'bitwarden', 'lastpass'
    ]
    
    if domain:
        domain_lower = domain.lower()
        for privacy_domain in privacy_domains:
            if privacy_domain in domain_lower:
                return None, '***'
    
    return domain, window_title

@app.get("/")
def read_root():
    return {"message": "ActionTracker API", "version": "1.0.0"}

@app.get("/dashboard")
def get_dashboard():
    """
    現在状態取得
    Response: {current_app, current_domain, session_start_time, session_duration_minutes, today_usage_minutes, switch_count}
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 最新のセッションを取得
    cursor.execute('''
        SELECT 
            app_name,
            domain,
            start_time,
            duration_seconds
        FROM sessions
        ORDER BY start_time DESC
        LIMIT 1
    ''')
    latest_session = cursor.fetchone()
    
    # 今日の合計使用時間
    today = datetime.now().strftime("%Y-%m-%d")
    cursor.execute('''
        SELECT SUM(duration_seconds) as total_seconds
        FROM sessions
        WHERE DATE(start_time) = ?
    ''', (today,))
    total_seconds = cursor.fetchone()['total_seconds'] or 0
    
    # 今日の切替回数
    cursor.execute('''
        SELECT COUNT(*) as count
        FROM transitions
        WHERE DATE(timestamp) = ?
    ''', (today,))
    switch_count = cursor.fetchone()['count'] or 0
    
    conn.close()
    
    # プライバシーモードを適用
    current_app = latest_session['app_name'] if latest_session else "-"
    current_domain = latest_session['domain'] if latest_session else None
    masked_domain, _ = mask_sensitive_data(current_domain, None)
    
    # セッション情報
    session_start_time = None
    session_duration_minutes = 0
    if latest_session:
        session_start_time = latest_session['start_time'].strftime("%H:%M:%S")
        session_duration_minutes = int(latest_session['duration_seconds'] / 60)
    
    return {
        "current_app": current_app,
        "current_domain": masked_domain,
        "session_start_time": session_start_time,
        "session_duration_minutes": session_duration_minutes,
        "today_usage_minutes": int(total_seconds / 60),
        "switch_count": switch_count
    }

@app.get("/timeline")
def get_timeline(date: Optional[str] = Query(default=datetime.now().strftime("%Y-%m-%d"))):
    """
    タイムライン表示
    Query: ?date=2026-06-16
    Response: [{start, end, app, domain}]
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT 
            TIME(start_time) as start,
            TIME(end_time) as end,
            app_name,
            domain,
            duration_seconds
        FROM sessions
        WHERE DATE(start_time) = ?
        ORDER BY start_time
    ''', (date,))
    
    timeline = []
    for row in cursor.fetchall():
        masked_domain, _ = mask_sensitive_data(row['domain'], None)
        timeline.append({
            "start": row['start'],
            "end": row['end'],
            "app": row['app_name'],
            "domain": masked_domain,
            "duration_seconds": row['duration_seconds']
        })
    
    conn.close()
    return timeline

@app.get("/transitions")
def get_transitions(date: Optional[str] = Query(default=None)):
    """
    アプリ遷移分析
    Response: [{from, to, count}]
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if date:
        cursor.execute('''
            SELECT 
                from_app,
                from_domain,
                to_app,
                to_domain,
                COUNT(*) as count
            FROM transitions
            WHERE DATE(timestamp) = ?
            GROUP BY from_app, to_app
            ORDER BY count DESC
        ''', (date,))
    else:
        cursor.execute('''
            SELECT 
                from_app,
                from_domain,
                to_app,
                to_domain,
                COUNT(*) as count
            FROM transitions
            GROUP BY from_app, to_app
            ORDER BY count DESC
        ''')
    
    transitions = []
    for row in cursor.fetchall():
        transitions.append({
            "from": row['from_domain'] or row['from_app'],
            "to": row['to_domain'] or row['to_app'],
            "count": row['count']
        })
    
    conn.close()
    return transitions

@app.get("/story")
def get_story(date: Optional[str] = Query(default=datetime.now().strftime("%Y-%m-%d"))):
    """
    行動ストーリー生成
    Query: ?date=2026-06-16
    Response: {story: [{time, text}], total_drift_minutes}
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT 
            TIME(start_time) as time,
            app_name,
            domain,
            duration_seconds
        FROM sessions
        WHERE DATE(start_time) = ?
        ORDER BY start_time
    ''', (date,))
    
    story = []
    total_drift_minutes = 0
    distraction_domains = ['youtube.com', 'twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'tiktok.com']
    
    for row in cursor.fetchall():
        masked_domain, _ = mask_sensitive_data(row['domain'], None)
        app_display = masked_domain if masked_domain else row['app_name']
        duration_min = int(row['duration_seconds'] / 60)
        
        # 脱線判定
        if masked_domain:
            for d_domain in distraction_domains:
                if d_domain in masked_domain.lower():
                    total_drift_minutes += duration_min
                    break
        
        # テキスト生成
        if duration_min < 1:
            text = f"{app_display}を利用"
        elif duration_min < 5:
            text = f"{app_display}で作業（{duration_min}分）"
        else:
            text = f"{app_display}で作業（{duration_min}分）"
        
        story.append({
            "time": row['time'],
            "text": text
        })
    
    conn.close()
    return {
        "story": story,
        "total_drift_minutes": total_drift_minutes
    }

@app.get("/insights")
def get_insights():
    """
    インサイト生成
    Response: [{type, message}]
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    insights = []
    
    # 頻出遷移パターン
    cursor.execute('''
        SELECT from_domain, to_domain, COUNT(*) as count
        FROM transitions
        WHERE from_domain IS NOT NULL AND to_domain IS NOT NULL
        GROUP BY from_domain, to_domain
        ORDER BY count DESC
        LIMIT 5
    ''')
    
    top_transitions = cursor.fetchall()
    if top_transitions:
        top = top_transitions[0]
        insights.append({
            "type": "pattern",
            "message": f"{top['from_domain']}から{top['to_domain']}への遷移が最も多い（{top['count']}回）"
        })
    
    # 時間帯別の傾向
    cursor.execute('''
        SELECT 
            CAST(strftime('%H', start_time) AS INTEGER) as hour,
            SUM(duration_seconds) as total_seconds
        FROM sessions
        GROUP BY hour
        ORDER BY total_seconds DESC
        LIMIT 1
    ''')
    
    peak_hour = cursor.fetchone()
    if peak_hour:
        insights.append({
            "type": "time_pattern",
            "message": f"{peak_hour['hour']}時台に最も集中している"
        })
    
    # 平均セッション時間
    cursor.execute('''
        SELECT AVG(duration_seconds) as avg_duration
        FROM sessions
    ''')
    
    avg_duration = cursor.fetchone()['avg_duration']
    if avg_duration:
        avg_min = int(avg_duration / 60)
        insights.append({
            "type": "focus",
            "message": f"平均セッション時間は{avg_min}分"
        })
    
    conn.close()
    return insights

@app.get("/categories")
def get_categories():
    """
    行動カテゴリ分析
    Response: {category: time}
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT cr.category, SUM(s.duration_seconds) as total_seconds
        FROM sessions s
        LEFT JOIN category_rules cr ON s.domain = cr.domain
        WHERE cr.category IS NOT NULL
        GROUP BY cr.category
        ORDER BY total_seconds DESC
    ''')
    
    categories = {}
    for row in cursor.fetchall():
        hours = int(row['total_seconds'] / 3600)
        minutes = int((row['total_seconds'] % 3600) / 60)
        
        if hours > 0:
            time_str = f"{hours}時間{minutes}分"
        else:
            time_str = f"{minutes}分"
        
        categories[row['category']] = time_str
    
    conn.close()
    return categories

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
