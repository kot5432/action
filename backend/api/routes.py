import os
import json
import time
import shutil
import csv
from datetime import datetime, timedelta
import calendar
from collections import defaultdict
from flask import render_template, jsonify, request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.core.normalizer import normalize_app_name

DATA_DIR = os.path.join(ROOT, "data")

def data_path(name):
    return os.path.join(DATA_DIR, name)

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

def get_available_dates(logs):
    return sorted(set(r["date"] for r in logs))

def logs_for_date(logs, date_str):
    return [r for r in logs if r["date"] == date_str]

def day_total_sec(logs, date_str):
    return sum(r["sec"] for r in logs if r["date"] == date_str)

def day_switch_count(logs, date_str):
    day_logs = logs_for_date(logs, date_str)
    return sum(
        1 for i in range(len(day_logs) - 1)
        if day_logs[i]["app"] != day_logs[i + 1]["app"]
    )

def filter_logs_by_period(logs, period):
    today = datetime.now().strftime("%Y-%m-%d")
    if period == "today":
        return [r for r in logs if r["date"] == today]
    if period == "7days":
        cutoff = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        return [r for r in logs if r["date"] >= cutoff]
    if period == "30days":
        cutoff = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        return [r for r in logs if r["date"] >= cutoff]
    return list(logs)

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

def detect_habits(day_logs):
    habits = []
    if not day_logs:
        return habits

    first_start = day_logs[0]["start"]
    first_hour = int(first_start.split(":")[0])
    first_min = int(first_start.split(":")[1])
    first_time_minutes = first_hour * 60 + first_min
    delay_minutes = max(0, first_time_minutes - 9 * 60)
    if delay_minutes > 0:
        habits.append({
            "type": "start_delay",
            "title": "開始遅延癖",
            "description": f"作業開始まで{delay_minutes}分",
            "icon": "⏰",
        })

    browser_apps = ["chrome", "edge", "firefox", "safari", "browser"]
    browser_usage = sum(
        r["sec"] for r in day_logs
        if any(b in r["app"].lower() for b in browser_apps)
    )
    if browser_usage > 1800:
        habits.append({
            "type": "research_wandering",
            "title": "調べ物迷子癖",
            "description": f"ブラウザ滞在{formatSec(browser_usage)}",
            "icon": "🔍",
        })

    hourly_focus = defaultdict(int)
    hourly_sessions = defaultdict(int)
    for r in day_logs:
        hour = int(r["start"].split(":")[0])
        hourly_focus[hour] += r["sec"]
        hourly_sessions[hour] += 1

    if hourly_focus:
        max_hour = max(hourly_focus.keys(), key=lambda h: hourly_focus[h])
        avg_session_at_peak = (
            hourly_focus[max_hour] / hourly_sessions[max_hour]
            if hourly_sessions[max_hour] > 0 else 0
        )
        if 14 <= max_hour <= 16:
            habits.append({
                "type": "afternoon_focus",
                "title": "午後集中型",
                "description": f"14〜16時が最高効率（平均{formatSec(int(avg_session_at_peak))}）",
                "icon": "🌅",
            })
        elif 9 <= max_hour <= 11:
            habits.append({
                "type": "morning_focus",
                "title": "午前集中型",
                "description": f"9〜11時が最高効率（平均{formatSec(int(avg_session_at_peak))}）",
                "icon": "🌅",
            })

    app_switches = sum(
        1 for i in range(len(day_logs) - 1)
        if day_logs[i]["app"] != day_logs[i + 1]["app"]
    )
    if app_switches > 20:
        habits.append({
            "type": "frequent_switching",
            "title": "頻繁切り替え癖",
            "description": f"切り替え{app_switches}回",
            "icon": "🔄",
            "switch_count": app_switches,
        })

    session_durations = [r["sec"] for r in day_logs]
    if session_durations:
        avg_session = sum(session_durations) / len(session_durations)
        if avg_session < 120:
            habits.append({
                "type": "short_sessions",
                "title": "短時間集中癖",
                "description": f"平均{formatSec(int(avg_session))}",
                "icon": "⚡",
            })

    return habits

def init_routes(app):
    @app.route("/")
    def index():
        return render_template("index.html")

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
        date_query = request.args.get("date")
        logs = get_logs()
        if date_query:
            logs = logs_for_date(logs, date_query)
        transitions = defaultdict(int)
        last_app = None
        for r in logs:
            current_app = normalize_app_name(r["app"])
            if last_app and last_app != current_app:
                transitions[f"{last_app} → {current_app}"] += 1
            last_app = current_app
        sorted_trans = [{"transition": k, "count": v} for k, v in sorted(transitions.items(), key=lambda item: item[1], reverse=True)]
        return jsonify({"transitions": sorted_trans})

    @app.route("/api/current")
    def api_current():
        try:
            with open(data_path("current.json"), "r", encoding="utf-8") as f:
                data = json.load(f)
            duration = int(time.time() - data.get("start_timestamp", time.time()))
            logs = get_logs()
            current_app = data.get("current_app", "-")
            today = datetime.now().strftime("%Y-%m-%d")
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
                "today_count": app_usage_count + 1,
                "avg_duration": avg_duration
            })
        except (FileNotFoundError, json.JSONDecodeError):
            return jsonify({"app": "-", "duration": 0, "start_time": "-", "previous_app": "-", "today_count": 0, "avg_duration": 0})

    @app.route("/api/habits")
    def api_habits():
        date_query = request.args.get("date", datetime.now().strftime("%Y-%m-%d"))
        logs = get_logs()
        today_logs = logs_for_date(logs, date_query)
        return jsonify({"habits": detect_habits(today_logs)})

    @app.route("/api/time-analysis")
    def api_time_analysis():
        date_query = request.args.get("date", datetime.now().strftime("%Y-%m-%d"))
        logs = get_logs()
        today_logs = [r for r in logs if r["date"] == date_query]
        if not today_logs:
            return jsonify({"hourly_blocks": []})
        hourly_blocks = defaultdict(list)
        for r in today_logs:
            hour = int(r["start"].split(":")[0])
            start_min = int(r["start"].split(":")[1])
            end_min = int(r["end"].split(":")[1])
            start_pos = start_min
            end_pos = end_min
            hourly_blocks[hour].append({
                "app": r["app"],
                "start_pos": start_pos,
                "end_pos": end_pos,
                "sec": r["sec"]
            })
        blocks = []
        for hour in sorted(hourly_blocks.keys()):
            hour_data = {
                "hour": hour,
                "hour_range": f"{hour}:00 - {hour+1}:00",
                "segments": hourly_blocks[hour]
            }
            blocks.append(hour_data)
        return jsonify({"hourly_blocks": blocks})

    @app.route("/api/trends")
    def api_trends():
        period = request.args.get("period", "today")
        logs = get_logs()
        today = datetime.now().strftime("%Y-%m-%d")
        if period == "today":
            filtered_logs = [r for r in logs if r["date"] == today]
        elif period == "7days":
            cutoff = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
            filtered_logs = [r for r in logs if r["date"] >= cutoff]
        elif period == "30days":
            cutoff = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
            filtered_logs = [r for r in logs if r["date"] >= cutoff]
        else:
            filtered_logs = logs
        if not filtered_logs:
            return jsonify({"trends": []})
        daily_stats = defaultdict(lambda: {"total_time": 0, "switch_count": 0, "apps": defaultdict(int)})
        for r in filtered_logs:
            daily_stats[r["date"]]["total_time"] += r["sec"]
            daily_stats[r["date"]]["switch_count"] += 1
            daily_stats[r["date"]]["apps"][normalize_app_name(r["app"])] += r["sec"]
        trends = []
        for date in sorted(daily_stats.keys()):
            stats = daily_stats[date]
            top_apps = sorted(stats["apps"].items(), key=lambda x: x[1], reverse=True)[:5]
            trends.append({
                "date": date,
                "total_time": stats["total_time"],
                "switch_count": stats["switch_count"],
                "top_apps": [{"app": app, "time": time} for app, time in top_apps]
            })
        return jsonify({"trends": trends})

    @app.route("/api/dates")
    def api_dates():
        year = int(request.args.get("year", datetime.now().year))
        month = int(request.args.get("month", datetime.now().month))
        logs = get_logs()
        dates_with_data = set(r["date"] for r in logs)
        weeks = []
        for week in calendar.Calendar(firstweekday=6).monthdatescalendar(year, month):
            week_days = []
            for day in week:
                if day.month != month:
                    week_days.append(None)
                    continue
                date_str = day.strftime("%Y-%m-%d")
                week_days.append({
                    "date": date_str,
                    "day": day.day,
                    "has_data": date_str in dates_with_data,
                })
            weeks.append(week_days)
        return jsonify({
            "year": year,
            "month": month,
            "dates": get_available_dates(logs),
            "weeks": weeks,
        })

    @app.route("/api/history/compare")
    def api_history_compare():
        date_query = request.args.get("date", datetime.now().strftime("%Y-%m-%d"))
        logs = get_logs()
        all_dates = get_available_dates(logs)
        focus_time = day_total_sec(logs, date_query)
        switches = day_switch_count(logs, date_query)
        other_dates = [d for d in all_dates if d != date_query]
        if other_dates:
            avg_focus = int(sum(day_total_sec(logs, d) for d in other_dates) / len(other_dates))
            avg_switches = int(sum(day_switch_count(logs, d) for d in other_dates) / len(other_dates))
        else:
            avg_focus = focus_time
            avg_switches = switches
        return jsonify({
            "date": date_query,
            "metrics": [
                {
                    "key": "focus_time",
                    "label": "集中時間",
                    "value": focus_time,
                    "average": avg_focus,
                    "diff": focus_time - avg_focus,
                },
                {
                    "key": "switches",
                    "label": "アプリ切替",
                    "value": switches,
                    "average": avg_switches,
                    "diff": switches - avg_switches,
                },
            ],
        })

    @app.route("/api/history/habits-compare")
    def api_history_habits_compare():
        logs = get_logs()
        today = datetime.now().date()
        def range_switches(start_date, end_date):
            total = 0
            d = start_date
            while d <= end_date:
                total += day_switch_count(logs, d.strftime("%Y-%m-%d"))
                d += timedelta(days=1)
            return total
        this_start = today - timedelta(days=6)
        last_start = today - timedelta(days=13)
        last_end = today - timedelta(days=7)
        this_week = range_switches(this_start, today)
        last_week = range_switches(last_start, last_end)
        if last_week > 0:
            change_pct = int(round((this_week - last_week) / last_week * 100))
        else:
            change_pct = 0 if this_week == 0 else 100
        items = []
        if this_week > 0 or last_week > 0:
            items.append({
                "type": "frequent_switching",
                "title": "頻繁切り替え癖",
                "this_label": "今週",
                "last_label": "先週",
                "this_value": this_week,
                "last_value": last_week,
                "change_pct": change_pct,
            })
        return jsonify({"comparisons": items})

    @app.route("/api/history/drift-patterns")
    def api_history_drift_patterns():
        period = request.args.get("period", "7days")
        logs = filter_logs_by_period(get_logs(), period)
        patterns = defaultdict(int)
        by_date = defaultdict(list)
        for r in logs:
            by_date[r["date"]].append(r)
        for day_logs in by_date.values():
            norms = [normalize_app_name(r["app"]) for r in day_logs]
            for i in range(len(norms) - 2):
                key = f"{norms[i]}→{norms[i + 1]}→{norms[i + 2]}"
                patterns[key] += 1
        top = sorted(patterns.items(), key=lambda x: x[1], reverse=True)[:8]
        return jsonify({
            "patterns": [
                {"steps": pat.split("→"), "count": cnt}
                for pat, cnt in top
            ],
        })
