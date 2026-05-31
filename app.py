from flask import Flask, jsonify, render_template, request
import csv
import shutil
import json
import time
import os
from collections import defaultdict
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def data_path(name):
    return os.path.join(BASE_DIR, name)


app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "templates"),
    static_folder=os.path.join(BASE_DIR, "static"),
)

def get_logs():
    rows = []
    log_file = data_path("log.csv")
    if not os.path.exists(log_file):
        return rows

    read_path = log_file
    try:
        shutil.copy(log_file, data_path("temp.csv"))
        read_path = data_path("temp.csv")
    except OSError:
        pass

    try:
        with open(read_path, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            for r in reader:
                if len(r) >= 5:
                    try:
                        sec = int(r[4])
                        rows.append({
                            "date": r[0], "start": r[1], "end": r[2], "app": r[3], "sec": sec
                        })
                    except ValueError:
                        pass
    except FileNotFoundError:
        pass
    return rows

def normalize_app_name(app):
    """アプリ名を人間が読みやすい短い名前に正規化する"""
    if not app:
        return "不明"
    app_lower = app.lower()
    exe_match = app.split('.exe')[0].split('[')[0].strip().lower() + '.exe'
    if 'cursor' in app_lower:          return 'Cursor'
    if 'msedge' in app_lower:          return 'Edge'
    if 'chrome' in app_lower:
        return 'YouTube' if 'youtube' in app_lower else 'Chrome'
    if 'youtube' in app_lower:         return 'YouTube'
    if 'firefox' in app_lower:         return 'Firefox'
    if 'code.exe' in app_lower or 'vs code' in app_lower or 'vscode' in app_lower: return 'VS Code'
    if 'chatgpt' in app_lower:         return 'ChatGPT'
    if 'slack' in app_lower:           return 'Slack'
    if 'discord' in app_lower:         return 'Discord'
    if 'zoom' in app_lower:            return 'Zoom'
    if 'teams' in app_lower:           return 'Teams'
    if 'notion' in app_lower:          return 'Notion'
    if 'figma' in app_lower:           return 'Figma'
    if 'antigravity' in app_lower:     return 'Antigravity'
    if 'explorer.exe' in app_lower:    return 'エクスプローラー'
    if 'shellexperiencehost' in app_lower or 'startmenuexperiencehost' in app_lower: return 'Windowsシェル'
    if 'spotify' in app_lower:         return 'Spotify'
    if 'windowsterminal' in app_lower or 'pwsh' in app_lower or 'powershell' in app_lower: return 'ターミナル'
    if app_lower.strip() in ('unknown', ''): return '不明'
    if 'uiwinmgr' in app_lower:        return 'システム通知'
    if 'searchhost' in app_lower or 'searchapp' in app_lower: return '検索'
    # .exe ベース名を返す
    import re
    m = re.match(r'^([^\s\[]+)\.exe', app, re.IGNORECASE)
    if m:
        return m.group(1)
    return re.sub(r'\s*\[.*?\]', '', app).strip() or '不明'

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/summary")
def api_summary():
    date_query = request.args.get("date", datetime.now().strftime("%Y-%m-%d"))
    logs = get_logs()
    
    focus_sessions = []
    current_session = None
    max_focus_sec = 0
    max_focus_start = ""
    max_focus_end = ""
    
    for r in logs:
        if r["date"] == date_query:
            # Track focus sessions (continuous usage of same app)
            if current_session and current_session["app"] == r["app"]:
                current_session["duration"] += r["sec"]
                current_session["end"] = r["end"]
            else:
                if current_session:
                    focus_sessions.append(current_session)
                current_session = {"app": r["app"], "duration": r["sec"], "start": r["start"], "end": r["end"]}
    
    if current_session:
        focus_sessions.append(current_session)
    
    # Calculate metrics
    if focus_sessions:
        max_focus_session = max(focus_sessions, key=lambda x: x["duration"])
        max_focus_sec = max_focus_session["duration"]
        max_focus_start = max_focus_session["start"]
        max_focus_end = max_focus_session["end"]
        avg_focus_sec = sum(s["duration"] for s in focus_sessions) / len(focus_sessions)
    else:
        avg_focus_sec = 0
    
    # Calculate drift count (sessions shorter than 5 minutes)
    drift_count = sum(1 for s in focus_sessions if s["duration"] < 300)
    
    return jsonify({
        "max_focus": max_focus_sec,
        "max_focus_start": max_focus_start,
        "max_focus_end": max_focus_end,
        "avg_focus": int(avg_focus_sec),
        "drift_count": drift_count
    })

@app.route("/api/timeline")
def api_timeline():
    date_query = request.args.get("date", datetime.now().strftime("%Y-%m-%d"))
    logs = get_logs()
    
    timeline = []
    for r in logs:
        if r["date"] == date_query:
            timeline.append({
                "start": r["start"],
                "end": r["end"],
                "app": r["app"],
                "sec": r["sec"]
            })
    return jsonify(timeline)



@app.route("/api/transitions")
def api_transitions():
    logs = get_logs()
    transitions = defaultdict(int)
    app_totals = defaultdict(int)
    last_app = None
    
    for r in logs:
        # "msedge.exe [Title]" などからベースのアプリ名だけを抽出
        base_app = r["app"].split(" [")[0].strip()
        if base_app.lower().endswith(".exe"):
            base_app = base_app[:-4]
            
        current_app = base_app
        app_totals[current_app] += r["sec"]
        
        # 不要な短絡的な遷移は省くなども可能だが今回は全てカウント
        if last_app and last_app != current_app:
            transitions[f"{last_app} → {current_app}"] += 1
        last_app = current_app
        
    sorted_trans = [{"transition": k, "count": v} for k, v in sorted(transitions.items(), key=lambda item: item[1], reverse=True)]
    sorted_apps = [{"app": k, "sec": v} for k, v in sorted(app_totals.items(), key=lambda item: item[1], reverse=True)]
    
    return jsonify({
        "transitions": sorted_trans,
        "apps": sorted_apps
    })

@app.route("/api/current")
def api_current():
    try:
        with open(data_path("current.json"), "r", encoding="utf-8") as f:
            data = json.load(f)
        duration = int(time.time() - data.get("start_timestamp", time.time()))
        
        # Calculate context for current app
        logs = get_logs()
        current_app = data.get("current_app", "-")
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Count how many times this app was used today
        app_usage_count = 0
        total_app_duration = 0
        for r in logs:
            if r["date"] == today and r["app"] == current_app:
                app_usage_count += 1
                total_app_duration += r["sec"]
        
        avg_duration = int(total_app_duration / app_usage_count) if app_usage_count > 0 else 0
        
        return jsonify({
            "app": current_app,
            "duration": duration,
            "start_time": data.get("start_time", "-"),
            "previous_app": data.get("previous_app", "-"),
            "today_count": app_usage_count + 1,  # +1 for current session
            "avg_duration": avg_duration
        })
    except (FileNotFoundError, json.JSONDecodeError):
        return jsonify({"app": "-", "duration": 0, "start_time": "-", "previous_app": "-", "today_count": 0, "avg_duration": 0})

@app.route("/api/efficiency")
def api_efficiency():
    date_query = request.args.get("date", datetime.now().strftime("%Y-%m-%d"))
    logs = get_logs()
    
    # Calculate efficiency score based on focus time and app switches
    total_sec = 0
    switch_count = 0
    focus_sessions = []
    
    current_session = None
    
    for r in logs:
        if r["date"] == date_query:
            total_sec += r["sec"]
            switch_count += 1
            
            # Track focus sessions (continuous usage of same app)
            if current_session and current_session["app"] == r["app"]:
                current_session["duration"] += r["sec"]
            else:
                if current_session:
                    focus_sessions.append(current_session)
                current_session = {"app": r["app"], "duration": r["sec"]}
    
    if current_session:
        focus_sessions.append(current_session)
    
    # Calculate efficiency: average focus session duration / total time
    if focus_sessions:
        avg_focus_duration = sum(s["duration"] for s in focus_sessions) / len(focus_sessions)
        efficiency = min(int((avg_focus_duration / 300) * 100), 100)  # Normalize to 5min sessions
    else:
        efficiency = 0
    
    # Calculate daily average (last 7 days)
    daily_efficiency = [efficiency]  # Simplified for now
    
    # Calculate trend
    trend = 12  # Simplified for now
    
    return jsonify({
        "efficiency": efficiency,
        "daily_average": int(sum(daily_efficiency) / len(daily_efficiency)) if daily_efficiency else 0,
        "trend": trend,
        "chart_data": [60, 75, 82, 70, 85, 90, 78]  # Sample data for chart
    })

@app.route("/api/focus-collapse")
def api_focus_collapse():
    date_query = request.args.get("date", datetime.now().strftime("%Y-%m-%d"))
    logs = get_logs()
    
    collapse_points = []
    
    for i in range(len(logs) - 1):
        if logs[i]["date"] == date_query and logs[i+1]["date"] == date_query:
            current_app = logs[i]["app"]
            next_app = logs[i+1]["app"]
            
            # Detect focus collapse: long session (>5min) followed by short session or different app
            if logs[i]["sec"] >= 300 and current_app != next_app:
                collapse_points.append({
                    "time": logs[i]["end"],
                    "from": current_app,
                    "to": next_app,
                    "duration": logs[i]["sec"]
                })
    
    return jsonify({
        "collapse_points": collapse_points
    })

@app.route("/api/goal", methods=["GET", "POST"])
def api_goal():
    if request.method == "POST":
        data = request.json
        goal_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "goals": data.get("goals", {}),
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        try:
            with open(data_path("goals.json"), "w", encoding="utf-8") as f:
                json.dump(goal_data, f, ensure_ascii=False, indent=2)
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)})
    else:
        try:
            with open(data_path("goals.json"), "r", encoding="utf-8") as f:
                goal_data = json.load(f)
            return jsonify(goal_data)
        except (FileNotFoundError, json.JSONDecodeError):
            return jsonify({"goals": {}})

@app.route("/api/goal-diff")
def api_goal_diff():
    date_query = request.args.get("date", datetime.now().strftime("%Y-%m-%d"))
    logs = get_logs()
    
    try:
        with open(data_path("goals.json"), "r", encoding="utf-8") as f:
            goal_data = json.load(f)
        goals = goal_data.get("goals", {})
    except (FileNotFoundError, json.JSONDecodeError):
        goals = {}
    
    # Calculate actual usage by app
    actual_usage = {}
    for r in logs:
        if r["date"] == date_query:
            app = r["app"]
            if app not in actual_usage:
                actual_usage[app] = 0
            actual_usage[app] += r["sec"]
    
    # Calculate differences
    diff = []
    for app, goal_sec in goals.items():
        actual_sec = actual_usage.get(app, 0)
        diff_sec = actual_sec - goal_sec
        diff.append({
            "app": app,
            "goal": goal_sec,
            "actual": actual_sec,
            "diff": diff_sec
        })
    
    return jsonify({
        "diff": diff,
        "goals": goals,
        "actual": actual_usage
    })

@app.route("/api/insights")
def api_insights():
    date_query = request.args.get("date", datetime.now().strftime("%Y-%m-%d"))
    logs = get_logs()
    
    insights = []
    
    # Calculate total focus time
    total_focus_sec = 0
    for r in logs:
        if r["date"] == date_query:
            total_focus_sec += r["sec"]
    
    insights.append({
        "type": "focus_time",
        "title": "集中時間",
        "value": formatSec(total_focus_sec)
    })
    
    # Find longest focus session
    max_focus_sec = 0
    max_focus_start = ""
    max_focus_end = ""
    
    current_session = None
    for r in logs:
        if r["date"] == date_query:
            if current_session and current_session["app"] == r["app"]:
                current_session["duration"] += r["sec"]
                current_session["end"] = r["end"]
            else:
                if current_session:
                    if current_session["duration"] > max_focus_sec:
                        max_focus_sec = current_session["duration"]
                        max_focus_start = current_session["start"]
                        max_focus_end = current_session["end"]
                current_session = {"app": r["app"], "duration": r["sec"], "start": r["start"], "end": r["end"]}
    
    if current_session and current_session["duration"] > max_focus_sec:
        max_focus_sec = current_session["duration"]
        max_focus_start = current_session["start"]
        max_focus_end = current_session["end"]
    
    insights.append({
        "type": "longest_focus",
        "title": "最長集中",
        "value": f"{max_focus_start}〜{max_focus_end} ({formatSec(max_focus_sec)})"
    })
    
    # Count transitions from browser to YouTube
    browser_to_youtube = 0
    for i in range(len(logs) - 1):
        if logs[i]["date"] == date_query and logs[i+1]["date"] == date_query:
            from_app = logs[i]["app"].lower()
            to_app = logs[i+1]["app"].lower()
            if "chrome" in from_app or "browser" in from_app or "edge" in from_app:
                if "youtube" in to_app:
                    browser_to_youtube += 1
    
    if browser_to_youtube > 0:
        insights.append({
            "type": "transition",
            "title": "ブラウザからYouTubeへの移動",
            "value": f"{browser_to_youtube}回"
        })
    
    # Calculate collapse points by source
    collapse_sources = {}
    for i in range(len(logs) - 1):
        if logs[i]["date"] == date_query and logs[i+1]["date"] == date_query:
            if logs[i]["sec"] >= 300 and logs[i]["app"] != logs[i+1]["app"]:
                from_app = logs[i]["app"].lower()
                if "browser" in from_app or "chrome" in from_app or "edge" in from_app:
                    collapse_sources["browser"] = collapse_sources.get("browser", 0) + 1
                else:
                    collapse_sources[logs[i]["app"]] = collapse_sources.get(logs[i]["app"], 0) + 1
    
    total_collapses = sum(collapse_sources.values())
    if total_collapses > 0:
        browser_collapse_pct = int((collapse_sources.get("browser", 0) / total_collapses) * 100)
        insights.append({
            "type": "collapse_source",
            "title": "集中崩壊の発生源",
            "value": f"ブラウザ経由: {browser_collapse_pct}%"
        })
    
    return jsonify({
        "insights": insights
    })

@app.route("/api/habits")
def api_habits():
    date_query = request.args.get("date", datetime.now().strftime("%Y-%m-%d"))
    logs = get_logs()
    
    habits = []
    
    # Filter logs for the specified date
    today_logs = [r for r in logs if r["date"] == date_query]
    
    if not today_logs:
        return jsonify({"habits": []})
    
    # Habit 1: Start delay (開始遅延癖)
    # Calculate time from first log to 9:00 AM
    if today_logs:
        first_start = today_logs[0]["start"]
        first_hour = int(first_start.split(":")[0])
        first_min = int(first_start.split(":")[1])
        first_time_minutes = first_hour * 60 + first_min
        expected_start_minutes = 9 * 60  # 9:00 AM
        delay_minutes = max(0, first_time_minutes - expected_start_minutes)
        
        if delay_minutes > 0:
            habits.append({
                "type": "start_delay",
                "title": "開始遅延癖",
                "description": f"作業開始まで平均{delay_minutes}分",
                "icon": "⏰"
            })
    
    # Habit 2: Research wandering (調べ物迷子癖)
    # Calculate Chrome/browser usage and its relationship with other apps
    browser_usage = 0
    browser_related_usage = 0
    browser_apps = ["chrome", "edge", "firefox", "safari", "browser"]
    
    for r in today_logs:
        app_lower = r["app"].lower()
        if any(b in app_lower for b in browser_apps):
            browser_usage += r["sec"]
    
    # Check if browser usage is high
    if browser_usage > 1800:  # More than 30 minutes
        habits.append({
            "type": "research_wandering",
            "title": "調べ物迷子癖",
            "description": f"ブラウザ滞在時間平均{formatSec(browser_usage)}",
            "icon": "🔍"
        })
    
    # Habit 3: Time-based focus (時間帯集中型)
    # Calculate focus time by hour
    hourly_focus = defaultdict(int)
    hourly_sessions = defaultdict(int)
    
    for r in today_logs:
        hour = int(r["start"].split(":")[0])
        hourly_focus[hour] += r["sec"]
        hourly_sessions[hour] += 1
    
    if hourly_focus:
        max_hour = max(hourly_focus.keys(), key=lambda h: hourly_focus[h])
        max_focus_time = hourly_focus[max_hour]
        avg_session_at_peak = hourly_focus[max_hour] / hourly_sessions[max_hour] if hourly_sessions[max_hour] > 0 else 0
        
        if max_hour >= 14 and max_hour <= 16:
            habits.append({
                "type": "afternoon_focus",
                "title": "午後集中型",
                "description": f"14〜16時が最高効率（平均{formatSec(int(avg_session_at_peak))}）",
                "icon": "🌅"
            })
        elif max_hour >= 9 and max_hour <= 11:
            habits.append({
                "type": "morning_focus",
                "title": "午前集中型",
                "description": f"9〜11時が最高効率（平均{formatSec(int(avg_session_at_peak))}）",
                "icon": "🌅"
            })
    
    # Habit 4: App switching pattern (アプリ切り替え癖)
    # Calculate number of app switches
    app_switches = 0
    for i in range(len(today_logs) - 1):
        if today_logs[i]["app"] != today_logs[i+1]["app"]:
            app_switches += 1
    
    if app_switches > 20:
        habits.append({
            "type": "frequent_switching",
            "title": "頻繁切り替え癖",
            "description": f"1日のアプリ切り替え回数{app_switches}回",
            "icon": "🔄"
        })
    
    # Habit 5: Short session pattern (短時間集中癖)
    # Calculate average session duration
    session_durations = [r["sec"] for r in today_logs]
    if session_durations:
        avg_session = sum(session_durations) / len(session_durations)
        if avg_session < 120:  # Less than 2 minutes
            habits.append({
                "type": "short_sessions",
                "title": "短時間集中癖",
                "description": f"平均セッション時間{formatSec(int(avg_session))}",
                "icon": "⚡"
            })
    
    return jsonify({
        "habits": habits
    })

@app.route("/api/time-analysis")
def api_time_analysis():
    date_query = request.args.get("date", datetime.now().strftime("%Y-%m-%d"))
    logs = get_logs()
    
    # Filter logs for the specified date
    today_logs = [r for r in logs if r["date"] == date_query]
    
    if not today_logs:
        return jsonify({"hourly_blocks": []})
    
    # Group by hour
    hourly_blocks = defaultdict(list)
    
    for r in today_logs:
        hour = int(r["start"].split(":")[0])
        start_min = int(r["start"].split(":")[1])
        end_min = int(r["end"].split(":")[1])
        
        # Calculate start and end positions within the hour (0-60 minutes)
        start_pos = start_min
        end_pos = end_min
        
        hourly_blocks[hour].append({
            "app": r["app"],
            "start_pos": start_pos,
            "end_pos": end_pos,
            "sec": r["sec"]
        })
    
    # Convert to response format
    blocks = []
    for hour in sorted(hourly_blocks.keys()):
        hour_data = {
            "hour": hour,
            "hour_range": f"{hour}:00 - {hour+1}:00",
            "segments": hourly_blocks[hour]
        }
        blocks.append(hour_data)
    
    return jsonify({
        "hourly_blocks": blocks
    })

@app.route("/api/app-history", methods=["GET"])
def api_app_history():
    logs = get_logs()
    
    # Normalize app names to group similar apps
    def normalize_app_name(app):
        app_lower = app.lower()
        # YouTube variations
        if "youtube" in app_lower:
            return "YouTube"
        # Chrome variations
        if "chrome" in app_lower or "browser" in app_lower:
            return "Chrome"
        # VS Code variations
        if "vs code" in app_lower or "code" in app_lower:
            return "VS Code"
        # Edge variations
        if "edge" in app_lower:
            return "Edge"
        # Firefox variations
        if "firefox" in app_lower:
            return "Firefox"
        # Safari variations
        if "safari" in app_lower:
            return "Safari"
        # Slack variations
        if "slack" in app_lower:
            return "Slack"
        # Discord variations
        if "discord" in app_lower:
            return "Discord"
        # Zoom variations
        if "zoom" in app_lower:
            return "Zoom"
        # Teams variations
        if "teams" in app_lower:
            return "Teams"
        # Notion variations
        if "notion" in app_lower:
            return "Notion"
        # Figma variations
        if "figma" in app_lower:
            return "Figma"
        # Default: return original app name
        return app
    
    # Group by normalized app and date
    app_history = defaultdict(lambda: defaultdict(list))
    
    for r in logs:
        original_app = r["app"]
        normalized_app = normalize_app_name(original_app)
        date = r["date"]
        app_history[normalized_app][date].append({
            "start": r["start"],
            "end": r["end"],
            "sec": r["sec"],
            "original_app": original_app
        })
    
    # Convert to response format
    history = []
    for app, dates in app_history.items():
        app_data = {
            "app": app,
            "dates": []
        }
        for date, sessions in dates.items():
            total_sec = sum(s["sec"] for s in sessions)
            app_data["dates"].append({
                "date": date,
                "total_time": total_sec,
                "session_count": len(sessions),
                "sessions": sessions
            })
        
        # Sort dates descending
        app_data["dates"].sort(key=lambda x: x["date"], reverse=True)
        history.append(app_data)
    
    # Sort apps by total usage
    history.sort(key=lambda x: sum(d["total_time"] for d in x["dates"]), reverse=True)
    
    return jsonify({
        "history": history
    })

@app.route("/api/trends")
def api_trends():
    period = request.args.get("period", "today")
    logs = get_logs()
    
    # Filter logs based on period
    today = datetime.now().strftime("%Y-%m-%d")
    
    if period == "today":
        filtered_logs = [r for r in logs if r["date"] == today]
    elif period == "7days":
        from datetime import timedelta
        cutoff = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        filtered_logs = [r for r in logs if r["date"] >= cutoff]
    elif period == "30days":
        from datetime import timedelta
        cutoff = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        filtered_logs = [r for r in logs if r["date"] >= cutoff]
    else:  # all
        filtered_logs = logs
    
    if not filtered_logs:
        return jsonify({"trends": []})
    
    # Group by date
    daily_stats = defaultdict(lambda: {"total_time": 0, "switch_count": 0, "apps": defaultdict(int)})
    
    for r in filtered_logs:
        daily_stats[r["date"]]["total_time"] += r["sec"]
        daily_stats[r["date"]]["switch_count"] += 1
        daily_stats[r["date"]]["apps"][normalize_app_name(r["app"])] += r["sec"]
    
    # Convert to response format
    trends = []
    for date in sorted(daily_stats.keys()):
        stats = daily_stats[date]
        
        # Get top apps
        top_apps = sorted(stats["apps"].items(), key=lambda x: x[1], reverse=True)[:5]
        
        trends.append({
            "date": date,
            "total_time": stats["total_time"],
            "switch_count": stats["switch_count"],
            "top_apps": [{"app": app, "time": time} for app, time in top_apps]
        })
    
    return jsonify({
        "trends": trends
    })

@app.route("/api/time-transitions")
def api_time_transitions():
    logs = get_logs()

    # 時間帯の定義
    PERIODS = [
        {"name": "朝",   "start": 6,  "end": 12, "label": "6:00〜12:00"},
        {"name": "午後", "start": 12, "end": 17, "label": "12:00〜17:00"},
        {"name": "夕方", "start": 17, "end": 20, "label": "17:00〜20:00"},
        {"name": "夜",   "start": 20, "end": 27, "label": "20:00〜深夜"},
    ]

    def get_period(time_str):
        h = int(time_str.split(':')[0])
        for p in PERIODS:
            if p["start"] <= h < p["end"]:
                return p["name"]
        return None

    # 日付ごと・時間帯ごとにアプリシーケンスを構築
    # {date: [(period, norm_app), ...]}
    from collections import defaultdict
    daily_seqs = defaultdict(list)  # date -> [(period, norm_app)]

    prev = None
    for r in logs:
        norm = normalize_app_name(r["app"])
        period = get_period(r["start"])
        if not period:
            prev = None
            continue
        # 連続同一アプリはまとめない（遷移パターンを見たい）
        if prev is None or prev["app"] != norm or prev["period"] != period:
            daily_seqs[r["date"]].append({"period": period, "app": norm})
        prev = {"app": norm, "period": period}

    # 時間帯ごとに連続3アプリシーケンスをカウント
    period_patterns = defaultdict(lambda: defaultdict(int))  # period -> pattern_str -> count

    for date, seq in daily_seqs.items():
        for i in range(len(seq) - 2):
            a, b, c = seq[i], seq[i+1], seq[i+2]
            # 同じ時間帯内の連続3アプリ
            if a["period"] == b["period"] == c["period"]:
                pattern = f"{a['app']}\u2192{b['app']}\u2192{c['app']}"
                period_patterns[a["period"]][pattern] += 1

    # 各時間帯のTop-5パターン
    result = []
    for p in PERIODS:
        pname = p["name"]
        patterns = period_patterns.get(pname, {})
        if not patterns:
            continue
        top = sorted(patterns.items(), key=lambda x: x[1], reverse=True)[:5]
        result.append({
            "period": pname,
            "label": p["label"],
            "patterns": [
                {"steps": pat.split("\u2192"), "count": cnt}
                for pat, cnt in top
            ]
        })

    return jsonify({"periods": result})

def formatSec(seconds):
    if seconds < 60:
        return f"{seconds}秒"
    m = int(seconds / 60)
    s = seconds % 60
    if m < 60:
        return f"{m}分{s}秒"
    h = int(m / 60)
    m = m % 60
    return f"{h}時間{m}分"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)