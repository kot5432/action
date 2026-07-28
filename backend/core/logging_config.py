"""
ロギング設定モジュール
構造化ロギングを実装
"""
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

# 設定
from backend.core.config import config


def setup_logging(log_level: Optional[str] = None) -> logging.Logger:
    """ロギングを設定"""
    if log_level is None:
        log_level = "DEBUG" if config.DEBUG else "INFO"
    
    # ロガーを作成
    logger = logging.getLogger("actiontracker")
    logger.setLevel(getattr(logging, log_level))
    
    # 既存のハンドラーをクリア
    logger.handlers.clear()
    
    # フォーマット
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # コンソールハンドラー
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, log_level))
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # ファイルハンドラー（開発環境のみ）
    if config.DEBUG:
        log_dir = config.get_data_dir() / 'logs'
        log_dir.mkdir(exist_ok=True)
        
        file_handler = logging.FileHandler(
            log_dir / f'actiontracker_{datetime.now().strftime("%Y%m%d")}.log'
        )
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger


def get_logger(name: str) -> logging.Logger:
    """ロガーを取得"""
    return logging.getLogger(f"actiontracker.{name}")


# グローバルロガー
logger = setup_logging()
