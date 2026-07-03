from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from typing import Optional
import sqlite3
import json
import os

# Configuration
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(ROOT, "data")
DB_PATH = os.path.join(DATA_DIR, "action_tracker.db")
STATE_FILE = os.path.join(DATA_DIR, "current_session.json")

# Constants
EXCLUDED_SERVICES = ('unknown', 'Unknown', '不明')
LIVE_SESSION_MAX_AGE_SECONDS = 10

app = FastAPI(title="ActionTracker API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _mask(service: Optional[str]) -> Optional[str]:
    """プライバシーモード: 機密サービスをマスクする"""
    if not service:
        return None
    try:
        from backend.core.service_resolver import should_mask
        return None if should_mask(service) else service
    except Exception:
        return service


def _read_live_session() -> Optional[dict]:
    """
    トラッカーが書き出した current_session.json を読む。
    ファイルがなければ None を返す（トラッカー未起動）。
    LIVE_SESSION_MAX_AGE_SECONDS 秒以上更新がなければ古いとみなして None を返す。
    """
    try:
        with open(STATE_FILE, encoding="utf-8") as f:
            data = json.load(f)
        updated_at = datetime.fromisoformat(data["updated_at"])
        age = (datetime.now() - updated_at).total_seconds()
        if age > LIVE_SESSION_MAX_AGE_SECONDS:
            return None
        # 経過秒数を再計算（ファイルに書かれた値より正確）
        if data.get("session_start"):
            start_dt = datetime.fromisoformat(data["session_start"])
            data["duration_seconds"] = int((datetime.now() - start_dt).total_seconds())
        return data
    except Exception:
        return None


# ─────────────────────────────────────────────
# エンドポイント
# ─────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "ActionTracker API", "version": "2.0.0"}


@app.get("/dashboard")
def get_dashboard():
    """
    現在状態取得（ライブセッション優先）
    Response: {current_app, current_service, current_category,
               session_start_time, session_duration_minutes,
               today_usage_minutes, switch_count}
    """
    # ライブセッション（トラッカーが 2 秒ごとに書き出す JSON）を最優先で使う
    live = _read_live_session()

    conn = get_db()
    cur = conn.cursor()

    today = datetime.now().strftime("%Y-%m-%d")

    placeholders = ','.join('?' * len(EXCLUDED_SERVICES))
    cur.execute(f'''
        SELECT COALESCE(SUM(duration_seconds), 0) as total
        FROM sessions WHERE DATE(start_time) = ? AND service NOT IN ({placeholders})
    ''', (today, *EXCLUDED_SERVICES))
    db_total_sec = cur.fetchone()['total']

    cur.execute('''
        SELECT COUNT(*) as cnt FROM transitions WHERE DATE(timestamp) = ?
    ''', (today,))
    switch_count = cur.fetchone()['cnt']

    conn.close()

    if live:
        # ライブセッション分を合計に加算（まだ DB に書かれていないため）
        total_sec = db_total_sec + live.get("duration_seconds", 0)
        service = _mask(live.get("service"))
        return {
            "current_app":              live.get("app_name", "—"),
            "current_service":          service,
            "current_category":         live.get("category"),
            "session_start_time":       live.get("session_start", "")[-8:] if live.get("session_start") else None,
            "session_duration_minutes": int(live.get("duration_seconds", 0) / 60),
            "today_usage_minutes":      int(total_sec / 60),
            "switch_count":             switch_count,
        }

    # ライブセッションなし（トラッカー未起動）→ DB の最新レコードにフォールバック
    conn2 = get_db()
    cur2 = conn2.cursor()
    cur2.execute('''
        SELECT app_name, service, category, start_time, duration_seconds
        FROM sessions ORDER BY start_time DESC LIMIT 1
    ''')
    latest = cur2.fetchone()
    conn2.close()

    service = _mask(latest['service'] if latest else None)
    session_start = None
    session_min = 0
    if latest:
        try:
            session_start = str(latest['start_time'])[-8:]
        except Exception:
            pass
        session_min = int((latest['duration_seconds'] or 0) / 60)

    return {
        "current_app":              latest['app_name'] if latest else "—",
        "current_service":          service,
        "current_category":         latest['category'] if latest else None,
        "session_start_time":       session_start,
        "session_duration_minutes": session_min,
        "today_usage_minutes":      int(db_total_sec / 60),
        "switch_count":             switch_count,
    }


@app.get("/timeline")
def get_timeline(date: Optional[str] = Query(default=None)):
    """
    タイムライン表示（ライブセッションを末尾に追加）
    Response: [{start, end, app, service, category, duration_seconds}]
    """
    today = datetime.now().strftime("%Y-%m-%d")
    if not date:
        date = today

    conn = get_db()
    cur = conn.cursor()
    placeholders = ','.join('?' * len(EXCLUDED_SERVICES))
    cur.execute(f'''
        SELECT
            TIME(start_time)  as start,
            TIME(end_time)    as end,
            app_name,
            service,
            category,
            duration_seconds
        FROM sessions
        WHERE DATE(start_time) = ? AND service NOT IN ({placeholders})
        ORDER BY start_time
    ''', (date, *EXCLUDED_SERVICES))

    result = []
    for row in cur.fetchall():
        result.append({
            "start":            row['start'],
            "end":              row['end'],
            "app":              row['app_name'],
            "service":          _mask(row['service']),
            "category":         row['category'],
            "duration_seconds": row['duration_seconds'],
        })
    conn.close()

    # 今日のタイムラインにはライブセッション（DB未保存）を末尾に追加
    if date == today:
        live = _read_live_session()
        if live and live.get("session_start"):
            start_dt = datetime.fromisoformat(live["session_start"])
            now = datetime.now()
            # DB 最終レコードと重複していないか確認
            last_start = result[-1]["start"] if result else None
            live_start_str = start_dt.strftime("%H:%M:%S")
            if last_start != live_start_str:
                result.append({
                    "start":            live_start_str,
                    "end":              now.strftime("%H:%M:%S"),
                    "app":              live.get("app_name", ""),
                    "service":          _mask(live.get("service")),
                    "category":         live.get("category"),
                    "duration_seconds": live.get("duration_seconds", 0),
                })

    return result


@app.get("/transitions")
def get_transitions(date: Optional[str] = Query(default=None)):
    """
    サービス遷移分析
    Response: [{from, to, from_category, to_category, count}]
    """
    conn = get_db()
    cur = conn.cursor()

    if date:
        cur.execute('''
            SELECT from_service, to_service, from_category, to_category,
                   COUNT(*) as count
            FROM transitions
            WHERE DATE(timestamp) = ?
            GROUP BY from_service, to_service
            ORDER BY count DESC
        ''', (date,))
    else:
        cur.execute('''
            SELECT from_service, to_service, from_category, to_category,
                   COUNT(*) as count
            FROM transitions
            GROUP BY from_service, to_service
            ORDER BY count DESC
        ''')

    result = []
    for row in cur.fetchall():
        result.append({
            "from":          row['from_service'] or "—",
            "to":            row['to_service'] or "—",
            "from_category": row['from_category'],
            "to_category":   row['to_category'],
            "count":         row['count'],
        })
    conn.close()
    return result


@app.get("/story")
def get_story(date: Optional[str] = Query(default=None)):
    """
    行動ストーリー生成
    Response: {story: [{time, text, service, category}], total_drift_minutes}
    """
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    conn = get_db()
    cur = conn.cursor()
    placeholders = ','.join('?' * len(EXCLUDED_SERVICES))
    cur.execute(f'''
        SELECT TIME(start_time) as time, app_name, service, category, duration_seconds
        FROM sessions
        WHERE DATE(start_time) = ? AND service NOT IN ({placeholders})
        ORDER BY start_time
    ''', (date, *EXCLUDED_SERVICES))

    story = []
    total_drift_minutes = 0

    try:
        from backend.core.service_resolver import is_distraction
    except Exception:
        def is_distraction(cat): return cat in ("娯楽", "SNS")

    for row in cur.fetchall():
        service  = _mask(row['service']) or row['app_name'] or "不明"
        category = row['category'] or "その他"
        dur_min  = int((row['duration_seconds'] or 0) / 60)

        if is_distraction(category):
            total_drift_minutes += dur_min

        # ストーリーテキスト生成
        text = _story_text(service, category, dur_min)

        story.append({
            "time":     row['time'],
            "text":     text,
            "service":  service,
            "category": category,
        })

    conn.close()
    return {"story": story, "total_drift_minutes": total_drift_minutes}


def _story_text(service: str, category: str, dur_min: int) -> str:
    """サービス名 + カテゴリからストーリー文を生成する"""
    dur_str = f"（{dur_min}分）" if dur_min >= 1 else ""

    templates: dict[str, str] = {
        "開発":           f"{service}で開発作業{dur_str}",
        "学習":           f"{service}で調査・学習{dur_str}",
        "娯楽":           f"{service}で動画閲覧{dur_str}",
        "SNS":            f"{service}を閲覧{dur_str}",
        "コミュニケーション": f"{service}でコミュニケーション{dur_str}",
    }
    return templates.get(category, f"{service}を利用{dur_str}")


@app.get("/insights")
def get_insights():
    """
    インサイト生成
    Response: [{type, message}]
    """
    conn = get_db()
    cur = conn.cursor()
    insights = []

    # 頻出遷移パターン
    cur.execute('''
        SELECT from_service, to_service, from_category, to_category,
               COUNT(*) as count
        FROM transitions
        WHERE from_service IS NOT NULL AND to_service IS NOT NULL
        GROUP BY from_service, to_service
        ORDER BY count DESC LIMIT 5
    ''')
    top_trans = cur.fetchall()
    if top_trans:
        t = top_trans[0]
        insights.append({
            "type":    "pattern",
            "message": f"{t['from_service']}から{t['to_service']}への遷移が最も多い（{t['count']}回）",
        })
        # 脱線パターンを探す
        for row in top_trans:
            if row['to_category'] in ("娯楽", "SNS"):
                insights.append({
                    "type":    "distraction",
                    "message": f"{row['from_category']}作業後に{row['to_service']}へ遷移する傾向があります",
                })
                break

    # 時間帯別のピーク
    placeholders = ','.join('?' * len(EXCLUDED_SERVICES))
    cur.execute(f'''
        SELECT CAST(strftime('%H', start_time) AS INTEGER) as hour,
               SUM(duration_seconds) as total
        FROM sessions WHERE service NOT IN ({placeholders})
        GROUP BY hour ORDER BY total DESC LIMIT 1
    ''', (*EXCLUDED_SERVICES,))
    peak = cur.fetchone()
    if peak:
        insights.append({
            "type":    "time_pattern",
            "message": f"{peak['hour']}時台に最も多く活動しています",
        })

    # カテゴリ別利用傾向
    cur.execute(f'''
        SELECT category, SUM(duration_seconds) as total
        FROM sessions WHERE category IS NOT NULL AND service NOT IN ({placeholders})
        GROUP BY category ORDER BY total DESC LIMIT 1
    ''', (*EXCLUDED_SERVICES,))
    top_cat = cur.fetchone()
    if top_cat:
        m = int(top_cat['total'] / 60)
        insights.append({
            "type":    "focus",
            "message": f"最も多いカテゴリは「{top_cat['category']}」（{m}分）",
        })

    # 平均セッション時間
    cur.execute(f"SELECT AVG(duration_seconds) as avg FROM sessions WHERE service NOT IN ({placeholders})", (*EXCLUDED_SERVICES,))
    avg = cur.fetchone()['avg']
    if avg:
        insights.append({
            "type":    "focus",
            "message": f"平均セッション時間は{int(avg / 60)}分",
        })

    conn.close()
    return insights


@app.get("/categories")
def get_categories():
    """
    行動カテゴリ分析
    Response: {category: "X時間Y分"}
    """
    conn = get_db()
    cur = conn.cursor()
    placeholders = ','.join('?' * len(EXCLUDED_SERVICES))
    cur.execute(f'''
        SELECT category, SUM(duration_seconds) as total
        FROM sessions
        WHERE category IS NOT NULL AND service NOT IN ({placeholders})
        GROUP BY category ORDER BY total DESC
    ''', (*EXCLUDED_SERVICES,))
    result = {}
    for row in cur.fetchall():
        h = int(row['total'] / 3600)
        m = int((row['total'] % 3600) / 60)
        result[row['category']] = f"{h}時間{m}分" if h > 0 else f"{m}分"
    conn.close()
    return result
