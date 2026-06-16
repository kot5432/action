# ActionTracker 日常的な使用フロー

ActionTrackerを日常的に使用するための具体的なフローを説明します。

## 日常的な使用フロー

### 1. 朝の起動（PC起動時）

PCを起動したら、ActionTrackerを起動します：

**ターミナル1 - Tracker Agent:**
```bash
cd c:\Users\kkyog\cousor\action
python backend/tracker/event_tracker.py
```

**ターミナル2 - APIサーバー:**
```bash
cd c:\Users\kkyog\cousor\action
python backend/api/fastapi_app.py
```

**ターミナル3 - Frontend:**
```bash
cd c:\Users\kkyog\cousor\action\frontend-react
npm run dev
```

**ヒント**: これらを毎回手動で起動するのは面倒なので、バッチファイルを作成することをお勧めします（後述）。

### 2. 日常作業中

Tracker Agentがバックグラウンドで動作している間、以下が自動的に記録されます：

- アプリの切り替え（VSCode → Chrome → VSCode など）
- マウス操作
- キーボード操作
- 5分間操作がない場合のアイドル状態

**意識する必要はありません**。普段通り作業してください。

### 3. 作業中の確認

作業中に現在の状態を確認したい場合：

1. ブラウザで `http://localhost:5173` を開く
2. **Dashboard** タブで現在の状態を確認
  - 現在使用中のアプリ
  - 今日の合計使用時間
  - アプリ切替回数

### 4. 休憩後や一日の終わりに

一日の終わりや休憩後に、自分の行動を振り返る：

#### Timelineで一日の流れを確認
1. **Timeline** タブをクリック
2. 日付を選択（デフォルトは今日）
3. 時系列でどのアプリをいつ使っていたかを確認

#### Storyで行動ストーリーを読む
1. **Story** タブをクリック
2. 日付を選択
3. 行動を文章で確認

例：
```
09:00 - VSCodeで作業（45分）
09:45 - GitHubで作業（10分）
09:55 - YouTubeで作業（15分）
10:10 - VSCodeで作業（30分）
```

これにより、「GitHubで調べた後にYouTubeに流れてしまった」などの気づきが得られます。

#### Insightsで傾向を確認
1. **Insights** タブをクリック
2. 行動パターンの傾向を確認

例：
- 「GitHubからYouTubeへの遷移が最も多い（8回）」
- 「14時台に最も集中している」
- 「平均セッション時間は25分」

### 5. 改善のサイクル

ActionTrackerのデータを使って、自分の行動を改善します：

#### パターンの発見
- どの時間帯に集中できているか？
- どんな時に脱線してしまうか？
- どのアプリの切り替えが多いか？

#### 改善アクション
- 集中できない時間帯は別の作業にする
- 脱線しやすいサイトをブロックする
- アプリ切替を減らすためにタスクを整理する

#### 効果の確認
- 数日後にStoryやInsightsを確認
- 改善前と比較して変化があるか確認

## バッチファイルによる自動起動

毎回3つのターミナルを開くのは面倒なので、バッチファイルを作成します：

### start_action_tracker.bat

```batch
@echo off
cd /d C:\Users\kkyog\cousor\action

echo Starting ActionTracker...
echo.

echo [1/3] Starting Tracker Agent...
start "ActionTracker - Tracker" cmd /k "python backend/tracker/event_tracker.py"

timeout /t 2 /nobreak

echo [2/3] Starting API Server...
start "ActionTracker - API" cmd /k "python backend/api/fastapi_app.py"

timeout /t 2 /nobreak

echo [3/3] Starting Frontend...
start "ActionTracker - Frontend" cmd /k "cd frontend-react && npm run dev"

echo.
echo All components started!
echo Dashboard: http://localhost:5173
echo API Docs: http://127.0.0.1:8000/docs
echo.
pause
```

このファイルを `start_action_tracker.bat` として保存し、ダブルクリックするだけで全コンポーネントが起動します。

## 週次レビューの習慣

毎週日曜日の夜など、週次でレビューすることをお勧めします：

### 週次レビューチェックリスト

1. **週間の総使用時間**
   - DashboardやTimelineで週間の総使用時間を確認
   - 前週と比較して増減を確認

2. **集中時間の分析**
   - Insightsで最も集中している時間帯を確認
   - その時間帯に重要な作業をスケジュールする

3. **脱線パターンの特定**
   - Storyで脱線しているパターンを特定
   - 例：「調査開始後にYouTubeへ遷移する傾向がある」

4. **カテゴリ別の時間配分**
   - 開発、学習、娯楽などのカテゴリ別時間を確認
   - 理想的な配分に近づいているか確認

5. **改善目標の設定**
   - 来週の改善目標を設定
   - 例：「YouTubeへの遷移を半減する」「午前中に集中時間を増やす」

## 月次レビュー

月次ではより長期的な傾向を分析：

1. 月間の総使用時間の推移
2. 月間の平均集中時間の変化
3. 月間の脱線パターンの変化
4. カテゴリ別時間配分の月次比較

## プライバシーについて

- データはローカルPCのみに保存
- クラウド送信は一切なし
- 銀行サイト、パスワードマネージャー等は自動マスク
- データは自分で完全にコントロール可能

## データのバックアップ

定期的にデータベースをバックアップすることをお勧めします：

```bash
# バックアップ作成
copy data\action_tracker.db data\backup\action_tracker_%date:~-10%.db
```

または、週次で手動でバックアップ：

```bash
copy data\action_tracker.db data\backup\action_tracker_weekly.db
```

## トラッキング停止

PCをシャットダウンする場合：

1. 各ターミナルで `Ctrl+C` を押して各コンポーネントを停止
2. またはターミナルを閉じる

データは自動的に保存されるので、特別な終了処理は不要です。

## まとめ

### 日常フロー
1. PC起動 → ActionTracker起動
2. 普段通り作業
3. 作業中や一日の終わりにDashboardで確認
4. 一日の終わりにStoryで振り返り
5. 週次でInsightsで傾向分析
6. 改善アクションを実行
7. 効果を確認

### 成功のポイント
- 毎日起動する習慣をつける
- 週次で振り返る時間を設ける
- データを客観的に見て改善に繋げる
- プライバシーを安心して利用できる

ActionTrackerは単なる記録ツールではなく、自己理解と生産性向上のためのパートナーです。
