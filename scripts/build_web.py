"""Build static dashboard for Vercel from log.csv via Flask app logic."""
import json
import os
import shutil
import sys
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

PUBLIC = os.path.join(ROOT, "frontend", "public")
DATA = os.path.join(PUBLIC, "data")
STATIC_SRC = os.path.join(ROOT, "frontend", "src")
TEMPLATE = os.path.join(ROOT, "frontend", "index.html")


def write_json(client, path, out_name):
    response = client.get(path)
    out = os.path.join(DATA, out_name)
    with open(out, "w", encoding="utf-8") as f:
        f.write(response.get_data(as_text=True))
    print(f"Wrote {out} ({response.status_code})")


def main():
    os.chdir(ROOT)
    shutil.rmtree(PUBLIC, ignore_errors=True)
    os.makedirs(DATA, exist_ok=True)

    from backend.api.app import app
    from backend.api.routes import get_logs, get_available_dates

    client = app.test_client()
    logs = get_logs()
    dates = get_available_dates(logs)

    for path, name in [
        ("/api/current", "current.json"),
    ]:
        write_json(client, path, name)

    for period in ("today", "7days", "30days", "all"):
        write_json(client, f"/api/trends?period={period}", f"trends-{period}.json")

    write_json(client, "/api/history/habits-compare", "history-habits-compare.json")
    for period in ("today", "7days", "30days", "all"):
        write_json(client, f"/api/history/drift-patterns?period={period}", f"history-drift-{period}.json")

    for date in dates:
        write_json(client, f"/api/timeline?date={date}", f"timeline-{date}.json")
        write_json(client, f"/api/transitions?date={date}", f"transitions-{date}.json")
        write_json(client, f"/api/time-analysis?date={date}", f"time-analysis-{date}.json")
        write_json(client, f"/api/habits?date={date}", f"habits-{date}.json")
        write_json(client, f"/api/history/compare?date={date}", f"history-compare-{date}.json")

    today = datetime.now()
    months = set()
    for d in dates:
        y, m, _ = d.split("-")
        months.add((int(y), int(m)))
    months.add((today.year, today.month))

    for year, month in sorted(months):
        write_json(client, f"/api/dates?year={year}&month={month}", f"dates-{year}-{month}.json")

    with open(os.path.join(DATA, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump({"dates": dates}, f, ensure_ascii=False)

    # Legacy filenames for today (no query on static home habits)
    if dates:
        today_str = today.strftime("%Y-%m-%d")
        if today_str in dates:
            for src, dst in [
                (f"timeline-{today_str}.json", "timeline.json"),
                (f"transitions-{today_str}.json", "transitions.json"),
                (f"time-analysis-{today_str}.json", "time-analysis.json"),
                (f"habits-{today_str}.json", "habits.json"),
            ]:
                s = os.path.join(DATA, src)
                d = os.path.join(DATA, dst)
                if os.path.exists(s):
                    shutil.copy(s, d)

    shutil.copytree(STATIC_SRC, os.path.join(PUBLIC, "static"))

    with open(TEMPLATE, encoding="utf-8") as f:
        html = f.read()
    html = html.replace("{{ url_for('static', filename='css/style.css') }}", "/static/css/style.css")
    html = html.replace("{{ url_for('static', filename='js/main.js') }}", "/static/js/main.js")
    html = html.replace('<html lang="ja">', '<html lang="ja" data-use-static-api="true">')
    with open(os.path.join(PUBLIC, "index.html"), "w", encoding="utf-8") as f:
        f.write(html)

    print("Build complete:", PUBLIC)


if __name__ == "__main__":
    main()
