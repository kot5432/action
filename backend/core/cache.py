"""
キャッシュモジュール
パフォーマンス最適化のためのキャッシュ機能
"""
from functools import wraps
from typing import Optional, Callable, Any
import hashlib
import json

# 設定
from backend.core.config import config

# 簡易インメモリキャッシュ（Redisが利用できない場合）
_memory_cache = {}


def cache_key_generator(*args, **kwargs) -> str:
    """キャッシュキーを生成"""
    key_data = {
        'args': args,
        'kwargs': kwargs
    }
    key_str = json.dumps(key_data, sort_keys=True, default=str)
    return hashlib.md5(key_str.encode()).hexdigest()


def cache_result(ttl: int = 300):
    """
    結果をキャッシュするデコレーター
    ttl: キャッシュの有効期限（秒）
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            # キャッシュキーを生成
            cache_key = f"{func.__name__}:{cache_key_generator(*args, **kwargs)}"
            
            # キャッシュから取得
            if cache_key in _memory_cache:
                cached_data, timestamp = _memory_cache[cache_key]
                # TTLチェック
                import time
                if time.time() - timestamp < ttl:
                    return cached_data
            
            # 関数を実行
            result = func(*args, **kwargs)
            
            # キャッシュに保存
            import time
            _memory_cache[cache_key] = (result, time.time())
            
            return result
        return wrapper
    return decorator


def clear_cache(pattern: Optional[str] = None):
    """キャッシュをクリア"""
    global _memory_cache
    if pattern:
        keys_to_delete = [k for k in _memory_cache.keys() if pattern in k]
        for key in keys_to_delete:
            del _memory_cache[key]
    else:
        _memory_cache.clear()


def get_cache_stats() -> dict:
    """キャッシュ統計を取得"""
    return {
        'cache_size': len(_memory_cache),
        'cache_keys': list(_memory_cache.keys())
    }
