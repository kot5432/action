import os
import sys
from flask import Flask

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

# frontend/ 配下のテンプレートとスタティックの絶対パスを設定
FRONTEND_DIR = os.path.join(ROOT, "frontend")
TEMPLATE_FOLDER = FRONTEND_DIR
STATIC_FOLDER = os.path.join(FRONTEND_DIR, "src")

app = Flask(
    __name__,
    template_folder=TEMPLATE_FOLDER,
    static_folder=STATIC_FOLDER,
)

# APIルートの登録
from backend.api.routes import init_routes
init_routes(app)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)