# ActionTracker

ActionTrackerは、ユーザーのPC上での行動履歴を収集・分析し、単なる利用時間の記録ではなく「どのような行動の流れで時間を使ったのか」を可視化する行動理解プラットフォームです。

## システム概要

- **Tracker Agent (Python)**: PC上の行動イベントを収集
- **SQLite**: データ保存
- **FastAPI**: バックエンドAPI
- **React + TypeScript**: フロントエンドダッシュボード

## 機能

### 実装済みの機能

- **行動イベント収集**: アクティブウィンドウ変更、マウス操作、キーボード操作、アイドル状態変化
- **リアルタイムダッシュボード**: 現在利用中アプリ、利用開始時刻、継続時間、本日の利用時間、切替回数
- **タイムライン表示**: 1日の行動履歴を時系列で表示
- **アプリ遷移分析**: アプリ間およびサービス間の遷移を分析
- **行動ストーリー生成**: 行動履歴を人が理解しやすい文章へ変換
- **インサイト生成**: 行動パターンから傾向を抽出
- **行動カテゴリ分析**: 開発、学習、娯楽、SNS、コミュニケーションなどのカテゴリ別分析
- **カテゴリ管理**: カテゴリの追加、編集、削除
- **カテゴリルール管理**: 正規表現パターンによる自動カテゴリ分類
- **行動タグ管理**: サービスにタグを付与して管理
- **プライバシー設定**: 機密サービスのマスク設定
- **データ保持設定**: データの保存期間設定
- **通知設定**: デイリーストーリーの通知設定
- **行動スコアリング**: 集中度、生産性指数の計算

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
- React 19
- TypeScript
- Vite
- Tailwind CSS
- lucide-react

## セットアップ

詳細なセットアップ手順は [USAGE.md](USAGE.md) を参照してください。

### 簡易セットアップ

```bash
# Python依存関係のインストール
pip install -r requirements.txt

# データベース初期化
python -c "from backend.core.database import init_database; init_database()"

# Frontendのセットアップ
cd frontend-react
npm install
```

## 実行方法

### Windows (推奨)

```bash
# すべてのサービスを一括起動
start_action_tracker.bat
```

### 手動起動

#### 1. Tracker Agentの起動

```bash
python backend/tracker/event_tracker.py
```

#### 2. FastAPIサーバーの起動

```bash
uvicorn backend.api.fastapi_app:app --reload --host 0.0.0.0 --port 8000
```

#### 3. Frontendの起動

```bash
cd frontend-react
npm run dev
```

### アクセス

- Frontend: http://localhost:5173
- API: http://localhost:8000
- APIドキュメント: http://localhost:8000/docs

## APIエンドポイント

### 基本エンドポイント

#### GET /
ルートエンドポイント
- Response: `{message, version}`

### データ取得エンドポイント

#### GET /dashboard
現在状態を取得
- Response: `{current_app, current_service, current_category, session_start_time, session_duration_minutes, today_usage_minutes, switch_count}`

#### GET /timeline
タイムラインを取得
- Query: `?date=2026-06-16` (オプション)
- Response: `[{start, end, app, service, category, duration_seconds}]`

#### GET /transitions
遷移データを取得
- Query: `?date=2026-06-16` (オプション)
- Response: `[{from, to, from_category, to_category, count}]`

#### GET /story
行動ストーリーを取得
- Query: `?date=2026-06-16` (オプション)
- Response: `{story: [{time, text, service, category}], total_drift_minutes}`

#### GET /insights
インサイトを取得
- Query: `?date=2026-06-16` (オプション)
- Response: `[{type, category, message, severity, data}]`

#### GET /daily-story
デイリーストーリーを取得（スコアリング版）
- Query: `?date=2026-06-16` (オプション)
- Response: `{date, story, total_focus_minutes, total_derail_count, score}`

#### GET /session-blocks
セッションブロックを取得
- Query: `?date=2026-06-16` (オプション)
- Response: `{date, blocks: [{start_time, end_time, duration_seconds, category, is_focus, is_derail, focus_level, session_count}]}`

#### GET /scores
行動スコアを取得
- Query: `?date=2026-06-16` (オプション)
- Response: `{date, total_minutes, focus_minutes, distract_minutes, session_count, derail_count, return_rate, score_focus, score_derail, productivity_index}`

### 管理エンドポイント

#### GET /categories
カテゴリ一覧を取得
- Response: `[{id, name, color}]`

#### POST /categories
カテゴリを追加
- Request: `{name, color}`
- Response: `{success, id}`

#### PUT /categories/{category_id}
カテゴリを更新
- Request: `{name?, color?}`
- Response: `{success}`

#### DELETE /categories/{category_id}
カテゴリを削除
- Response: `{success}`

#### GET /privacy
プライバシー設定を取得
- Response: `{enabled, masked_services}`

#### PUT /privacy
プライバシー設定を更新
- Request: `{enabled, masked_services}`
- Response: `{success}`

#### GET /settings/retention
データ保持設定を取得
- Response: `{retention_days}`

#### PUT /settings/retention
データ保持設定を更新
- Request: `{retention_days}`
- Response: `{success}`

## プライバシーモード

プライバシーモードはSettings画面から設定できます。デフォルトで有効になっており、以下のドメインを含むサービスは自動的にマスクされます：

- bank
- securities
- finance
- password
- vault
- 1password
- bitwarden
- lastpass

マスク対象サービスはSettings画面からカスタマイズ可能です。

## データベース構造

### events
生ログ保存用テーブル

| カラム | 型 | 説明 |
|--------|------|------|
| id | INTEGER | 主キー |
| timestamp | DATETIME | 発生時刻 |
| event_type | TEXT | イベント種別 |
| app_name | TEXT | アプリ名 |
| service | TEXT | サービス名 |
| category | TEXT | カテゴリ名 |
| window_title | TEXT | ウィンドウタイトル |
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
| service | TEXT | サービス名 |
| category | TEXT | カテゴリ名 |

### transitions
行動遷移分析用テーブル

| カラム | 型 | 説明 |
|--------|------|------|
| id | INTEGER | 主キー |
| timestamp | DATETIME | 発生時刻 |
| from_service | TEXT | 遷移元サービス |
| to_service | TEXT | 遷移先サービス |
| from_category | TEXT | 遷移元カテゴリ |
| to_category | TEXT | 遷移先カテゴリ |

### category_rules
カテゴリルール管理用テーブル

| カラム | 型 | 説明 |
|--------|------|------|
| id | INTEGER | 主キー |
| pattern | TEXT | 正規表現パターン |
| category | TEXT | カテゴリ名 |
| priority | INTEGER | 優先度 |
| is_regex | BOOLEAN | 正規表現フラグ |
| enabled | BOOLEAN | 有効フラグ |
| created_at | DATETIME | 作成日時 |
| updated_at | DATETIME | 更新日時 |

### tags
行動タグ管理用テーブル

| カラム | 型 | 説明 |
|--------|------|------|
| id | INTEGER | 主キー |
| name | TEXT | タグ名 |
| color | TEXT | タグ色 |
| created_at | DATETIME | 作成日時 |

### service_tags
サービスとタグの関連付けテーブル

| カラム | 型 | 説明 |
|--------|------|------|
| id | INTEGER | 主キー |
| service | TEXT | サービス名 |
| tag_id | INTEGER | タグID（外部キー） |
| created_at | DATETIME | 作成日時 |

### categories
カテゴリ管理用テーブル

| カラム | 型 | 説明 |
|--------|------|------|
| id | INTEGER | 主キー |
| name | TEXT | カテゴリ名 |
| color | TEXT | カテゴリ色 |
| created_at | DATETIME | 作成日時 |
| updated_at | DATETIME | 更新日時 |

### settings
設定管理用テーブル

| カラム | 型 | 説明 |
|--------|------|------|
| key | TEXT | 設定キー |
| value | TEXT | 設定値 |

### notification_settings
通知設定管理用テーブル

| カラム | 型 | 説明 |
|--------|------|------|
| id | INTEGER | 主キー |
| enabled | BOOLEAN | 有効フラグ |
| time | TEXT | 通知時間 |
| last_sent | TEXT | 最終送信日時 |
| created_at | DATETIME | 作成日時 |
| updated_at | DATETIME | 更新日時 |

## ライセンス

MIT License

## 今後の展望

- サービス解析強化
- クラウド同期
- モバイルアプリ連携
- AIによる行動分析
- 行動予測
- パーソナルコーチ機能
- データエクスポート機能
- チーム/組織向け機能
