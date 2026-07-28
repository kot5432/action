"""
データベースバックアップ・復元モジュール
"""
import sqlite3
import shutil
import os
from datetime import datetime
from pathlib import Path
from typing import Optional
import json
from backend.core.config import config


class BackupManager:
    """データベースバックアップ・復元管理クラス"""
    
    def __init__(self):
        self.backup_dir = Path("backups")
        self.backup_dir.mkdir(exist_ok=True)
    
    def create_backup(self, name: Optional[str] = None) -> str:
        """
        データベースバックアップを作成
        Args:
            name: バックアップ名（省略時はタイムスタンプ）
        Returns:
            バックアップファイルパス
        """
        if name is None:
            name = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        backup_path = self.backup_dir / f"{name}.db"
        
        # データベースファイルをコピー
        shutil.copy2(config.DATABASE_PATH, backup_path)
        
        # バックアップメタデータを保存
        metadata = {
            "name": name,
            "created_at": datetime.now().isoformat(),
            "size": backup_path.stat().st_size,
            "original_path": config.DATABASE_PATH
        }
        
        metadata_path = self.backup_dir / f"{name}.json"
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        return str(backup_path)
    
    def restore_backup(self, name: str) -> bool:
        """
        バックアップから復元
        Args:
            name: バックアップ名
        Returns:
            成功時True、失敗時False
        """
        backup_path = self.backup_dir / f"{name}.db"
        
        if not backup_path.exists():
            return False
        
        # 現在のデータベースをバックアップ
        current_backup = self.create_backup(f"pre_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        
        try:
            # バックアップを復元
            shutil.copy2(backup_path, config.DATABASE_PATH)
            return True
        except Exception:
            # 失敗した場合は元に戻す
            shutil.copy2(current_backup, config.DATABASE_PATH)
            return False
    
    def list_backups(self) -> list:
        """
        バックアップ一覧を取得
        Returns:
            バックアップ情報のリスト
        """
        backups = []
        
        for metadata_file in self.backup_dir.glob("*.json"):
            try:
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                backups.append(metadata)
            except Exception:
                continue
        
        # 作成日時でソート
        backups.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return backups
    
    def delete_backup(self, name: str) -> bool:
        """
        バックアップを削除
        Args:
            name: バックアップ名
        Returns:
            成功時True、失敗時False
        """
        backup_path = self.backup_dir / f"{name}.db"
        metadata_path = self.backup_dir / f"{name}.json"
        
        try:
            if backup_path.exists():
                backup_path.unlink()
            if metadata_path.exists():
                metadata_path.unlink()
            return True
        except Exception:
            return False
    
    def cleanup_old_backups(self, keep_count: int = 10) -> int:
        """
        古いバックアップを削除
        Args:
            keep_count: 保持するバックアップ数
        Returns:
            削除したバックアップ数
        """
        backups = self.list_backups()
        
        if len(backups) <= keep_count:
            return 0
        
        deleted_count = 0
        for backup in backups[keep_count:]:
            if self.delete_backup(backup['name']):
                deleted_count += 1
        
        return deleted_count


# グローバルインスタンス
backup_manager = BackupManager()
