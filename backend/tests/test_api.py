"""
基本的なAPIエンドポイントのテスト
"""
import pytest
import sys
import os

# プロジェクトルートをパスに追加
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from fastapi.testclient import TestClient
from backend.api.fastapi_app import app

# 認証を無効化してテスト
import backend.core.config as config_module
config_module.config.AUTH_ENABLED = False

client = TestClient(app)


def test_root_endpoint():
    """ルートエンドポイントのテスト"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "version" in data


def test_health_endpoint():
    """ヘルスチェックエンドポイントのテスト"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "database" in data
    assert "tracker" in data


def test_current_endpoint():
    """現在セッションエンドポイントのテスト"""
    response = client.get("/current")
    assert response.status_code == 200
    data = response.json()
    assert "app_name" in data
    assert "service" in data
    assert "category" in data
    assert "started_at" in data
    assert "duration_seconds" in data


def test_dashboard_endpoint():
    """ダッシュボードエンドポイントのテスト"""
    response = client.get("/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "current_app" in data
    assert "current_service" in data
    assert "today_usage_minutes" in data


def test_categories_endpoint():
    """カテゴリエンドポイントのテスト"""
    response = client.get("/categories")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)


def test_privacy_endpoint():
    """プライバシー設定エンドポイントのテスト"""
    response = client.get("/privacy")
    assert response.status_code == 200
    data = response.json()
    assert "enabled" in data
    assert "masked_services" in data


def test_retention_endpoint():
    """データ保持設定エンドポイントのテスト"""
    response = client.get("/settings/retention")
    assert response.status_code == 200
    data = response.json()
    assert "retention_days" in data


def test_error_handling():
    """エラーハンドリングのテスト"""
    # 存在しないエンドポイントへのアクセス
    response = client.get("/nonexistent")
    assert response.status_code == 404


def test_summary_endpoint():
    """サマリーエンドポイントのテスト"""
    response = client.get("/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_usage_minutes" in data
    assert "switch_count" in data
    assert "focus_sessions" in data
    assert "top_services" in data


def test_services_endpoint():
    """サービスエンドポイントのテスト"""
    response = client.get("/services?range=today")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_categories_usage_endpoint():
    """カテゴリ使用エンドポイントのテスト"""
    response = client.get("/categories/usage?range=today")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
