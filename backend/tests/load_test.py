"""
Locust負荷テスト
APIエンドポイントの負荷テストを実行
"""
from locust import HttpUser, task, between
import random


class ActionTrackerUser(HttpUser):
    """ActionTracker APIユーザー"""
    
    wait_time = between(1, 3)
    
    def on_start(self):
        """テスト開始時の処理"""
        # ヘルスチェック
        self.client.get("/health")
    
    @task(3)
    def get_dashboard(self):
        """ダッシュボード取得（高頻度）"""
        self.client.get("/dashboard")
    
    @task(2)
    def get_current(self):
        """現在のセッション取得（中頻度）"""
        self.client.get("/current")
    
    @task(1)
    def get_timeline(self):
        """タイムライン取得（低頻度）"""
        date = random.choice(["today", "7d", "30d"])
        self.client.get(f"/timeline?range={date}")
    
    @task(1)
    def get_summary(self):
        """サマリー取得（低頻度）"""
        self.client.get("/summary")
    
    @task(1)
    def get_categories(self):
        """カテゴリ取得（低頻度）"""
        self.client.get("/categories")


class StressTestUser(HttpUser):
    """ストレステスト用ユーザー"""
    
    wait_time = between(0.1, 0.5)
    
    @task
    def health_check(self):
        """ヘルスチェック（高負荷）"""
        self.client.get("/health")
