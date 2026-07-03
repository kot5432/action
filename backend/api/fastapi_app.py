from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import sqlite3
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(ROOT, "data")
DB_PATH = os.path.join(DATA_DIR, "action_tracker.db")

app = FastAPI(title="ActionTracker API", version="2.0.0")


# Pydantic models
class CategoryCreate(BaseModel):
    name: str
    color: str


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class PrivacySettings(BaseModel):
    enabled: bool
    masked_services: list[str]


class RetentionSettings(BaseModel):
    retention_days: int


class CategoryRuleCreate(BaseModel):
    service: str
    category: str


class CategoryRuleUpdate(BaseModel):
    category: str

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


# ─────────────────────────────────────────────
# エンドポイント
# ─────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "ActionTracker API", "version": "2.0.0"}


@app.get("/health")
def health_check():
    """
    システム状態確認
    Response: {status, database, tracker}
    """
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        conn.close()
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    # Trackerの状態は簡易的にOKとする
    tracker_status = "running"

    return {
        "status": "ok" if db_status == "connected" else "error",
        "database": db_status,
        "tracker": tracker_status,
    }


@app.get("/current")
def get_current():
    """
    現在進行中のセッションを取得する
    Response: {app_name, service, category, started_at, duration_seconds}
    """
    conn = get_db()
    cur = conn.cursor()

    cur.execute('''
        SELECT app_name, service, category, start_time, duration_seconds
        FROM sessions
        ORDER BY start_time DESC LIMIT 1
    ''')
    latest = cur.fetchone()
    conn.close()

    if not latest:
        return {
            "app_name": None,
            "service": None,
            "category": None,
            "started_at": None,
            "duration_seconds": 0,
        }

    # 現在のセッションの継続時間を再計算
    started_at = latest['start_time']
    duration_seconds = int((datetime.now() - started_at).total_seconds())

    return {
        "app_name": latest['app_name'],
        "service": _mask(latest['service']),
        "category": latest['category'],
        "started_at": started_at.isoformat(),
        "duration_seconds": duration_seconds,
    }


@app.get("/privacy")
def get_privacy():
    """
    プライバシー設定取得
    Response: {enabled, masked_services}
    """
    conn = get_db()
    cur = conn.cursor()

    # プライバシーモードの有効/無効
    cur.execute("SELECT value FROM settings WHERE key = 'privacy_enabled'")
    row = cur.fetchone()
    enabled = row['value'] == 'true' if row else True

    # マスク対象サービス
    cur.execute("SELECT value FROM settings WHERE key = 'masked_services'")
    row = cur.fetchone()
    masked_services = []
    if row:
        try:
            import json
            masked_services = json.loads(row['value'])
        except:
            masked_services = []

    conn.close()

    return {
        "enabled": enabled,
        "masked_services": masked_services,
    }


@app.put("/privacy")
def update_privacy(settings: PrivacySettings):
    """
    プライバシー設定更新
    Request: {enabled, masked_services}
    Response: {success: true}
    """
    conn = get_db()
    cur = conn.cursor()

    # プライバシーモードの有効/無効
    cur.execute('''
        INSERT OR REPLACE INTO settings (key, value)
        VALUES ('privacy_enabled', ?)
    ''', ('true' if settings.enabled else 'false',))

    # マスク対象サービス
    import json
    cur.execute('''
        INSERT OR REPLACE INTO settings (key, value)
        VALUES ('masked_services', ?)
    ''', (json.dumps(settings.masked_services),))

    conn.commit()
    conn.close()

    return {"success": True}


@app.get("/settings/retention")
def get_retention():
    """
    データ保持設定取得
    Response: {retention_days}
    """
    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT value FROM settings WHERE key = 'retention_days'")
    row = cur.fetchone()
    retention_days = int(row['value']) if row else 90

    conn.close()

    return {"retention_days": retention_days}


@app.put("/settings/retention")
def update_retention(settings: RetentionSettings):
    """
    データ保持設定更新
    Request: {retention_days}
    Response: {success: true}
    """
    conn = get_db()
    cur = conn.cursor()

    cur.execute('''
        INSERT OR REPLACE INTO settings (key, value)
        VALUES ('retention_days', ?)
    ''', (str(settings.retention_days),))

    conn.commit()
    conn.close()

    return {"success": True}


@app.get("/dashboard")
def get_dashboard():
    """
    現在状態取得
    Response: {current_app, current_service, current_category,
               session_start_time, session_duration_minutes,
               today_usage_minutes, switch_count}
    """
    conn = get_db()
    cur = conn.cursor()

    cur.execute('''
        SELECT app_name, service, category, start_time, duration_seconds
        FROM sessions
        ORDER BY start_time DESC LIMIT 1
    ''')
    latest = cur.fetchone()

    today = datetime.now().strftime("%Y-%m-%d")

    cur.execute('''
        SELECT COALESCE(SUM(duration_seconds), 0) as total
        FROM sessions WHERE DATE(start_time) = ?
    ''', (today,))
    total_sec = cur.fetchone()['total']

    cur.execute('''
        SELECT COUNT(*) as cnt FROM transitions WHERE DATE(timestamp) = ?
    ''', (today,))
    switch_count = cur.fetchone()['cnt']

    conn.close()

    service = _mask(latest['service'] if latest else None)
    session_start = None
    session_min = 0
    if latest:
        try:
            session_start = str(latest['start_time'])[-8:]  # HH:MM:SS
        except Exception:
            pass
        session_min = int((latest['duration_seconds'] or 0) / 60)

    return {
        "current_app":              latest['app_name'] if latest else "—",
        "current_service":          service,
        "current_category":         latest['category'] if latest else None,
        "session_start_time":       session_start,
        "session_duration_minutes": session_min,
        "today_usage_minutes":      int(total_sec / 60),
        "switch_count":             switch_count,
    }


@app.get("/timeline")
def get_timeline(date: Optional[str] = Query(default=None)):
    """
    タイムライン表示
    Response: [{start, end, app, service, category, duration_seconds}]
    """
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    conn = get_db()
    cur = conn.cursor()
    cur.execute('''
        SELECT
            TIME(start_time)  as start,
            TIME(end_time)    as end,
            app_name,
            service,
            category,
            duration_seconds
        FROM sessions
        WHERE DATE(start_time) = ?
        ORDER BY start_time
    ''', (date,))

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
    return result


@app.get("/summary")
def get_summary(date: Optional[str] = Query(default=None)):
    """
    日次サマリー取得
    Response: {total_usage_minutes, switch_count, focus_sessions, top_services}
    """
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    conn = get_db()
    cur = conn.cursor()

    # 合計利用時間
    cur.execute('''
        SELECT COALESCE(SUM(duration_seconds), 0) as total
        FROM sessions WHERE DATE(start_time) = ?
    ''', (date,))
    total_sec = cur.fetchone()['total']

    # 切替回数
    cur.execute('''
        SELECT COUNT(*) as cnt FROM transitions WHERE DATE(timestamp) = ?
    ''', (date,))
    switch_count = cur.fetchone()['cnt']

    # 集中セッション数（開発・学習カテゴリ）
    cur.execute('''
        SELECT COUNT(*) as cnt
        FROM sessions
        WHERE DATE(start_time) = ? AND category IN ('開発', '学習')
    ''', (date,))
    focus_sessions = cur.fetchone()['cnt']

    # トップサービス
    cur.execute('''
        SELECT service, SUM(duration_seconds) as total
        FROM sessions
        WHERE DATE(start_time) = ? AND service IS NOT NULL
        GROUP BY service
        ORDER BY total DESC
        LIMIT 5
    ''', (date,))
    top_services = []
    for row in cur.fetchall():
        top_services.append({
            "service": _mask(row['service']),
            "minutes": int(row['total'] / 60),
        })

    conn.close()

    return {
        "total_usage_minutes": int(total_sec / 60),
        "switch_count": switch_count,
        "focus_sessions": focus_sessions,
        "top_services": top_services,
    }


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


@app.get("/services")
def get_services(range: Optional[str] = Query(default="today")):
    """
    サービス別利用時間取得
    Query: today, 7d, 30d, all
    Response: [{service, category, minutes}]
    """
    conn = get_db()
    cur = conn.cursor()

    # 日付範囲の計算
    date_condition = ""
    params = ()
    today = datetime.now().strftime("%Y-%m-%d")

    if range == "today":
        date_condition = "WHERE DATE(start_time) = ?"
        params = (today,)
    elif range == "7d":
        date_condition = "WHERE DATE(start_time) >= ?"
        from datetime import timedelta
        start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        params = (start_date,)
    elif range == "30d":
        date_condition = "WHERE DATE(start_time) >= ?"
        from datetime import timedelta
        start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        params = (start_date,)
    elif range == "all":
        date_condition = ""
        params = ()
    else:
        date_condition = "WHERE DATE(start_time) = ?"
        params = (today,)

    cur.execute(f'''
        SELECT service, category, SUM(duration_seconds) as total
        FROM sessions
        {date_condition}
        AND service IS NOT NULL
        GROUP BY service, category
        ORDER BY total DESC
    ''', params)

    result = []
    for row in cur.fetchall():
        result.append({
            "service": _mask(row['service']),
            "category": row['category'],
            "minutes": int(row['total'] / 60),
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
    cur.execute('''
        SELECT TIME(start_time) as time, app_name, service, category, duration_seconds
        FROM sessions
        WHERE DATE(start_time) = ?
        ORDER BY start_time
    ''', (date,))

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
    cur.execute('''
        SELECT CAST(strftime('%H', start_time) AS INTEGER) as hour,
               SUM(duration_seconds) as total
        FROM sessions GROUP BY hour ORDER BY total DESC LIMIT 1
    ''')
    peak = cur.fetchone()
    if peak:
        insights.append({
            "type":    "time_pattern",
            "message": f"{peak['hour']}時台に最も多く活動しています",
        })

    # カテゴリ別利用傾向
    cur.execute('''
        SELECT category, SUM(duration_seconds) as total
        FROM sessions WHERE category IS NOT NULL
        GROUP BY category ORDER BY total DESC LIMIT 1
    ''')
    top_cat = cur.fetchone()
    if top_cat:
        m = int(top_cat['total'] / 60)
        insights.append({
            "type":    "focus",
            "message": f"最も多いカテゴリは「{top_cat['category']}」（{m}分）",
        })

    # 平均セッション時間
    cur.execute('SELECT AVG(duration_seconds) as avg FROM sessions')
    avg = cur.fetchone()['avg']
    if avg:
        insights.append({
            "type":    "focus",
            "message": f"平均セッション時間は{int(avg / 60)}分",
        })

    conn.close()
    return insights


@app.get("/categories")
def get_categories_list():
    """
    カテゴリ一覧取得
    Response: [{id, name, color}]
    """
    conn = get_db()
    cur = conn.cursor()

    cur.execute('''
        SELECT id, name, color
        FROM categories
        ORDER BY name
    ''')

    result = []
    for row in cur.fetchall():
        result.append({
            "id": row['id'],
            "name": row['name'],
            "color": row['color'],
        })

    conn.close()
    return result


@app.post("/categories")
def create_category(category: CategoryCreate):
    """
    カテゴリ追加
    Request: {name, color}
    Response: {success: true, id}
    """
    conn = get_db()
    cur = conn.cursor()

    now = datetime.now()
    cur.execute('''
        INSERT INTO categories (name, color, created_at, updated_at)
        VALUES (?, ?, ?, ?)
    ''', (category.name, category.color, now, now))

    conn.commit()
    category_id = cur.lastrowid
    conn.close()

    return {"success": True, "id": category_id}


@app.put("/categories/{category_id}")
def update_category(category_id: int, category: CategoryUpdate):
    """
    カテゴリ編集
    Request: {name?, color?}
    Response: {success: true}
    """
    conn = get_db()
    cur = conn.cursor()

    updates = []
    params = []
    if category.name:
        updates.append("name = ?")
        params.append(category.name)
    if category.color:
        updates.append("color = ?")
        params.append(category.color)

    if updates:
        updates.append("updated_at = ?")
        params.append(datetime.now())
        params.append(category_id)

        cur.execute(f'''
            UPDATE categories
            SET {', '.join(updates)}
            WHERE id = ?
        ''', params)

        conn.commit()

    conn.close()
    return {"success": True}


@app.delete("/categories/{category_id}")
def delete_category(category_id: int):
    """
    カテゴリ削除
    Response: {success: true}
    """
    conn = get_db()
    cur = conn.cursor()

    cur.execute('DELETE FROM categories WHERE id = ?', (category_id,))
    conn.commit()
    conn.close()

    return {"success": True}


@app.get("/categories/usage")
def get_categories_usage(range: Optional[str] = Query(default="today")):
    """
    カテゴリ別利用時間取得
    Query: today, 7d, 30d, all
    Response: [{category, minutes}]
    """
    conn = get_db()
    cur = conn.cursor()

    # 日付範囲の計算
    date_condition = ""
    params = ()
    today = datetime.now().strftime("%Y-%m-%d")

    if range == "today":
        date_condition = "WHERE DATE(start_time) = ?"
        params = (today,)
    elif range == "7d":
        date_condition = "WHERE DATE(start_time) >= ?"
        from datetime import timedelta
        start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        params = (start_date,)
    elif range == "30d":
        date_condition = "WHERE DATE(start_time) >= ?"
        from datetime import timedelta
        start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        params = (start_date,)
    elif range == "all":
        date_condition = ""
        params = ()
    else:
        date_condition = "WHERE DATE(start_time) = ?"
        params = (today,)

    cur.execute(f'''
        SELECT category, SUM(duration_seconds) as total
        FROM sessions
        {date_condition}
        AND category IS NOT NULL
        GROUP BY category
        ORDER BY total DESC
    ''', params)

    result = []
    for row in cur.fetchall():
        result.append({
            "category": row['category'],
            "minutes": int(row['total'] / 60),
        })

    conn.close()
    return result


@app.get("/category-rules")
def get_category_rules():
    """
    カテゴリルール一覧取得
    Response: [{id, service, category}]
    """
    conn = get_db()
    cur = conn.cursor()

    cur.execute('''
        SELECT id, service, category
        FROM category_rules
        ORDER BY service
    ''')

    result = []
    for row in cur.fetchall():
        result.append({
            "id": row['id'],
            "service": row['service'],
            "category": row['category'],
        })

    conn.close()
    return result


@app.post("/category-rules")
def create_category_rule(rule: CategoryRuleCreate):
    """
    カテゴリルール追加
    Request: {service, category}
    Response: {success: true, id}
    """
    conn = get_db()
    cur = conn.cursor()

    cur.execute('''
        INSERT INTO category_rules (service, category)
        VALUES (?, ?)
    ''', (rule.service, rule.category))

    conn.commit()
    rule_id = cur.lastrowid
    conn.close()

    return {"success": True, "id": rule_id}


@app.put("/category-rules/{rule_id}")
def update_category_rule(rule_id: int, rule: CategoryRuleUpdate):
    """
    カテゴリルール編集
    Request: {category}
    Response: {success: true}
    """
    conn = get_db()
    cur = conn.cursor()

    cur.execute('''
        UPDATE category_rules
        SET category = ?
        WHERE id = ?
    ''', (rule.category, rule_id))

    conn.commit()
    conn.close()

    return {"success": True}


@app.delete("/category-rules/{rule_id}")
def delete_category_rule(rule_id: int):
    """
    カテゴリルール削除
    Response: {success: true}
    """
    conn = get_db()
    cur = conn.cursor()

    cur.execute('DELETE FROM category_rules WHERE id = ?', (rule_id,))
    conn.commit()
    conn.close()

    return {"success": True}
