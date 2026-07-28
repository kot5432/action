from fastapi import FastAPI, Query, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
from typing import Optional
import sqlite3
import json
from pydantic import BaseModel

# 設定管理
from backend.core.config import config
from backend.core.auth import verify_api_key_header
from backend.core.cache import cache_result

# 条件付き認証デコレーター
def optional_auth():
    """認証が有効な場合のみ認証を要求"""
    if config.AUTH_ENABLED:
        return Depends(verify_api_key_header)
    return lambda: None

app = FastAPI(title="ActionTracker API", version="2.0.0")

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
