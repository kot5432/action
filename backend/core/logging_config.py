"""
ロギング設定モジュール
構造化ロギングを実装
"""
import logging
import sys
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any

# 設定
from backend.core.config import config


class JSONFormatter(logging.Formatter):
    """JSON形式のログフォーマッター"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # 例外情報があれば追加
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # 追加のコンテキスト情報があれば追加
        if hasattr(record, 'extra'):
            log_data.update(record.extra)
        
        return json.dumps(log_data, ensure_ascii=False)


def setup_logging(log_level: Optional[str] = None) -> logging.Logger:
    """ロギングを設定"""
    if log_level is None:
        log_level = "DEBUG" if config.DEBUG else "INFO"
    
    # ロガーを作成
    logger = logging.getLogger("actiontracker")
    logger.setLevel(getattr(logging, log_level))
    
    # 既存のハンドラーをクリア
    logger.handlers.clear()
    
    # JSONフォーマッター
    json_formatter = JSONFormatter()
    
    # 標準フォーマッター（コンソール用）
    standard_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # コンソールハンドラー（標準形式）
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, log_level))
    console_handler.setFormatter(standard_formatter)
    logger.addHandler(console_handler)
    
    # ファイルハンドラー（JSON形式）
    log_dir = config.get_data_dir() / 'logs'
    log_dir.mkdir(exist_ok=True)
    
    json_file_handler = logging.FileHandler(
        log_dir / f'actiontracker_{datetime.now().strftime("%Y%m%d")}.jsonl'
    )
    json_file_handler.setLevel(logging.DEBUG)
    json_file_handler.setFormatter(json_formatter)
    logger.addHandler(json_file_handler)
    
    # ファイルハンドラー（標準形式、開発環境のみ）
    if config.DEBUG:
        standard_file_handler = logging.FileHandler(
            log_dir / f'actiontracker_{datetime.now().strftime("%Y%m%d")}.log'
        )
        standard_file_handler.setLevel(logging.DEBUG)
        standard_file_handler.setFormatter(standard_formatter)
        logger.addHandler(standard_file_handler)
    
    return logger


def get_logger(name: str) -> logging.Logger:
    """ロガーを取得"""
    return logging.getLogger(f"actiontracker.{name}")


# グローバルロガー
logger = setup_logging()
