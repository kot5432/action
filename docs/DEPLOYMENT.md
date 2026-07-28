# デプロイ手順

## Dockerを使用したデプロイ

### 前提条件

- Dockerがインストールされていること
- Docker Composeがインストールされていること

### 手順

#### 1. 環境変数の設定

```bash
# .envファイルを作成
cp .env.example .env

# 必要に応じて環境変数を編集
nano .env
```

#### 2. Dockerイメージのビルド

```bash
# 全てのサービスをビルド
docker-compose build

# 個別にビルド
docker-compose build backend
docker-compose build frontend
```

#### 3. サービスの起動

```bash
# 全てのサービスを起動
docker-compose up -d

# サービスの状態を確認
docker-compose ps

# ログを確認
docker-compose logs -f
```

#### 4. サービスの停止

```bash
# 全てのサービスを停止
docker-compose down

# ボリュームを含めて停止
docker-compose down -v
```

### 本番環境でのデプロイ

#### 1. 環境変数の設定

本番環境では以下の環境変数を設定してください：

```bash
ENVIRONMENT=production
DEBUG=false
AUTH_ENABLED=true
API_KEY=your_secure_api_key
SECRET_KEY=your_secure_secret_key
```

#### 2. セキュリティ設定

- APIキーとシークレットキーを強力な値に変更
- CORS_ORIGINSを適切なドメインに制限
- HTTPSを使用するように設定

#### 3. データの永続化

データはDockerボリュームに保存されます。バックアップを定期的に行ってください。

```bash
# データベースのバックアップ
docker-compose exec backend cp /app/data/action_tracker.db /backup/
```

## 手動デプロイ（開発環境）

### バックエンドのデプロイ

```bash
# Python依存関係のインストール
pip install -r requirements.txt

# データベースの初期化
python -c "from backend.core.database import init_database; init_database()"

# サーバーの起動
uvicorn backend.api.fastapi_app:app --host 0.0.0.0 --port 8000 --reload
```

### フロントエンドのデプロイ

```bash
# 依存関係のインストール
cd frontend-react
npm install

# 開発サーバーの起動
npm run dev

# 本番ビルド
npm run build
```

## CI/CDパイプライン

GitHub Actionsを使用して自動デプロイを設定しています。

### ワークフロー

- プッシュ時に自動テスト実行
- テスト成功後にDockerイメージをビルド
- 本番ブランチへのプッシュ時にデプロイ

### 手動デプロイ

```bash
# 最新のコードをプル
git pull origin main

# Dockerイメージを再ビルド
docker-compose build

# サービスを再起動
docker-compose up -d
```

## トラブルシューティング

### サービスが起動しない場合

```bash
# ログを確認
docker-compose logs backend
docker-compose logs frontend

# コンテナを再起動
docker-compose restart backend
docker-compose restart frontend
```

### データベースエラー

```bash
# データベースを再初期化
docker-compose exec backend python -c "from backend.core.database import init_database; init_database()"
```

### ポート競合

```bash
# ポート設定を変更
# docker-compose.ymlのportsセクションを編集
ports:
  - "8001:8000"  # ポート8001を使用
```

## モニタリング

### ログの確認

```bash
# 全てのログ
docker-compose logs

# 特定のサービスのログ
docker-compose logs backend
docker-compose logs frontend

# ログを追跡
docker-compose logs -f backend
```

### サービスの状態確認

```bash
# 全てのサービスの状態
docker-compose ps

# 特定のサービスの状態
docker-compose ps backend
```

## バックアップと復元

### バックアップ

```bash
# データベースのバックアップ
docker-compose exec backend cp /app/data/action_tracker.db /backup/
docker cp $(docker-compose ps -q backend):/backup/action_tracker.db ./backup_$(date +%Y%m%d).db
```

### 復元

```bash
# バックアップファイルをコピー
docker cp ./backup_20240101.db $(docker-compose ps -q backend):/app/data/action_tracker.db

# サービスを再起動
docker-compose restart backend
```

## スケーリング

### 水平スケーリング

```bash
# バックエンドのスケーリング
docker-compose up -d --scale backend=3
```

### 負荷分散

nginxを使用して負荷分散を設定することをお勧めします。
