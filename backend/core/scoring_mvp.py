"""
MVP向けシンプルなパターン検出アルゴリズム
"""

from datetime import datetime
from typing import Dict, List
import sqlite3


def get_db():
    conn = sqlite3.connect('action_tracker.db')
    conn.row_factory = sqlite3.Row
    return conn


def simple_pattern_detection(date: str) -> Dict:
    """
    MVP向けシンプルなパターン検出
    
    ルール:
    - セッション分割: 5分以上のアイドルで分割
    - 集中判定: 集中カテゴリ（開発・学習）で30分以上継続
    - 脱線判定: 脱線カテゴリ（娯楽・SNS）で5分以上継続
    - ピーク時間帯: 1時間ごとのアクティビティ集計
    
    Args:
        date: 日付文字列 (YYYY-MM-DD)
    
    Returns:
        {
            'focus_sessions': 集中セッションリスト,
            'derail_sessions': 脱線セッションリスト,
            'peak_hour': ピーク時間帯
        }
    """
    focus_categories = ['開発', '学習']
    distract_categories = ['娯楽', 'SNS']
    
    conn = get_db()
    cur = conn.cursor()
    
    # セッションデータを取得
    cur.execute('''
        SELECT start_time, end_time, service, category, duration_seconds
        FROM sessions
        WHERE DATE(start_time) = ?
        ORDER BY start_time
    ''', (date,))
    
    sessions = []
    for row in cur.fetchall():
        sessions.append({
            'start_time': datetime.fromisoformat(row['start_time'].replace('Z', '+00:00')),
            'end_time': datetime.fromisoformat(row['end_time'].replace('Z', '+00:00')) if row['end_time'] else datetime.now(),
            'category': row['category'] or 'その他',
            'service': row['service'],
            'duration': row['duration_seconds']
        })
    
    conn.close()
    
    if not sessions:
        return {
            'focus_sessions': [],
            'derail_sessions': [],
            'peak_hour': None
        }
    
    # セッション分割（5分以上のアイドルで分割）
    blocks = []
    current_block = None
    
    for session in sessions:
        if current_block:
            time_diff = (session['start_time'] - current_block['end_time']).total_seconds() / 60
            if time_diff >= 5:  # 5分以上のアイドル
                blocks.append(current_block)
                current_block = None
        
        if current_block is None:
            current_block = {
                'start_time': session['start_time'],
                'end_time': session['end_time'],
                'category': session['category'],
                'duration': session['duration']
            }
        else:
            current_block['end_time'] = session['end_time']
            current_block['duration'] += session['duration']
    
    if current_block:
        blocks.append(current_block)
    
    # 集中・脱線判定
    focus_sessions = []
    derail_sessions = []
    
    for block in blocks:
        duration_min = block['duration'] / 60
        
        if block['category'] in focus_categories and duration_min >= 30:
            focus_sessions.append({
                'start_time': block['start_time'],
                'end_time': block['end_time'],
                'category': block['category'],
                'duration_minutes': duration_min
            })
        elif block['category'] in distract_categories and duration_min >= 5:
            derail_sessions.append({
                'start_time': block['start_time'],
                'end_time': block['end_time'],
                'category': block['category'],
                'duration_minutes': duration_min
            })
    
    # ピーク時間帯
    hour_activity = {}
    for session in sessions:
        hour = session['start_time'].hour
        hour_activity[hour] = hour_activity.get(hour, 0) + session['duration']
    
    peak_hour = max(hour_activity, key=hour_activity.get) if hour_activity else None
    
    return {
        'focus_sessions': focus_sessions,
        'derail_sessions': derail_sessions,
        'peak_hour': peak_hour
    }
