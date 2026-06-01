"""Build static dashboard for Vercel from log.csv via Flask app logic."""
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
PUBLIC = os.path.join(ROOT, "public")
DATA = os.path.join(PUBLIC, "data")
STATIC_SRC = os.path.join(ROOT, "static")
TEMPLATE = os.path.join(ROOT, "templates", "index.html")


def main():
    os.chdir(ROOT)
    shutil.rmtree(PUBLIC, ignore_errors=True)
    os.makedirs(DATA, exist_ok=True)

    from app import app

    client = app.test_client()

    routes = [
        ("/api/current", "current.json"),
        ("/api/timeline", "timeline.json"),
        ("/api/transitions", "transitions.json"),
        ("/api/time-analysis", "time-analysis.json"),
        ("/api/app-history", "app-history.json"),
        ("/api/habits", "habits.json"),
    ]

    for path, filename in routes:
        response = client.get(path)
        out = os.path.join(DATA, filename)
        with open(out, "w", encoding="utf-8") as f:
            f.write(response.get_data(as_text=True))
        print(f"Wrote {out} ({response.status_code})")

    for period in ("today", "week", "month"):
        response = client.get(f"/api/trends?period={period}")
        out = os.path.join(DATA, f"trends-{period}.json")
        with open(out, "w", encoding="utf-8") as f:
            f.write(response.get_data(as_text=True))
        print(f"Wrote {out} ({response.status_code})")

    shutil.copytree(STATIC_SRC, os.path.join(PUBLIC, "static"))

    with open(TEMPLATE, encoding="utf-8") as f:
        html = f.read()

    html = html.replace(
        "{{ url_for('static', filename='style.css') }}", "/static/style.css"
    )
    html = html.replace(
        "{{ url_for('static', filename='main.js') }}", "/static/main.js"
    )
    html = html.replace("<html lang=\"ja\">", '<html lang="ja" data-use-static-api="true">')

    with open(os.path.join(PUBLIC, "index.html"), "w", encoding="utf-8") as f:
        f.write(html)

    print("Build complete:", PUBLIC)


if __name__ == "__main__":
    main()
