# ActionTracker MVP

PC 上の行動履歴を収集・分析し、「何にどれだけ時間を使ったか」を可視化するシンプルな行動追跡ツール。

## 機能

- **ダッシュボード**: 現在の作業状況と今日の行動を一目で把握
- **タイムライン**: 1 日の行動を時系列で振り返り
- **設定**: カテゴリの追加・編集・削除

## システム構成

```
Windows PC
↓
Tracker Agent（Python）
↓
SQLite
↓
FastAPI
↓
React Dashboard
```

## 技術スタック

- **Tracker**: Python, pywin32, psutil
- **Backend**: FastAPI, SQLAlchemy
- **Database**: SQLite
- **Frontend**: React, TypeScript, Vite, Tailwind CSS

## インストール

### バックエンド

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn backend.api.fastapi_app_mvp:app --host 0.0.0.0 --port 8002
```

### フロントエンド

```bash
cd frontend-react
npm install
npm run dev
```

## 使い方

1. バックエンドを起動（ポート8002）
2. フロントエンドを起動（ポート5000）
3. ブラウザで `http://localhost:5000` にアクセス

## MVPの制限

- 3ページのみ（ダッシュボード、タイムライン、設定）
- カテゴリ管理のみ（タグ、ルール、プライバシー設定は未実装）
- シンプルなパターン検出（固定パラメータ）
- ローカル完結（クラウド同期なし）

## 今後の拡張

- 行動ストーリー生成
- インサイト生成
- 行動スコアリング
- タグ管理
- ルール管理
- プライバシー管理
- データ管理
- 通知機能
