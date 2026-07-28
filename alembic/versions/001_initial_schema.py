"""initial schema

Revision ID: 001
Revises: 
Create Date: 2026-07-28 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create tables only if they don't exist (for existing databases)
    op.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME NOT NULL,
            event_type TEXT NOT NULL,
            app_name TEXT,
            service TEXT,
            category TEXT,
            window_title TEXT,
            metadata TEXT
        )
    """)
    
    op.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            start_time DATETIME NOT NULL,
            end_time DATETIME NOT NULL,
            duration_seconds INTEGER,
            app_name TEXT,
            service TEXT,
            category TEXT
        )
    """)
    
    op.execute("""
        CREATE TABLE IF NOT EXISTS transitions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME,
            from_service TEXT,
            to_service TEXT,
            from_category TEXT,
            to_category TEXT
        )
    """)
    
    op.execute("""
        CREATE TABLE IF NOT EXISTS category_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pattern TEXT NOT NULL,
            category TEXT NOT NULL,
            priority INTEGER DEFAULT 0,
            is_regex BOOLEAN DEFAULT 0,
            enabled BOOLEAN DEFAULT 1,
            created_at DATETIME,
            updated_at DATETIME
        )
    """)
    
    op.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            color TEXT,
            created_at DATETIME,
            updated_at DATETIME
        )
    """)
    
    op.execute("""
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            color TEXT,
            created_at DATETIME
        )
    """)
    
    op.execute("""
        CREATE TABLE IF NOT EXISTS service_tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service TEXT NOT NULL,
            tag_id INTEGER,
            created_at DATETIME,
            FOREIGN KEY (tag_id) REFERENCES tags(id),
            UNIQUE(service, tag_id)
        )
    """)
    
    op.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    
    op.execute("""
        CREATE TABLE IF NOT EXISTS notification_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            enabled BOOLEAN DEFAULT 1,
            time TEXT,
            last_sent TEXT,
            created_at DATETIME,
            updated_at DATETIME
        )
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('notification_settings')
    op.drop_table('settings')
    op.drop_table('service_tags')
    op.drop_table('tags')
    op.drop_table('categories')
    op.drop_table('category_rules')
    op.drop_table('transitions')
    op.drop_table('sessions')
    op.drop_table('events')
