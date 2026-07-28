FROM python:3.11-slim

# 作業ディレクトリを設定
WORKDIR /app

# システム依存関係をインストール
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Python依存関係をコピーしてインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードをコピー
COPY backend/ ./backend/
COPY config/ ./config/

# データディレクトリを作成
RUN mkdir -p /app/data

# ポートを公開
EXPOSE 8000

# アプリケーションを実行
CMD ["uvicorn", "backend.api.fastapi_app:app", "--host", "0.0.0.0", "--port", "8000"]
