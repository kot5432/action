# ActionTracker

ActionTrackerは、ユーザーのPC上での行動履歴を収集・分析し、単なる利用時間の記録ではなく「どのような行動の流れで時間を使ったのか」を可視化する行動理解プラットフォームです。

## システム概要

- **Tracker Agent (Python)**: PC上の行動イベントを収集
- **SQLite**: データ保存
- **FastAPI**: バックエンドAPI
- **React + TypeScript**: フロントエンドダッシュボード

## 機能

### 実装済みの機能

- **F-001 行動イベント収集**: アクティブウィンドウ変更、マウス操作、キーボード操作、アイドル状態変化
- **F-002 リアルタイムダッシュボード**: 現在利用中アプリ、利用開始時刻、継続時間、本日の利用時間、切替回数
- **F-003 タイムライン表示**: 1日の行動履歴を時系列で表示
- **F-004 アプリ遷移分析**: アプリ間およびサービス間の遷移を分析
- **F-005 行動ストーリー生成**: 行動履歴を人が理解しやすい文章へ変換
- **F-006 インサイト生成**: 行動パターンから傾向を抽出
- **F-007 行動カテゴリ分析**: 開発、学習、娯楽、SNS、コミュニケーションなどのカテゴリ別分析
- **F-008 プライバシーモード**: 銀行サイト、証券サイト、メール、パスワードマネージャー等の機密情報をマスク

## 技術スタック

### Backend
- Python 3.x
- FastAPI
- SQLite
- pywin32
- psutil
- pynput
- pandas
- duckdb

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- lucide-react

## セットアップ

### 1. 依存関係のインストール

```bash
# Python依存関係
pip install -r requirements.txt

# データベース初期化
python backend/core/database.py
```

### 2. Frontendのセットアップ

```bash
cd frontend-react
npm install
```

### 3. データベース初期化

```bash
python backend/core/database.py
```

## 実行方法

### 1. Tracker Agentの起動

```bash
python backend/tracker/event_tracker.py
```

### 2. FastAPIサーバーの起動

```bash
python backend/api/fastapi_app.py
```

または

```bash
uvicorn backend.api.fastapi_app:app --reload --host 127.0.0.1 --port 8000
```

### 3. Frontendの起動

```bash
cd frontend-react
npm run dev
```

### 4. アクセス

- Frontend: http://localhost:5173
- API: http://127.0.0.1:8000
- APIドキュメント: http://127.0.0.1:8000/docs

## APIエンドポイント

### GET /
ルートエンドポイント

### GET /dashboard
現在状態を取得
- Response: `{current_app, current_domain, today_usage_minutes, switch_count}`

### GET /timeline
タイムラインを取得
- Query: `?date=2026-06-16`
- Response: `[{start, end, app, domain, duration_seconds}]`

### GET /transitions
遷移データを取得
- Query: `?date=2026-06-16` (オプション)
- Response: `[{from, to, count}]`

### GET /story
行動ストーリーを取得
- Query: `?date=2026-06-16`
- Response: `{story: [{time, text}]}`

### GET /insights
インサイトを取得
- Response: `[{type, message}]`

### GET /categories
カテゴリ別集計を取得
- Response: `{category: time}`

## プライバシーモード

プライバシーモードはデフォルトで有効になっています。以下のドメインを含むサイトは自動的にマスクされます：

- bank
- securities
- finance
- password
- vault
- 1password
- bitwarden
- lastpass

プライバシーモードを無効にするには、以下のファイルで `PRIVACY_MODE = False` に設定してください：

- `backend/api/fastapi_app.py`
- `backend/tracker/event_tracker.py`

## データベース構造

### events
生ログ保存用テーブル

| カラム | 型 | 説明 |
|--------|------|------|
| id | INTEGER | 主キー |
| timestamp | DATETIME | 発生時刻 |
| event_type | TEXT | イベント種別 |
| app_name | TEXT | アプリ名 |
| window_title | TEXT | ウィンドウタイトル |
| domain | TEXT | ドメイン名 |
| metadata | TEXT | メタデータ |

### sessions
集計用テーブル

| カラム | 型 | 説明 |
|--------|------|------|
| id | INTEGER | 主キー |
| start_time | DATETIME | 開始時刻 |
| end_time | DATETIME | 終了時刻 |
| duration_seconds | INTEGER | 利用時間（秒） |
| app_name | TEXT | アプリ名 |
| domain | TEXT | ドメイン名 |

### transitions
行動遷移分析用テーブル

| カラム | 型 | 説明 |
|--------|------|------|
| id | INTEGER | 主キー |
| timestamp | DATETIME | 発生時刻 |
| from_app | TEXT | 遷移元アプリ |
| from_domain | TEXT | 遷移元ドメイン |
| to_app | TEXT | 遷移先アプリ |
| to_domain | TEXT | 遷移先ドメイン |

### category_rules
カテゴリ管理用テーブル

| カラム | 型 | 説明 |
|--------|------|------|
| id | INTEGER | 主キー |
| domain | TEXT | ドメイン名 |
| category | TEXT | カテゴリ名 |

## ライセンス

MIT License

## 今後の展望

- URL解析強化
- クラウド同期
- モバイルアプリ連携
- AIによる行動分析
- 行動予測
- パーソナルコーチ機能
