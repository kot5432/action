"""
設定管理モジュール
環境変数ベースの設定管理を実装
"""
import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# .envファイルをロード
load_dotenv()

class Config:
    """設定クラス"""
    
    # プロジェクトルート
    ROOT = Path(__file__).parent.parent.parent
    
    # データベース
    DATABASE_PATH = os.getenv('DATABASE_PATH', str(ROOT / 'data' / 'action_tracker.db'))
    
    # APIサーバー
    API_HOST = os.getenv('API_HOST', '0.0.0.0')
    API_PORT = int(os.getenv('API_PORT', '8000'))
    API_RELOAD = os.getenv('API_RELOAD', 'true').lower() == 'true'
    
    # CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*').split(',')
    
    # プライバシー
    PRIVACY_ENABLED = os.getenv('PRIVACY_ENABLED', 'true').lower() == 'true'
    PRIVACY_MASKED_SERVICES = os.getenv(
        'PRIVACY_MASKED_SERVICES',
        'bank,securities,finance,password,vault,1password,bitwarden,lastpass'
    ).split(',')
    
    # データ保持
    RETENTION_DAYS = int(os.getenv('RETENTION_DAYS', '90'))
    
    # トラッカー
    TRACKER_INTERVAL_SECONDS = int(os.getenv('TRACKER_INTERVAL_SECONDS', '2'))
    IDLE_THRESHOLD_MINUTES = int(os.getenv('IDLE_THRESHOLD_MINUTES', '15'))
    SHORT_SWITCH_THRESHOLD_SECONDS = int(os.getenv('SHORT_SWITCH_THRESHOLD_SECONDS', '30'))
    
    # スコアリング
    FOCUS_CATEGORIES = os.getenv('FOCUS_CATEGORIES', '開発,学習').split(',')
    DISTRACT_CATEGORIES = os.getenv('DISTRACT_CATEGORIES', '娯楽,SNS').split(',')
    INVESTIGATION_SERVICES = os.getenv('INVESTIGATION_SERVICES', 'GitHub,StackOverflow,Google').split(',')
    
    # 環境
    ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')
    DEBUG = os.getenv('DEBUG', 'true').lower() == 'true'
    
    # セキュリティ
    API_KEY = os.getenv('API_KEY', 'dev_api_key_change_in_production')
    SECRET_KEY = os.getenv('SECRET_KEY', 'change_this_secret_key_in_production')
    AUTH_ENABLED = os.getenv('AUTH_ENABLED', 'false').lower() == 'true'
    
    # 定数
    EXCLUDED_SERVICES = ('unknown', 'Unknown', '不明')
    LIVE_SESSION_MAX_AGE_SECONDS = 10
    
    @classmethod
    def get_data_dir(cls) -> Path:
        """データディレクトリを取得"""
        data_dir = Path(cls.DATABASE_PATH).parent
        data_dir.mkdir(parents=True, exist_ok=True)
        return data_dir
    
    @classmethod
    def get_state_file(cls) -> Path:
        """状態ファイルパスを取得"""
        return cls.get_data_dir() / 'current_session.json'


# グローバル設定インスタンス
config = Config()
