from fastapi import FastAPI, Query, HTTPException, Depends, APIRouter, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
from typing import Optional, List
import sqlite3
import json
from pydantic import BaseModel

# 設定管理
from backend.core.config import config
from backend.core.auth import verify_api_key_header
from backend.core.cache import cache_result

# レート制限
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# WebSocket接続管理
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# 条件付き認証デコレーター
def optional_auth():
    """認証が有効な場合のみ認証を要求"""
    if config.AUTH_ENABLED:
        return Depends(verify_api_key_header)
    return lambda: None


def get_date_filter(range: str) -> str:
    """
    日付範囲フィルターを生成
    Args:
        range: 範囲指定 (today, 7d, 30d, all)
    Returns:
        SQL WHERE句のフィルター条件
    """
    if range == "today":
        return "DATE(start_time) = DATE('now')"
    elif range == "7d":
        return "DATE(start_time) >= DATE('now', '-7 days')"
    elif range == "30d":
        return "DATE(start_time) >= DATE('now', '-30 days')"
    else:  # all
        return "1=1"


# メインアプリケーション
app = FastAPI(
    title="ActionTracker API",
    version="2.0.0",
    description="行動追跡・分析API - ユーザーの行動パターンを追跡し、インサイトを提供する",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {
            "name": "v1",
            "description": "APIバージョン1のエンドポイント"
        },
        {
            "name": "health",
            "description": "システム状態確認エンドポイント"
        },
        {
            "name": "dashboard",
            "description": "ダッシュボード関連エンドポイント"
        },
        {
            "name": "backup",
            "description": "バックアップ・復元エンドポイント"
        }
    ]
)

# レート制限設定
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# APIバージョン1ルーター
v1_router = APIRouter(prefix="/api/v1", tags=["v1"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 統一的なエラーハンドラー
@app.exception_handler(sqlite3.Error)
async def sqlite_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": "Database error", "detail": str(exc)}
    )


@app.exception_handler(Exception)
async def general_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )


def get_db():
    conn = sqlite3.connect(config.DATABASE_PATH)
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
        with open(config.get_state_file(), encoding="utf-8") as f:
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
# エンドポイント（v1）
# ─────────────────────────────────────────────

@v1_router.get("/")
@limiter.limit("100/minute")
def root(request: Request):
    """APIルートエンドポイント"""
    return {"message": "ActionTracker API", "version": "2.0.0"}


@v1_router.get("/health")
@limiter.limit("60/minute")
def health_check(request: Request):
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


# 後方互換性のために古いパスも維持（リダイレクト）
@app.get("/health")
def health_check_legacy():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/api/v1/health", status_code=301)


@app.get("/")
def root():
    return {"message": "ActionTracker API", "version": "2.0.0"}


@app.get("/current")
@limiter.limit("30/minute")
def get_current(request: Request):
    """
    現在進行中のセッションを取得
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
    if isinstance(started_at, str):
        started_at = datetime.fromisoformat(started_at)
    duration_seconds = int((datetime.now() - started_at).total_seconds())

    return {
        "app_name": latest['app_name'],
        "service": _mask(latest['service']),
        "category": latest['category'],
        "started_at": started_at.isoformat(),
        "duration_seconds": duration_seconds,
    }


@app.get("/dashboard")
@limiter.limit("30/minute")
def get_dashboard(request: Request):
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

    placeholders = ','.join('?' * len(config.EXCLUDED_SERVICES))
    cur.execute(f'''
        SELECT COALESCE(SUM(duration_seconds), 0) as total
        FROM sessions WHERE DATE(start_time) = ? AND service NOT IN ({placeholders})
    ''', (today, *config.EXCLUDED_SERVICES))
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
@limiter.limit("20/minute")
def get_timeline(request: Request, date: Optional[str] = Query(default=None)):
    """
    タイムライン表示（ライブセッションを末尾に追加）
    Response: [{start, end, app, service, category, duration_seconds}]
    """
    today = datetime.now().strftime("%Y-%m-%d")
    if not date:
        date = today

    conn = get_db()
    cur = conn.cursor()
    placeholders = ','.join('?' * len(config.EXCLUDED_SERVICES))
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
    ''', (date, *config.EXCLUDED_SERVICES))

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
    placeholders = ','.join('?' * len(config.EXCLUDED_SERVICES))
    cur.execute(f'''
        SELECT TIME(start_time) as time, app_name, service, category, duration_seconds
        FROM sessions
        WHERE DATE(start_time) = ? AND service NOT IN ({placeholders})
        ORDER BY start_time
    ''', (date, *config.EXCLUDED_SERVICES))

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
def get_insights(date: Optional[str] = Query(None, description="日付 (YYYY-MM-DD), デフォルトは今日")):
    """
    インサイト生成（要件定義書詳細要件対応）
    Response: [{type, category, message, severity, data}]
    """
    from backend.core.scoring import BehaviorScorer
    
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    
    try:
        scorer = BehaviorScorer()
        insights = scorer.generate_classified_insights(date)
        return insights
    except Exception as e:
        return [{"type": "error", "category": "エラー", "message": str(e), "severity": "danger", "data": {}}]


@app.get("/summary")
def get_summary(date: Optional[str] = Query(None, description="日付 (YYYY-MM-DD), デフォルトは今日")):
    """
    日次サマリーを取得
    Response: {total_usage_minutes, switch_count, focus_sessions, top_services}
    """
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    
    conn = get_db()
    cur = conn.cursor()
    
    # 総利用時間
    placeholders = ','.join('?' * len(config.EXCLUDED_SERVICES))
    cur.execute(f'''
        SELECT COALESCE(SUM(duration_seconds), 0) as total
        FROM sessions WHERE DATE(start_time) = ? AND service NOT IN ({placeholders})
    ''', (date, *config.EXCLUDED_SERVICES))
    total_usage_minutes = int(cur.fetchone()['total'] / 60)
    
    # 切替回数
    cur.execute('''
        SELECT COUNT(*) as cnt FROM transitions WHERE DATE(timestamp) = ?
    ''', (date,))
    switch_count = cur.fetchone()['cnt']
    
    # フォーカスセッション数（簡易計算）
    focus_placeholders = ','.join('?' * len(config.FOCUS_CATEGORIES))
    cur.execute(f'''
        SELECT COUNT(*) as cnt FROM sessions 
        WHERE DATE(start_time) = ? AND category IN ({focus_placeholders})
    ''', (date, *config.FOCUS_CATEGORIES))
    focus_sessions = cur.fetchone()['cnt']
    
    # トップサービス
    cur.execute(f'''
        SELECT service, SUM(duration_seconds) as total
        FROM sessions WHERE DATE(start_time) = ? AND service NOT IN ({placeholders})
        GROUP BY service ORDER BY total DESC LIMIT 5
    ''', (date, *config.EXCLUDED_SERVICES))
    top_services = []
    for row in cur.fetchall():
        top_services.append({
            "service": _mask(row['service']),
            "minutes": int(row['total'] / 60)
        })
    
    conn.close()
    
    return {
        "total_usage_minutes": total_usage_minutes,
        "switch_count": switch_count,
        "focus_sessions": focus_sessions,
        "top_services": top_services
    }


@app.get("/categories")
@cache_result(ttl=60)  # 1分間キャッシュ
def get_categories():
    """
    行動カテゴリ分析
    Response: {category: "X時間Y分"}
    """
    conn = get_db()
    cur = conn.cursor()
    placeholders = ','.join('?' * len(config.EXCLUDED_SERVICES))
    cur.execute(f'''
        SELECT category, SUM(duration_seconds) as total
        FROM sessions
        WHERE category IS NOT NULL AND service NOT IN ({placeholders})
        GROUP BY category ORDER BY total DESC
    ''', (*config.EXCLUDED_SERVICES,))
    result = {}
    for row in cur.fetchall():
        h = int(row['total'] / 3600)
        m = int((row['total'] % 3600) / 60)
        result[row['category']] = f"{h}時間{m}分" if h > 0 else f"{m}分"
    conn.close()
    return result


@app.get("/services")
def get_services(range: str = Query("today", description="範囲 (today, 7d, 30d, all)")):
    """
    サービス別利用時間を取得
    Response: [{service, minutes}]
    """
    conn = get_db()
    cur = conn.cursor()
    
    date_filter = get_date_filter(range)
    placeholders = ','.join('?' * len(config.EXCLUDED_SERVICES))
    cur.execute(f'''
        SELECT service, SUM(duration_seconds) as total
        FROM sessions
        WHERE {date_filter} AND service NOT IN ({placeholders})
        GROUP BY service ORDER BY total DESC
    ''', (*config.EXCLUDED_SERVICES,))
    
    result = []
    for row in cur.fetchall():
        result.append({
            "service": _mask(row['service']),
            "minutes": int(row['total'] / 60)
        })
    
    conn.close()
    return result


@app.get("/categories/usage")
def get_categories_usage(range: str = Query("today", description="範囲 (today, 7d, 30d, all)")):
    """
    カテゴリ別利用時間を取得
    Response: [{category, minutes}]
    """
    conn = get_db()
    cur = conn.cursor()
    
    date_filter = get_date_filter(range)
    placeholders = ','.join('?' * len(config.EXCLUDED_SERVICES))
    cur.execute(f'''
        SELECT category, SUM(duration_seconds) as total
        FROM sessions
        WHERE {date_filter} AND category IS NOT NULL AND service NOT IN ({placeholders})
        GROUP BY category ORDER BY total DESC
    ''', (*config.EXCLUDED_SERVICES,))
    
    result = []
    for row in cur.fetchall():
        result.append({
            "category": row['category'],
            "minutes": int(row['total'] / 60)
        })
    
    conn.close()
    return result


@app.get("/privacy")
def get_privacy():
    """
    プライバシー設定を取得
    Response: {enabled: bool, masked_services: string[]}
    """
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT value FROM settings WHERE key = 'privacy'")
    row = cur.fetchone()
    conn.close()
    
    if row:
        try:
            return json.loads(row['value'])
        except:
            return {"enabled": True, "masked_services": []}
    return {"enabled": True, "masked_services": []}


@app.put("/privacy")
def update_privacy(settings: dict):
    """
    プライバシー設定を更新
    Response: {success: bool}
    """
    conn = get_db()
    cur = conn.cursor()
    cur.execute('''
        INSERT OR REPLACE INTO settings (key, value)
        VALUES ('privacy', ?)
    ''', (json.dumps(settings),))
    conn.commit()
    conn.close()
    return {"success": True}


@app.get("/settings/retention")
def get_retention():
    """
    データ保持期間設定を取得
    Response: {retention_days: int}
    """
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT value FROM settings WHERE key = 'retention'")
    row = cur.fetchone()
    conn.close()
    
    if row:
        try:
            return json.loads(row['value'])
        except:
            return {"retention_days": 90}
    return {"retention_days": 90}


@app.put("/settings/retention")
def update_retention(settings: dict):
    """
    データ保持期間設定を更新
    Response: {success: bool}
    """
    conn = get_db()
    cur = conn.cursor()
    cur.execute('''
        INSERT OR REPLACE INTO settings (key, value)
        VALUES ('retention', ?)
    ''', (json.dumps(settings),))
    conn.commit()
    conn.close()
    return {"success": True}


# ============================================================
# 行動スコアリングエンドポイント
# ============================================================

@app.get("/scores")
def get_scores(date: Optional[str] = Query(None, description="日付 (YYYY-MM-DD), デフォルトは今日")):
    """
    行動スコアを取得する
    Response: {
        date, total_minutes, focus_minutes, distract_minutes,
        session_count, derail_count, return_rate,
        score_focus, score_derail, productivity_index
    }
    """
    from backend.core.scoring import calculate_scores
    
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    
    try:
        scores = calculate_scores(date)
        return scores
    except Exception as e:
        return {"error": str(e)}


@app.get("/story")
def get_story(date: Optional[str] = Query(None, description="日付 (YYYY-MM-DD), デフォルトは今日")):
    """
    デイリーストーリーを取得する
    Response: {date, story, total_focus_minutes, total_derail_count, score}
    """
    from backend.core.scoring import generate_story
    
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    
    try:
        story_data = generate_story(date)
        return story_data
    except Exception as e:
        return {"error": str(e)}


@app.get("/session-blocks")
def get_session_blocks(date: Optional[str] = Query(None, description="日付 (YYYY-MM-DD), デフォルトは今日")):
    """
    セッションブロック分析を取得する
    Response: [{start_time, end_time, duration_seconds, category, is_focus, is_derail, focus_level, session_count}]
    """
    from backend.core.scoring import BehaviorScorer
    
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    
    try:
        scorer = BehaviorScorer()
        blocks = scorer.analyze_session_blocks(date)
        
        # datetimeオブジェクトを文字列に変換
        for block in blocks:
            block['start_time'] = block['start_time'].isoformat()
            block['end_time'] = block['end_time'].isoformat()
        
        return {"date": date, "blocks": blocks}
    except Exception as e:
        return {"error": str(e)}


@app.post("/session-blocks/save")
def save_session_blocks(date: Optional[str] = Query(None, description="日付 (YYYY-MM-DD), デフォルトは今日")):
    """
    セッションブロックをデータベースに保存する
    Response: {success: bool, message: str}
    """
    from backend.core.scoring import BehaviorScorer
    
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    
    try:
        scorer = BehaviorScorer()
        success = scorer.save_session_blocks(date)
        if success:
            return {"success": True, "message": f"Session blocks for {date} saved successfully"}
        else:
            return {"success": False, "message": "Failed to save session blocks"}
    except Exception as e:
        return {"success": False, "message": str(e)}


# ============================================================
# Category Rules エンドポイント（新しい構造対応）
# ============================================================

class CategoryRuleCreate(BaseModel):
    pattern: str
    category: str
    priority: int = 0
    is_regex: bool = False
    enabled: bool = True


class CategoryRuleUpdate(BaseModel):
    pattern: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[int] = None
    is_regex: Optional[bool] = None
    enabled: Optional[bool] = None


class CategoryRuleTest(BaseModel):
    pattern: str
    service_name: str
    is_regex: bool = False


class TagCreate(BaseModel):
    name: str
    color: Optional[str] = None


class TagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class ServiceTagAssign(BaseModel):
    service: str
    tag_id: int


class NotificationSettingsUpdate(BaseModel):
    enabled: bool
    time: Optional[str] = None


@app.get("/category-rules")
def get_category_rules_endpoint(enabled_only: bool = Query(True, description="有効なルールのみ取得")):
    """
    カテゴリルール一覧を取得
    Response: [{id, pattern, category, priority, is_regex, enabled, created_at, updated_at}]
    """
    from backend.core.database import get_category_rules
    
    try:
        rules = get_category_rules(enabled_only=enabled_only)
        return rules
    except Exception as e:
        return {"error": str(e)}


@app.get("/category-rules/{rule_id}")
def get_category_rule_endpoint(rule_id: int):
    """
    単一のカテゴリルールを取得
    Response: {id, pattern, category, priority, is_regex, enabled, created_at, updated_at}
    """
    from backend.core.database import get_category_rule
    
    try:
        rule = get_category_rule(rule_id)
        if not rule:
            return {"error": "Rule not found"}
        return rule
    except Exception as e:
        return {"error": str(e)}


@app.post("/category-rules")
def create_category_rule(rule: CategoryRuleCreate):
    """
    新しいカテゴリルールを作成
    Response: {success: bool, id: int}
    """
    from backend.core.database import insert_category_rule
    
    try:
        rule_id = insert_category_rule(
            pattern=rule.pattern,
            category=rule.category,
            priority=rule.priority,
            is_regex=rule.is_regex,
            enabled=rule.enabled
        )
        return {"success": True, "id": rule_id}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.put("/category-rules/{rule_id}")
def update_category_rule_endpoint(rule_id: int, rule: CategoryRuleUpdate):
    """
    カテゴリルールを更新
    Response: {success: bool}
    """
    from backend.core.database import update_category_rule
    
    try:
        update_category_rule(
            rule_id=rule_id,
            pattern=rule.pattern,
            category=rule.category,
            priority=rule.priority,
            is_regex=rule.is_regex,
            enabled=rule.enabled
        )
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.delete("/category-rules/{rule_id}")
def delete_category_rule_endpoint(rule_id: int):
    """
    カテゴリルールを削除
    Response: {success: bool}
    """
    from backend.core.database import delete_category_rule
    
    try:
        delete_category_rule(rule_id)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/category-rules/test")
def test_category_rule_endpoint(test: CategoryRuleTest):
    """
    ルールがサービス名にマッチするかテスト
    Response: {matches: bool}
    """
    from backend.core.database import test_category_rule
    
    try:
        matches = test_category_rule(
            pattern=test.pattern,
            service_name=test.service_name,
            is_regex=test.is_regex
        )
        return {"matches": matches}
    except Exception as e:
        return {"matches": False, "error": str(e)}


# ============================================================
# Tags エンドポイント（行動タグ管理）
# ============================================================

@app.get("/tags")
def get_tags_endpoint():
    """
    すべてのタグを取得
    Response: [{id, name, color, created_at}]
    """
    from backend.core.database import get_tags
    
    try:
        tags = get_tags()
        return tags
    except Exception as e:
        return {"error": str(e)}


@app.get("/tags/{tag_id}")
def get_tag_endpoint(tag_id: int):
    """
    単一のタグを取得
    Response: {id, name, color, created_at}
    """
    from backend.core.database import get_tag
    
    try:
        tag = get_tag(tag_id)
        if not tag:
            return {"error": "Tag not found"}
        return tag
    except Exception as e:
        return {"error": str(e)}


@app.post("/tags")
def create_tag_endpoint(tag: TagCreate):
    """
    新しいタグを作成
    Response: {success: bool, id: int}
    """
    from backend.core.database import insert_tag
    
    try:
        tag_id = insert_tag(name=tag.name, color=tag.color)
        return {"success": True, "id": tag_id}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.put("/tags/{tag_id}")
def update_tag_endpoint(tag_id: int, tag: TagUpdate):
    """
    タグを更新
    Response: {success: bool}
    """
    from backend.core.database import update_tag
    
    try:
        update_tag(tag_id=tag_id, name=tag.name, color=tag.color)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.delete("/tags/{tag_id}")
def delete_tag_endpoint(tag_id: int):
    """
    タグを削除
    Response: {success: bool}
    """
    from backend.core.database import delete_tag
    
    try:
        delete_tag(tag_id)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/service-tags")
def assign_tag_to_service_endpoint(assignment: ServiceTagAssign):
    """
    サービスにタグを割り当て
    Response: {success: bool}
    """
    from backend.core.database import assign_tag_to_service
    
    try:
        assign_tag_to_service(service=assignment.service, tag_id=assignment.tag_id)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.delete("/service-tags")
def remove_tag_from_service_endpoint(service: str, tag_id: int):
    """
    サービスからタグを削除
    Response: {success: bool}
    """
    from backend.core.database import remove_tag_from_service
    
    try:
        remove_tag_from_service(service=service, tag_id=tag_id)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/service-tags/{service}")
def get_service_tags_endpoint(service: str):
    """
    サービスのタグを取得
    Response: [{id, name, color, created_at}]
    """
    from backend.core.database import get_service_tags
    
    try:
        tags = get_service_tags(service)
        return tags
    except Exception as e:
        return {"error": str(e)}


@app.get("/tags/stats")
def get_tag_usage_stats_endpoint(date: Optional[str] = Query(None, description="日付 (YYYY-MM-DD)")):
    """
    タグ別の使用統計を取得
    Response: [{name, color, usage_count, total_duration}]
    """
    from backend.core.database import get_tag_usage_stats
    
    try:
        stats = get_tag_usage_stats(date=date)
        return stats
    except Exception as e:
        return {"error": str(e)}


@app.get("/daily-story")
def get_daily_story_endpoint(date: Optional[str] = Query(None, description="日付 (YYYY-MM-DD), デフォルトは今日")):
    """
    デイリーストーリーを取得
    Response: {date, story, total_focus_minutes, total_derail_count, score}
    """
    from backend.core.database import get_daily_story
    
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    
    try:
        story = get_daily_story(date)
        if not story:
            return {
                "date": date,
                "story": "今日のデータはまだありません",
                "total_focus_minutes": 0,
                "total_derail_count": 0,
                "score": 0
            }
        return story
    except Exception as e:
        return {
            "date": date,
            "story": f"エラー: {str(e)}",
            "total_focus_minutes": 0,
            "total_derail_count": 0,
            "score": 0
        }


@app.get("/session-blocks")
def get_session_blocks_endpoint(date: Optional[str] = Query(None, description="日付 (YYYY-MM-DD), デフォルトは今日")):
    """
    セッションブロックを取得
    Response: {date, blocks: [{start_time, end_time, duration_seconds, category, is_focus, is_derail, focus_level, session_count}]}
    """
    from backend.core.database import get_session_blocks
    
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    
    try:
        blocks = get_session_blocks(date)
        return {
            "date": date,
            "blocks": blocks
        }
    except Exception as e:
        return {
            "date": date,
            "blocks": [],
            "error": str(e)
        }


# ============================================================
# Notification Settings エンドポイント（通知設定管理）
# ============================================================

@app.get("/notification-settings")
def get_notification_settings_endpoint():
    """
    通知設定を取得
    Response: {id, enabled, time, last_sent, created_at, updated_at}
    """
    from backend.core.database import get_notification_settings
    
    try:
        settings = get_notification_settings()
        if not settings:
            # デフォルト設定を返す
            return {
                "id": 1,
                "enabled": True,
                "time": "09:00",
                "last_sent": None,
                "created_at": None,
                "updated_at": None
            }
        return settings
    except Exception as e:
        return {"error": str(e)}


@app.put("/notification-settings")
def update_notification_settings_endpoint(settings: NotificationSettingsUpdate):
    """
    通知設定を更新
    Response: {success: bool}
    """
    from backend.core.database import upsert_notification_settings
    
    try:
        upsert_notification_settings(enabled=settings.enabled, time=settings.time)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/notifications/send-daily-story")
def send_daily_story_notification():
    """
    デイリーストーリー通知を送信（テスト用）
    Response: {success: bool, message: str}
    """
    from backend.core.database import get_daily_story, update_last_sent, get_notification_settings
    
    try:
        settings = get_notification_settings()
        if not settings or not settings.get('enabled'):
            return {"success": False, "message": "通知が無効になっています"}
        
        today = datetime.now().strftime("%Y-%m-%d")
        story = get_daily_story(today)
        
        if not story:
            return {"success": False, "message": "今日のストーリーがありません"}
        
        # 通知送信ロジック（実際の通知実装は環境に依存）
        # ここではログに出力するだけ
        print(f"[NOTIFICATION] Daily Story for {today}:")
        print(story.get('story', ''))
        
        # 最終送信時刻を更新
        update_last_sent()
        
        return {"success": True, "message": "通知を送信しました"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# v1ルーターをアプリケーションにマウント
app.include_router(v1_router)

# WebSocketエンドポイント
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # 受信したメッセージをブロードキャスト
            await manager.broadcast({
                "type": "message",
                "data": data,
                "timestamp": datetime.now().isoformat()
            })
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# バックアップエンドポイント
@app.post("/backup/create", tags=["backup"])
def create_backup(name: Optional[str] = None):
    """
    データベースバックアップを作成
    Response: {success: bool, backup_path: str}
    """
    from backend.core.backup import backup_manager
    
    try:
        backup_path = backup_manager.create_backup(name)
        return {"success": True, "backup_path": backup_path}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/backup/list", tags=["backup"])
def list_backups():
    """
    バックアップ一覧を取得
    Response: {success: bool, backups: list}
    """
    from backend.core.backup import backup_manager
    
    try:
        backups = backup_manager.list_backups()
        return {"success": True, "backups": backups}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/backup/restore", tags=["backup"])
def restore_backup(name: str):
    """
    バックアップから復元
    Response: {success: bool, message: str}
    """
    from backend.core.backup import backup_manager
    
    try:
        success = backup_manager.restore_backup(name)
        if success:
            return {"success": True, "message": "復元が完了しました"}
        else:
            return {"success": False, "message": "復元に失敗しました"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.delete("/backup/{name}", tags=["backup"])
def delete_backup(name: str):
    """
    バックアップを削除
    Response: {success: bool, message: str}
    """
    from backend.core.backup import backup_manager
    
    try:
        success = backup_manager.delete_backup(name)
        if success:
            return {"success": True, "message": "削除が完了しました"}
        else:
            return {"success": False, "message": "削除に失敗しました"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/weekly-report")
def get_weekly_report(start_date: Optional[str] = Query(None, description="開始日 (YYYY-MM-DD), デフォルトは今週の月曜日")):
    """
    週次レポートを取得
    Response: {week_summary, daily_summaries, insights, trends}
    """
    from datetime import timedelta
    
    if start_date is None:
        # 今週の月曜日を取得
        today = datetime.now()
        start_date = (today - timedelta(days=today.weekday())).strftime("%Y-%m-%d")
    
    conn = get_db()
    cur = conn.cursor()
    
    # 週の範囲を計算
    start_dt = datetime.fromisoformat(start_date)
    end_dt = start_dt + timedelta(days=6)
    end_date = end_dt.strftime("%Y-%m-%d")
    
    # 週次サマリー
    placeholders = ','.join('?' * len(config.EXCLUDED_SERVICES))
    cur.execute(f'''
        SELECT 
            COALESCE(SUM(duration_seconds), 0) as total_seconds,
            COUNT(DISTINCT DATE(start_time)) as active_days,
            COUNT(*) as session_count
        FROM sessions 
        WHERE DATE(start_time) >= ? AND DATE(start_time) <= ? 
        AND service NOT IN ({placeholders})
    ''', (start_date, end_date, *config.EXCLUDED_SERVICES))
    week_summary = cur.fetchone()
    
    # 日次サマリー
    cur.execute(f'''
        SELECT 
            DATE(start_time) as date,
            COALESCE(SUM(duration_seconds), 0) as total_seconds,
            COUNT(*) as session_count
        FROM sessions 
        WHERE DATE(start_time) >= ? AND DATE(start_time) <= ? 
        AND service NOT IN ({placeholders})
        GROUP BY DATE(start_time)
        ORDER BY date
    ''', (start_date, end_date, *config.EXCLUDED_SERVICES))
    daily_summaries = []
    for row in cur.fetchall():
        daily_summaries.append({
            "date": row['date'],
            "total_minutes": int(row['total_seconds'] / 60),
            "session_count": row['session_count']
        })
    
    # トップサービス
    cur.execute(f'''
        SELECT 
            service,
            SUM(duration_seconds) as total_seconds
        FROM sessions 
        WHERE DATE(start_time) >= ? AND DATE(start_time) <= ? 
        AND service NOT IN ({placeholders})
        GROUP BY service
        ORDER BY total_seconds DESC
        LIMIT 10
    ''', (start_date, end_date, *config.EXCLUDED_SERVICES))
    top_services = []
    for row in cur.fetchall():
        top_services.append({
            "service": _mask(row['service']),
            "total_minutes": int(row['total_seconds'] / 60)
        })
    
    conn.close()
    
    return {
        "period": {
            "start_date": start_date,
            "end_date": end_date
        },
        "summary": {
            "total_minutes": int(week_summary['total_seconds'] / 60),
            "active_days": week_summary['active_days'],
            "session_count": week_summary['session_count'],
            "avg_daily_minutes": int((week_summary['total_seconds'] / 60) / max(week_summary['active_days'], 1))
        },
        "daily_summaries": daily_summaries,
        "top_services": top_services
    }


@app.get("/transition-analysis")
def get_transition_analysis(date: Optional[str] = Query(None, description="日付 (YYYY-MM-DD), デフォルトは今日")):
    """
    高度なサービス遷移分析
    Response: {transition_matrix, common_paths, return_rates, focus_interruptions}
    """
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    
    conn = get_db()
    cur = conn.cursor()
    
    # 遷移行列
    cur.execute('''
        SELECT 
            from_service,
            to_service,
            COUNT(*) as transition_count
        FROM transitions 
        WHERE DATE(timestamp) = ?
        GROUP BY from_service, to_service
        ORDER BY transition_count DESC
    ''', (date,))
    transitions = cur.fetchall()
    
    # 遷移行列の構築
    transition_matrix = {}
    for row in transitions:
        from_service = _mask(row['from_service'])
        to_service = _mask(row['to_service'])
        if from_service not in transition_matrix:
            transition_matrix[from_service] = {}
        transition_matrix[from_service][to_service] = row['transition_count']
    
    # 一般的な遷移パス
    cur.execute('''
        SELECT 
            from_service,
            to_service,
            COUNT(*) as count
        FROM transitions 
        WHERE DATE(timestamp) = ?
        GROUP BY from_service, to_service
        ORDER BY count DESC
        LIMIT 20
    ''', (date,))
    common_paths = []
    for row in cur.fetchall():
        common_paths.append({
            "from": _mask(row['from_service']),
            "to": _mask(row['to_service']),
            "count": row['count']
        })
    
    # カテゴリ間の復帰率
    cur.execute('''
        SELECT 
            from_category,
            to_category,
            COUNT(*) as transitions,
            SUM(CASE WHEN from_category = to_category THEN 1 ELSE 0 END) as returns
        FROM transitions 
        WHERE DATE(timestamp) = ?
        GROUP BY from_category, to_category
    ''', (date,))
    return_rates = []
    for row in cur.fetchall():
        if row['transitions'] > 0:
            return_rates.append({
                "from_category": row['from_category'],
                "to_category": row['to_category'],
                "return_rate": row['returns'] / row['transitions']
            })
    
    # 集中カテゴリへの中断分析
    focus_placeholders = ','.join('?' * len(config.FOCUS_CATEGORIES))
    cur.execute(f'''
        SELECT 
            from_category,
            to_category,
            COUNT(*) as interruption_count
        FROM transitions 
        WHERE DATE(timestamp) = ?
        AND from_category IN ({focus_placeholders})
        AND to_category NOT IN ({focus_placeholders})
        GROUP BY from_category, to_category
        ORDER BY interruption_count DESC
    ''', (date, *config.FOCUS_CATEGORIES, *config.FOCUS_CATEGORIES))
    focus_interruptions = []
    for row in cur.fetchall():
        focus_interruptions.append({
            "focus_category": row['from_category'],
            "interruption_category": row['to_category'],
            "count": row['interruption_count']
        })
    
    conn.close()
    
    return {
        "date": date,
        "transition_matrix": transition_matrix,
        "common_paths": common_paths,
        "return_rates": return_rates,
        "focus_interruptions": focus_interruptions
    }


@app.get("/monthly-report")
def get_monthly_report(year: Optional[int] = Query(None, description="年, デフォルトは今年"), month: Optional[int] = Query(None, description="月, デフォルトは今月")):
    """
    月次レポートを取得
    Response: {month_summary, weekly_summaries, trends, insights}
    """
    from datetime import timedelta
    import calendar
    
    if year is None:
        year = datetime.now().year
    if month is None:
        month = datetime.now().month
    
    conn = get_db()
    cur = conn.cursor()
    
    # 月の範囲を計算
    first_day = datetime(year, month, 1)
    last_day = datetime(year, month, calendar.monthrange(year, month)[1])
    
    start_date = first_day.strftime("%Y-%m-%d")
    end_date = last_day.strftime("%Y-%m-%d")
    
    # 月次サマリー
    placeholders = ','.join('?' * len(config.EXCLUDED_SERVICES))
    cur.execute(f'''
        SELECT 
            COALESCE(SUM(duration_seconds), 0) as total_seconds,
            COUNT(DISTINCT DATE(start_time)) as active_days,
            COUNT(*) as session_count
        FROM sessions 
        WHERE DATE(start_time) >= ? AND DATE(start_time) <= ? 
        AND service NOT IN ({placeholders})
    ''', (start_date, end_date, *config.EXCLUDED_SERVICES))
    month_summary = cur.fetchone()
    
    # 週次サマリー
    cur.execute(f'''
        SELECT 
            strftime('%Y-%W', start_time) as week,
            COALESCE(SUM(duration_seconds), 0) as total_seconds,
            COUNT(DISTINCT DATE(start_time)) as active_days
        FROM sessions 
        WHERE DATE(start_time) >= ? AND DATE(start_time) <= ? 
        AND service NOT IN ({placeholders})
        GROUP BY strftime('%Y-%W', start_time)
        ORDER BY week
    ''', (start_date, end_date, *config.EXCLUDED_SERVICES))
    weekly_summaries = []
    for row in cur.fetchall():
        weekly_summaries.append({
            "week": row['week'],
            "total_minutes": int(row['total_seconds'] / 60),
            "active_days": row['active_days']
        })
    
    # カテゴリ別利用時間
    cur.execute(f'''
        SELECT 
            category,
            SUM(duration_seconds) as total_seconds
        FROM sessions 
        WHERE DATE(start_time) >= ? AND DATE(start_time) <= ? 
        AND service NOT IN ({placeholders})
        GROUP BY category
        ORDER BY total_seconds DESC
    ''', (start_date, end_date, *config.EXCLUDED_SERVICES))
    category_usage = []
    for row in cur.fetchall():
        category_usage.append({
            "category": row['category'],
            "total_minutes": int(row['total_seconds'] / 60)
        })
    
    # 時間帯別分析
    cur.execute(f'''
        SELECT 
            CAST(strftime('%H', start_time) AS INTEGER) as hour,
            SUM(duration_seconds) as total_seconds
        FROM sessions 
        WHERE DATE(start_time) >= ? AND DATE(start_time) <= ? 
        AND service NOT IN ({placeholders})
        GROUP BY hour
        ORDER BY hour
    ''', (start_date, end_date, *config.EXCLUDED_SERVICES))
    hourly_usage = []
    for row in cur.fetchall():
        hourly_usage.append({
            "hour": row['hour'],
            "total_minutes": int(row['total_seconds'] / 60)
        })
    
    conn.close()
    
    return {
        "period": {
            "year": year,
            "month": month,
            "start_date": start_date,
            "end_date": end_date
        },
        "summary": {
            "total_minutes": int(month_summary['total_seconds'] / 60),
            "active_days": month_summary['active_days'],
            "session_count": month_summary['session_count'],
            "avg_daily_minutes": int((month_summary['total_seconds'] / 60) / max(month_summary['active_days'], 1))
        },
        "weekly_summaries": weekly_summaries,
        "category_usage": category_usage,
        "hourly_usage": hourly_usage
    }


@app.get("/export/data")
def export_data(
    format: str = Query("json", description="エクスポート形式 (json/csv)"),
    start_date: Optional[str] = Query(None, description="開始日 (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="終了日 (YYYY-MM-DD)")
):
    """
    データをエクスポート
    Response: ファイルダウンロード
    """
    from fastapi.responses import JSONResponse, StreamingResponse
    import csv
    import io
    
    conn = get_db()
    cur = conn.cursor()
    
    # セッションデータを取得
    placeholders = ','.join('?' * len(config.EXCLUDED_SERVICES))
    date_filter = ""
    params = []
    
    if start_date and end_date:
        date_filter = "WHERE DATE(start_time) >= ? AND DATE(start_time) <= ? AND service NOT IN ({})"
        params = [start_date, end_date] + config.EXCLUDED_SERVICES
    elif start_date:
        date_filter = "WHERE DATE(start_time) >= ? AND service NOT IN ({})"
        params = [start_date] + config.EXCLUDED_SERVICES
    elif end_date:
        date_filter = "WHERE DATE(start_time) <= ? AND service NOT IN ({})"
        params = [end_date] + config.EXCLUDED_SERVICES
    else:
        date_filter = "WHERE service NOT IN ({})"
        params = config.EXCLUDED_SERVICES
    
    cur.execute(f'''
        SELECT 
            app_name,
            service,
            category,
            start_time,
            duration_seconds
        FROM sessions 
        {date_filter}
        ORDER BY start_time
    '''.format(placeholders), params)
    
    sessions = cur.fetchall()
    conn.close()
    
    # データをフォーマット
    data = []
    for row in sessions:
        data.append({
            "app_name": row['app_name'],
            "service": _mask(row['service']),
            "category": row['category'],
            "start_time": row['start_time'],
            "duration_seconds": row['duration_seconds']
        })
    
    if format == "csv":
        # CSVエクスポート
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["app_name", "service", "category", "start_time", "duration_seconds"])
        writer.writeheader()
        writer.writerows(data)
        
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=actiontracker_data.csv"}
        )
    else:
        # JSONエクスポート
        return JSONResponse(
            content=data,
            headers={"Content-Disposition": "attachment; filename=actiontracker_data.json"}
        )
