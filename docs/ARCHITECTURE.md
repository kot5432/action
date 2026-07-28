# ActionTracker アーキテクチャドキュメント

## システム概要

ActionTrackerは、ユーザーのPC上での行動履歴を収集・分析し、単なる利用時間の記録ではなく「どのような行動の流れで時間を使ったのか」を可視化する行動理解プラットフォームです。

## システム構成

### コンポーネント

```
┌─────────────────┐
│  Tracker Agent  │  ← Python (Windows)
│  (イベント収集)  │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   SQLite DB     │  ← データ保存
│  (生ログ・集計)  │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   FastAPI       │  ← Python (バックエンド)
│  (APIサーバー)   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   React App     │  ← TypeScript (フロントエンド)
│  (ダッシュボード)│
└─────────────────┘
```

## ディレクトリ構造

```
action/
├── backend/
│   ├── api/
│   │   └── fastapi_app.py          # FastAPIエンドポイント
│   ├── core/
│   │   ├── analyzer.py             # 行動分析
│   │   ├── auth.py                 # 認証モジュール
│   │   ├── cache.py                # キャッシュモジュール
│   │   ├── config.py               # 設定管理
│   │   ├── database.py             # データベース操作
│   │   ├── domain_extractor.py     # ドメイン抽出
│   │   ├── logging_config.py       # ロギング設定
│   │   ├── normalizer.py           # データ正規化
│   │   ├── scoring.py              # 行動スコアリング
│   │   └── service_resolver.py     # サービス解決
│   ├── tracker/
│   │   ├── event_tracker.py        # イベント収集
│   │   └── monitor.py              # アイドル検出
│   └── tests/
│       └── test_api.py             # APIテスト
├── frontend-react/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx       # ダッシュボード
│   │   │   ├── Timeline.tsx        # タイムライン
│   │   │   ├── Insights.tsx        # インサイト
│   │   │   ├── Settings.tsx        # 設定
│   │   │   └── Story.tsx           # ストーリー
│   │   ├── lib/
│   │   │   └── api.ts              # APIクライアント
│   │   ├── types/
│   │   │   └── api.ts              # 型定義
│   │   └── App.tsx                 # メインアプリ
│   ├── package.json
│   └── vite.config.ts
├── data/
│   ├── action_tracker.db           # SQLiteデータベース
│   └── current_session.json         # ライブセッション状態
├── config/
│   └── categories.json             # カテゴリ設定
├── docs/
│   ├── ARCHITECTURE.md             # アーキテクチャドキュメント
│   └── API.md                      # APIドキュメント
├── .env.example                    # 環境変数テンプレート
├── requirements.txt                 # Python依存関係
├── pyproject.toml                  # Pythonツール設定
└── README.md                       # プロジェクト概要
```

## データフロー

### 1. イベント収集フロー

```
ユーザー操作 → Tracker Agent → eventsテーブル → 集計処理 → sessionsテーブル
```

### 2. 分析フロー

```
sessionsテーブル → BehaviorScorer → スコア計算 → インサイト生成 → APIレスポンス
```

### 3. 表示フロー

```
React App → APIリクエスト → FastAPI → データベースクエリ → レスポンス → UI表示
```

## データベーススキーマ

### eventsテーブル（生ログ）

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

### sessionsテーブル（集計データ）

| カラム | 型 | 説明 |
|--------|------|------|
| id | INTEGER | 主キー |
| start_time | DATETIME | 開始時刻 |
| end_time | DATETIME | 終了時刻 |
| duration_seconds | INTEGER | 利用時間（秒） |
| app_name | TEXT | アプリ名 |
| service | TEXT | サービス名 |
| category | TEXT | カテゴリ名 |

### transitionsテーブル（遷移分析）

| カラム | 型 | 説明 |
|--------|------|------|
| id | INTEGER | 主キー |
| timestamp | DATETIME | 発生時刻 |
| from_service | TEXT | 遷移元サービス |
| to_service | TEXT | 遷移先サービス |
| from_category | TEXT | 遷移元カテゴリ |
| to_category | TEXT | 遷移先カテゴリ |

## APIエンドポイント

### 基本エンドポイント

- `GET /` - ルートエンドポイント
- `GET /dashboard` - ダッシュボードデータ
- `GET /timeline` - タイムラインデータ
- `GET /transitions` - 遷移データ
- `GET /story` - 行動ストーリー
- `GET /insights` - インサイト

### 管理エンドポイント

- `GET /categories` - カテゴリ一覧
- `POST /categories` - カテゴリ追加
- `PUT /categories/{id}` - カテゴリ更新
- `DELETE /categories/{id}` - カテゴリ削除

### 設定エンドポイント

- `GET /privacy` - プライバシー設定
- `PUT /privacy` - プライバシー設定更新
- `GET /settings/retention` - データ保持設定
- `PUT /settings/retention` - データ保持設定更新

## セキュリティ

### 認証

- APIキー認証（条件付きで有効化可能）
- JWTトークン認証
- HTTP Bearerトークン

### プライバシー

- 機密サービスのマスキング機能
- データ保持期間の設定
- プライバシーモードの切り替え

## パフォーマンス最適化

### キャッシュ

- インメモリキャッシュ（デコレータベース）
- 重要なエンドポイントにキャッシュ適用
- TTL設定可能

### データベース

- SQLiteの最適化
- インデックスの適切な使用
- クエリの効率化

## モニタリング

### ロギング

- 構造化ロギング
- ファイルログとコンソールログ
- ログレベルの設定

### テスト

- pytestによるユニットテスト
- APIエンドポイントのテスト
- 自動テスト（GitHub Actions）

## デプロイ

### 開発環境

```bash
# すべてのサービスを一括起動
start_action_tracker.bat
```

### 本番環境

- Dockerコンテナ化（予定）
- 環境変数による設定管理
- CI/CDパイプラインによる自動デプロイ

## 拡張性

### 将来の機能

- クラウド同期
- モバイルアプリ連携
- AIによる行動分析
- 行動予測
- パーソナルコーチ機能
- データエクスポート機能
- チーム/組織向け機能
