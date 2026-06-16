# ActionTracker 使い方ガイド

このガイドでは、ActionTrackerを初めて使用する方向けに、インストールから実際の使用までの手順を詳しく説明します。

## 前提条件

- Windows PC
- Python 3.8以上がインストールされている
- Node.js 18以上がインストールされている
- インターネット接続（初回のパッケージインストール時のみ）

## ステップ1: 初期セットアップ

### 1.1 Python依存関係のインストール

コマンドプロンプトまたはPowerShellを開き、プロジェクトディレクトリに移動します：

```bash
cd c:\Users\kkyog\cousor\action
```

Python依存関係をインストールします：

```bash
pip install -r requirements.txt
```

### 1.2 データベースの初期化

SQLiteデータベースを作成し、初期設定を行います：

```bash
python backend/core/database.py
```

成功すると以下のメッセージが表示されます：
```
Database initialized at C:\Users\kkyog\cousor\action\data\action_tracker.db
Sample category rules inserted
```

### 1.3 Frontendのセットアップ

Reactフロントエンドの依存関係をインストールします：

```bash
cd frontend-react
npm install
```

インストールが完了したら、プロジェクトルートに戻ります：

```bash
cd ..
```

## ステップ2: アプリケーションの起動

ActionTrackerは3つのコンポーネントで構成されています。それぞれ別のターミナルで起動する必要があります。

### 2.1 Tracker Agentの起動

**ターミナル1** を開き、以下のコマンドを実行します：

```bash
cd c:\Users\kkyog\cousor\action
python backend/tracker/event_tracker.py
```

成功すると以下のメッセージが表示されます：
```
Starting EventTracker...
EventTracker started. Press Ctrl+C to stop.
```

**重要**: このターミナルは開いたままにしてください。閉じるとトラッキングが停止します。

### 2.2 FastAPIサーバーの起動

**ターミナル2** を開き、以下のコマンドを実行します：

```bash
cd c:\Users\kkyog\cousor\action
python backend/api/fastapi_app.py
```

または、uvicornを使用する場合：

```bash
uvicorn backend.api.fastapi_app:app --reload --host 127.0.0.1 --port 8000
```

成功すると以下のメッセージが表示されます：
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 2.3 Frontendの起動

**ターミナル3** を開き、以下のコマンドを実行します：

```bash
cd c:\Users\kkyog\cousor\action\frontend-react
npm run dev
```

成功すると以下のメッセージが表示されます：
```
  VITE v8.0.16  ready in 3045 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## ステップ3: ダッシュボードへのアクセス

ブラウザを開き、以下のURLにアクセスします：

```
http://localhost:5173
```

ActionTrackerダッシュボードが表示されます。

## ステップ4: 各機能の使い方

### 4.1 Dashboard（ダッシュボード）

ダッシュボードでは、現在の状態をリアルタイムで確認できます：

- **Current App**: 現在使用中のアプリケーション
- **Today's Usage**: 今日の合計使用時間
- **Switches Today**: 今日のアプリ切替回数

データは10秒ごとに自動更新されます。

### 4.2 Timeline（タイムライン）

タイムラインでは、1日の行動履歴を時系列で確認できます：

1. ヘッダーの「Timeline」ボタンをクリック
2. カレンダーアイコンの横の日付ピッカーで日付を選択
3. その日のセッション一覧が表示されます

各セッションには以下の情報が表示されます：
- 開始時刻 - 終了時刻
- アプリ名
- ドメイン名（ブラウザの場合）
- 使用時間

### 4.3 Story（行動ストーリー）

行動ストーリーは、ActionTrackerの最も重要な機能です。行動履歴を人が理解しやすい文章で表示します：

1. ヘッダーの「Story」ボタンをクリック
2. 日付を選択
3. その日の行動ストーリーが表示されます

例：
```
14:02 - VSCodeで作業（15分）
14:18 - GitHubで作業（5分）
14:24 - YouTubeで作業（20分）
```

これにより、「どのような流れで時間を使ったのか」を一目で把握できます。

### 4.4 Insights（インサイト）

インサイトでは、行動パターンから傾向を抽出して表示します：

1. ヘッダーの「Insights」ボタンをクリック
2. 以下のようなインサイトが表示されます：
   - **pattern**: 頻出する遷移パターン
   - **time_pattern**: 最も集中している時間帯
   - **focus**: 平均セッション時間

データが蓄積されるほど、より有意義なインサイトが表示されます。

## ステップ5: データの収集

### 自動収集

Tracker Agentが起動している間、以下のデータが自動的に収集されます：

- アクティブウィンドウの変更
- マウス操作
- キーボード操作
- アイドル状態（5分間操作がない場合）

### プライバシーモード

プライバシーモードはデフォルトで有効になっています。以下のサイトは自動的にマスクされます：

- 銀行サイト
- 証券サイト
- パスワードマネージャー（1Password, Bitwarden, LastPassなど）

これらのサイトでは、ドメイン名とウィンドウタイトルが「***」として表示されます。

## ステップ6: アプリケーションの停止

各コンポーネントを停止するには、対応するターミナルで `Ctrl+C` を押します：

1. **Frontend**: ターミナル3で `Ctrl+C`
2. **FastAPIサーバー**: ターミナル2で `Ctrl+C`
3. **Tracker Agent**: ターミナル1で `Ctrl+C`

## トラブルシューティング

### ポートが既に使用されている場合

エラーメッセージ「Address already in use」が表示された場合：

```bash
# ポート8000を使用しているプロセスを探す
netstat -ano | findstr :8000

# プロセスを終了する（PIDを指定）
taskkill /PID <PID> /F
```

### データベースエラー

データベースが破損している場合：

```bash
# データベースを削除
del data\action_tracker.db

# 再初期化
python backend/core/database.py
```

### Frontendが接続できない

FastAPIサーバーが起動しているか確認してください：

```bash
# ブラウザで以下のURLにアクセス
http://127.0.0.1:8000/docs
```

APIドキュメントが表示されれば、サーバーは正常に動作しています。

## APIドキュメントの確認

FastAPIの自動生成ドキュメントを確認できます：

```
http://127.0.0.1:8000/docs
```

ここですべてのAPIエンドポイントを確認し、直接テストすることができます。

## データの管理

### データベースの場置

データベースファイルは以下の場所に保存されます：

```
c:\Users\kkyog\cousor\action\data\action_tracker.db
```

### データのバックアップ

データベースをバックアップするには：

```bash
copy data\action_tracker.db data\action_tracker_backup.db
```

### データのリセット

データを完全にリセットするには：

```bash
del data\action_tracker.db
python backend/core/database.py
```

## 次のステップ

- 数日間データを収集して、インサイト機能を試してください
- カテゴリルールをカスタマイズして、自分の使用環境に合わせてください
- 定期的にデータをバックアップしてください

## サポート

問題が発生した場合は、以下を確認してください：

1. PythonとNode.jsのバージョン
2. すべての依存関係が正しくインストールされているか
3. ファイアウォールがポート5173と8000をブロックしていないか

詳細な技術情報については、README.mdを参照してください。
