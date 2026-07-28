"""
Sentryエラートラッキング設定モジュール
"""
import logging
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.logging import LoggingIntegration

# 設定
from backend.core.config import config


def setup_sentry():
    """Sentryを初期化"""
    if config.DEBUG:
        # 開発環境ではSentryを無効化
        return
    
    sentry_sdk.init(
        dsn=config.SENTRY_DSN if hasattr(config, 'SENTRY_DSN') else None,
        integrations=[
            FastApiIntegration(),
            LoggingIntegration(
                level=logging.INFO,  # INFO以上のログをキャプチャ
                event_level=logging.ERROR  # ERROR以上のログをイベントとして送信
            )
        ],
        traces_sample_rate=0.1,  # 10%のトレースをサンプリング
        environment=config.ENVIRONMENT,
        release=f"actiontracker@2.0.0",
        before_send=before_send_filter,
    )


def before_send_filter(event, hint):
    """イベント送信前のフィルター"""
    # 機密情報を削除
    if 'request' in event:
        request = event['request']
        if 'headers' in request:
            # Authorizationヘッダーを削除
            request['headers'].pop('authorization', None)
            request['headers'].pop('Authorization', None)
    
    return event


# Sentry初期化
if not config.DEBUG:
    setup_sentry()
