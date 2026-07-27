"""
行動スコアリングモジュール

要件定義書に基づくスコア計算ロジック：
- 集中スコア：集中セッションの総時間 / 総稼働時間
- 脱線スコア：脱線セッション回数 / 総セッション数
- 復帰率：脱線後に元の作業に戻った割合
- 生産性指数：(集中時間 × 復帰率) / 脱線回数
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from backend.core.database import get_db_connection, insert_session_block, insert_focus_session, insert_derail_session, upsert_daily_story


class BehaviorScorer:
    """行動スコア計算クラス"""

    def __init__(self):
        self.focus_categories = ['開発', '学習']
        self.distract_categories = ['娯楽', 'SNS']
        self.idle_threshold_minutes = 15  # アイドル15分以上でセッション分割
        self.short_switch_threshold_seconds = 30  # 短時間切替（30秒未満）をノイズとして除外
        self.investigation_services = ['GitHub', 'StackOverflow', 'Google']  # 調査系サービス

    def calculate_daily_scores(self, date: str) -> Dict:
        """
        指定された日付のスコアを計算する

        Args:
            date: 日付文字列 (YYYY-MM-DD)

        Returns:
            スコア情報を含む辞書
        """
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            # 総稼働時間を取得
            cursor.execute('''
                SELECT SUM(duration_seconds) as total_seconds
                FROM sessions
                WHERE DATE(start_time) = ?
            ''', (date,))
            total_seconds = cursor.fetchone()['total_seconds'] or 0
            total_minutes = total_seconds / 60

            # 集中カテゴリの稼働時間
            cursor.execute('''
                SELECT SUM(duration_seconds) as focus_seconds
                FROM sessions
                WHERE DATE(start_time) = ?
                AND category IN ({})
            '''.format(','.join(['?' for _ in self.focus_categories])),
                [date] + self.focus_categories)
            focus_seconds = cursor.fetchone()['focus_seconds'] or 0
            focus_minutes = focus_seconds / 60

            # 脱線カテゴリの稼働時間
            cursor.execute('''
                SELECT SUM(duration_seconds) as distract_seconds
                FROM sessions
                WHERE DATE(start_time) = ?
                AND category IN ({})
            '''.format(','.join(['?' for _ in self.distract_categories])),
                [date] + self.distract_categories)
            distract_seconds = cursor.fetchone()['distract_seconds'] or 0
            distract_minutes = distract_seconds / 60

            # セッション数を取得
            cursor.execute('''
                SELECT COUNT(*) as session_count
                FROM sessions
                WHERE DATE(start_time) = ?
            ''', (date,))
            session_count = cursor.fetchone()['session_count'] or 0

            # 遷移データを取得
            cursor.execute('''
                SELECT from_category, to_category
                FROM transitions
                WHERE DATE(timestamp) = ?
            ''', (date,))
            transitions = cursor.fetchall()

            # 復帰率を計算
            return_rate = self._calculate_return_rate(transitions)

            # 脱線回数を計算
            derail_count = self._calculate_derail_count(transitions)

            conn.close()

            # スコア計算
            score_focus = (focus_minutes / total_minutes * 100) if total_minutes > 0 else 0
            score_derail = (derail_count / session_count * 100) if session_count > 0 else 0
            productivity_index = self._calculate_productivity_index(
                focus_minutes, return_rate, derail_count
            )

            return {
                'date': date,
                'total_minutes': total_minutes,
                'focus_minutes': focus_minutes,
                'distract_minutes': distract_minutes,
                'session_count': session_count,
                'derail_count': derail_count,
                'return_rate': return_rate,
                'score_focus': score_focus,
                'score_derail': score_derail,
                'productivity_index': productivity_index
            }
        except Exception as e:
            print(f"Error calculating scores: {e}")
            # デフォルト値を返す
            return {
                'date': date,
                'total_minutes': 0,
                'focus_minutes': 0,
                'distract_minutes': 0,
                'session_count': 0,
                'derail_count': 0,
                'return_rate': 100,
                'score_focus': 0,
                'score_derail': 100,
                'productivity_index': 0
            }

    def _calculate_return_rate(self, transitions: List) -> float:
        """
        復帰率を計算する

        Args:
            transitions: 遷移データリスト

        Returns:
            復帰率（0-100）
        """
        if not transitions:
            return 0.0

        focus_to_distract = 0
        distract_to_focus = 0

        for trans in transitions:
            from_cat = trans['from_category']
            to_cat = trans['to_category']

            if from_cat in self.focus_categories and to_cat in self.distract_categories:
                focus_to_distract += 1
            elif from_cat in self.distract_categories and to_cat in self.focus_categories:
                distract_to_focus += 1

        if focus_to_distract == 0:
            return 100.0  # 脱線がない場合は100%

        return (distract_to_focus / focus_to_distract * 100)

    def _calculate_derail_count(self, transitions: List) -> int:
        """
        脱線回数を計算する

        Args:
            transitions: 遷移データリスト

        Returns:
            脱線回数
        """
        if not transitions:
            return 0

        derail_count = 0
        for trans in transitions:
            from_cat = trans['from_category']
            to_cat = trans['to_category']

            if from_cat in self.focus_categories and to_cat in self.distract_categories:
                derail_count += 1

        return derail_count

    def _calculate_productivity_index(self, focus_minutes: float, 
                                       return_rate: float, derail_count: int) -> float:
        """
        生産性指数を計算する

        Args:
            focus_minutes: 集中時間（分）
            return_rate: 復帰率（0-100）
            derail_count: 脱線回数

        Returns:
            生産性指数
        """
        if derail_count == 0:
            return focus_minutes * (return_rate / 100) if focus_minutes > 0 else 0

        return (focus_minutes * (return_rate / 100)) / derail_count

    def analyze_session_blocks(self, date: str) -> List[Dict]:
        """
        セッション分割分析を実行する（要件定義書詳細要件対応）

        Args:
            date: 日付文字列 (YYYY-MM-DD)

        Returns:
            セッションブロックリスト
        """
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            # セッションデータを取得
            cursor.execute('''
                SELECT start_time, end_time, duration_seconds, category, service
                FROM sessions
                WHERE DATE(start_time) = ?
                ORDER BY start_time
            ''', (date,))
            sessions = cursor.fetchall()

            if not sessions:
                conn.close()
                return []

            # 短時間切替（ノイズ）を除外
            filtered_sessions = []
            for session in sessions:
                session_data = dict(session)
                # duration_secondsが存在しない場合はスキップ
                if 'duration_seconds' not in session_data or session_data['duration_seconds'] is None:
                    continue
                if session_data['duration_seconds'] >= self.short_switch_threshold_seconds:
                    filtered_sessions.append(session_data)

            if not filtered_sessions:
                conn.close()
                return []

            # セッション分割ロジック
            blocks = []
            current_block = None

            for session in filtered_sessions:
                start_time = datetime.fromisoformat(session['start_time'].replace('Z', '+00:00'))
                end_time = datetime.fromisoformat(session['end_time'].replace('Z', '+00:00'))
                category = session['category'] or 'その他'
                service = session['service'] or ''

                # アイドル判定（15分以上）
                if current_block:
                    time_diff = (start_time - current_block['end_time']).total_seconds() / 60
                    if time_diff >= self.idle_threshold_minutes:
                        blocks.append(current_block)
                        current_block = None

                # カテゴリ大変化判定
                if current_block and current_block['category'] != category:
                    blocks.append(current_block)
                    current_block = None

                if current_block is None:
                    # 新しいブロックを開始
                    current_block = {
                        'start_time': start_time,
                        'end_time': end_time,
                        'category': category,
                        'services': [service],
                        'sessions': [session]
                    }
                else:
                    # 現在のブロックに追加
                    current_block['end_time'] = end_time
                    current_block['services'].append(service)
                    current_block['sessions'].append(session)

            # 最後のブロックを追加
            if current_block:
                blocks.append(current_block)

            # 各ブロックのスコアを計算
            scored_blocks = []
            for block in blocks:
                duration = (block['end_time'] - block['start_time']).total_seconds()
                is_focus = block['category'] in self.focus_categories
                is_derail = block['category'] in self.distract_categories
                
                # 集中セッション判定（詳細要件）
                is_focus_session = self._is_focus_session(block)
                
                # 脱線セッション判定（詳細要件）
                is_derail_session = self._is_derail_session(block)

                block_data = {
                    'start_time': block['start_time'],
                    'end_time': block['end_time'],
                    'duration_seconds': duration,
                    'category': block['category'],
                    'is_focus': is_focus,
                    'is_derail': is_derail,
                    'is_focus_session': is_focus_session,
                    'is_derail_session': is_derail_session,
                    'focus_level': duration / 60 if is_focus else 0,
                    'session_count': len(block['sessions']),
                    'services': block['services']
                }
                scored_blocks.append(block_data)

            conn.close()
            return scored_blocks
        except Exception as e:
            print(f"Error analyzing session blocks: {e}")
            return []

    def _is_focus_session(self, block: Dict) -> bool:
        """
        集中セッション判定（要件定義書詳細要件）
        - 同カテゴリ連続
        - 同タグ連続（将来的に実装）
        - 調査系遷移（GitHub→StackOverflow）

        Args:
            block: セッションブロック

        Returns:
            集中セッションかどうか
        """
        # 同カテゴリ連続判定
        if block['category'] not in self.focus_categories:
            return False

        # 調査系遷移判定
        services = block['services']
        has_investigation = any(
            any(inv in svc for inv in self.investigation_services)
            for svc in services
        )

        # 集中カテゴリかつ調査系サービスを含む場合、集中セッションと判定
        return has_investigation or len(set(services)) == 1

    def _is_derail_session(self, block: Dict) -> bool:
        """
        脱線セッション判定（要件定義書詳細要件）
        - 学習/開発 → 娯楽カテゴリ
        - SNS遷移
        - 滞在時間が長い場合

        Args:
            block: セッションブロック

        Returns:
            脱線セッションかどうか
        """
        # 娯楽カテゴリかつ滞在時間が長い場合（5分以上）
        if block['category'] in self.distract_categories:
            duration_minutes = block['duration_seconds'] / 60
            return duration_minutes >= 5

        return False

    def save_session_blocks(self, date: str) -> bool:
        """
        セッションブロックをデータベースに保存する

        Args:
            date: 日付文字列 (YYYY-MM-DD)

        Returns:
            保存成功かどうか
        """
        try:
            blocks = self.analyze_session_blocks(date)
            scores = self.calculate_daily_scores(date)

            for block in blocks:
                # session_blocks テーブルに保存
                block_id = insert_session_block(
                    start_time=block['start_time'],
                    end_time=block['end_time'],
                    duration_seconds=int(block['duration_seconds']),
                    category=block['category'],
                    is_focus=block['is_focus'],
                    is_derail=block['is_derail'],
                    focus_level=block['focus_level'],
                    score_focus=scores['score_focus'],
                    score_derail=scores['score_derail'],
                    return_rate=scores['return_rate'],
                    date=date
                )

                # 集中セッションを保存
                if block['is_focus_session']:
                    insert_focus_session(
                        block_id=block_id,
                        start_time=block['start_time'],
                        end_time=block['end_time'],
                        duration_seconds=int(block['duration_seconds']),
                        category=block['category'],
                        return_rate=scores['return_rate']
                    )

                # 脱線セッションを保存
                if block['is_derail_session']:
                    insert_derail_session(
                        block_id=block_id,
                        start_time=block['start_time'],
                        end_time=block['end_time'],
                        duration_seconds=int(block['duration_seconds']),
                        from_category=block['category'],
                        to_category=block['category']  # 簡易版
                    )

            # デイリーストーリーを保存
            story_data = self.generate_daily_story(date)
            upsert_daily_story(
                date=date,
                story=story_data['story'],
                total_focus_minutes=int(story_data['total_focus_minutes']),
                total_derail_count=story_data['total_derail_count'],
                score=story_data['score']
            )

            return True
        except Exception as e:
            print(f"Error saving session blocks: {e}")
            return False

    def generate_daily_story(self, date: str) -> Dict:
        """
        デイリーストーリーを生成する（要件定義書詳細要件対応）

        Args:
            date: 日付文字列 (YYYY-MM-DD)

        Returns:
            ストーリーデータ
        """
        scores = self.calculate_daily_scores(date)
        blocks = self.analyze_session_blocks(date)

        # ストーリーテキスト生成（章立て形式）
        story_lines = []
        story_lines.append(f"## {date} の行動ストーリー\n")
        
        # サマリーセクション
        story_lines.append("### 📊 サマリー")
        story_lines.append(f"- 総稼働時間: {int(scores['total_minutes'])}分")
        story_lines.append(f"- 集中時間: {int(scores['focus_minutes'])}分 ({scores['score_focus']:.1f}%)")
        story_lines.append(f"- 脱線回数: {scores['derail_count']}回")
        story_lines.append(f"- 復帰率: {scores['return_rate']:.1f}%")
        story_lines.append(f"- 生産性指数: {scores['productivity_index']:.2f}\n")

        # 集中セッションセクション
        focus_blocks = [b for b in blocks if b['is_focus_session']]
        if focus_blocks:
            story_lines.append("### 🎯 集中セッション")
            total_focus_time = sum(b['duration_seconds'] for b in focus_blocks) / 60
            story_lines.append(f"総集中時間: {int(total_focus_time)}分\n")
            
            for i, block in enumerate(focus_blocks, 1):
                time_str = block['start_time'].strftime("%H:%M")
                duration_min = int(block['duration_seconds'] / 60)
                services_str = ", ".join(set(block['services']))
                story_lines.append(
                    f"{i}. {time_str}〜{duration_min}分: {block['category']}"
                )
                story_lines.append(f"   サービス: {services_str}")
                story_lines.append(f"   セッション数: {block['session_count']}\n")

        # 脱線セッションセクション
        derail_blocks = [b for b in blocks if b['is_derail_session']]
        if derail_blocks:
            story_lines.append("### 🎮 脱線セッション")
            total_derail_time = sum(b['duration_seconds'] for b in derail_blocks) / 60
            story_lines.append(f"総脱線時間: {int(total_derail_time)}分\n")
            
            for i, block in enumerate(derail_blocks, 1):
                time_str = block['start_time'].strftime("%H:%M")
                duration_min = int(block['duration_seconds'] / 60)
                services_str = ", ".join(set(block['services']))
                story_lines.append(
                    f"{i}. {time_str}〜{duration_min}分: {block['category']}"
                )
                story_lines.append(f"   サービス: {services_str}")
                story_lines.append(f"   推定脱線\n")

        # 一般セッションセクション
        other_blocks = [b for b in blocks if not b['is_focus_session'] and not b['is_derail_session']]
        if other_blocks:
            story_lines.append("### 📝 一般セッション\n")
            
            for i, block in enumerate(other_blocks, 1):
                time_str = block['start_time'].strftime("%H:%M")
                duration_min = int(block['duration_seconds'] / 60)
                services_str = ", ".join(set(block['services']))
                story_lines.append(
                    f"{i}. {time_str}〜{duration_min}分: {block['category']}"
                )
                story_lines.append(f"   サービス: {services_str}\n")

        # インサイトセクション
        story_lines.append("### 💡 インサイト")
        if scores['score_focus'] >= 70:
            story_lines.append("- 集中率が高い状態を維持できています")
        elif scores['score_focus'] >= 50:
            story_lines.append("- 集中と脱線のバランスが取れています")
        else:
            story_lines.append("- 集中率の改善余地があります")
        
        if scores['return_rate'] >= 80:
            story_lines.append("- 脱線後の復帰率が高いです")
        elif scores['return_rate'] >= 50:
            story_lines.append("- 復帰率は平均的です")
        else:
            story_lines.append("- 脱線後に復帰する割合を上げましょう")

        story_text = "\n".join(story_lines)

        return {
            'date': date,
            'story': story_text,
            'total_focus_minutes': scores['focus_minutes'],
            'total_derail_count': scores['derail_count'],
            'score': scores['productivity_index']
        }

    def generate_classified_insights(self, date: str) -> List[Dict]:
        """
        分類されたインサイトを生成する（要件定義書詳細要件対応）

        Args:
            date: 日付文字列 (YYYY-MM-DD)

        Returns:
            分類されたインサイトリスト
        """
        try:
            scores = self.calculate_daily_scores(date)
            blocks = self.analyze_session_blocks(date)
            insights = []

            # 時間帯インサイト
            hour_insights = self._generate_time_insights(blocks)
            insights.extend(hour_insights)

            # 遷移インサイト
            transition_insights = self._generate_transition_insights(date)
            insights.extend(transition_insights)

            # 集中インサイト
            focus_insights = self._generate_focus_insights(scores, blocks)
            insights.extend(focus_insights)

            # 脱線インサイト
            derail_insights = self._generate_derail_insights(scores, blocks)
            insights.extend(derail_insights)

            return insights
        except Exception as e:
            print(f"Error generating insights: {e}")
            return [{
                "type": "error",
                "category": "エラー",
                "message": f"インサイト生成中にエラーが発生しました: {str(e)}",
                "severity": "danger",
                "data": {}
            }]

    def _generate_time_insights(self, blocks: List[Dict]) -> List[Dict]:
        """時間帯インサイトを生成"""
        insights = []
        
        if not blocks:
            return insights

        # 時間帯別アクティビティ集計
        hour_activity = {}
        for block in blocks:
            hour = block['start_time'].hour
            hour_activity[hour] = hour_activity.get(hour, 0) + block['duration_seconds']

        if hour_activity:
            peak_hour = max(hour_activity, key=hour_activity.get)
            insights.append({
                "type": "time_pattern",
                "category": "時間帯",
                "message": f"{peak_hour}時台に最も多く活動しています",
                "severity": "info",
                "data": {"peak_hour": peak_hour, "activity_minutes": hour_activity[peak_hour] / 60}
            })

        return insights

    def _generate_transition_insights(self, date: str) -> List[Dict]:
        """遷移インサイトを生成"""
        insights = []
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT from_category, to_category, COUNT(*) as count
            FROM transitions
            WHERE DATE(timestamp) = ?
            GROUP BY from_category, to_category
            ORDER BY count DESC
            LIMIT 5
        ''', (date,))
        
        transitions = cursor.fetchall()
        conn.close()

        if transitions:
            top_trans = transitions[0]
            insights.append({
                "type": "transition",
                "category": "遷移",
                "message": f"最も多い遷移: {top_trans['from_category']} → {top_trans['to_category']} ({top_trans['count']}回)",
                "severity": "info",
                "data": {"from": top_trans['from_category'], "to": top_trans['to_category'], "count": top_trans['count']}
            })

        return insights

    def _generate_focus_insights(self, scores: Dict, blocks: List[Dict]) -> List[Dict]:
        """集中インサイトを生成"""
        insights = []
        
        focus_blocks = [b for b in blocks if b['is_focus_session']]
        
        if scores['score_focus'] >= 70:
            insights.append({
                "type": "focus",
                "category": "集中",
                "message": "集中率が高い状態を維持できています",
                "severity": "success",
                "data": {"score_focus": scores['score_focus'], "focus_minutes": scores['focus_minutes']}
            })
        elif scores['score_focus'] >= 50:
            insights.append({
                "type": "focus",
                "category": "集中",
                "message": "集中と脱線のバランスが取れています",
                "severity": "warning",
                "data": {"score_focus": scores['score_focus'], "focus_minutes": scores['focus_minutes']}
            })
        else:
            insights.append({
                "type": "focus",
                "category": "集中",
                "message": "集中率の改善余地があります",
                "severity": "danger",
                "data": {"score_focus": scores['score_focus'], "focus_minutes": scores['focus_minutes']}
            })

        if focus_blocks:
            avg_focus_duration = sum(b['duration_seconds'] for b in focus_blocks) / len(focus_blocks) / 60
            insights.append({
                "type": "focus",
                "category": "集中",
                "message": f"平均集中セッション時間: {avg_focus_duration:.1f}分",
                "severity": "info",
                "data": {"avg_focus_duration": avg_focus_duration}
            })

        return insights

    def _generate_derail_insights(self, scores: Dict, blocks: List[Dict]) -> List[Dict]:
        """脱線インサイトを生成"""
        insights = []
        
        derail_blocks = [b for b in blocks if b['is_derail_session']]
        
        if scores['return_rate'] >= 80:
            insights.append({
                "type": "derail",
                "category": "脱線",
                "message": "脱線後の復帰率が高いです",
                "severity": "success",
                "data": {"return_rate": scores['return_rate']}
            })
        elif scores['return_rate'] >= 50:
            insights.append({
                "type": "derail",
                "category": "脱線",
                "message": "復帰率は平均的です",
                "severity": "warning",
                "data": {"return_rate": scores['return_rate']}
            })
        else:
            insights.append({
                "type": "derail",
                "category": "脱線",
                "message": "脱線後に復帰する割合を上げましょう",
                "severity": "danger",
                "data": {"return_rate": scores['return_rate']}
            })

        if derail_blocks:
            avg_derail_duration = sum(b['duration_seconds'] for b in derail_blocks) / len(derail_blocks) / 60
            insights.append({
                "type": "derail",
                "category": "脱線",
                "message": f"平均脱線時間: {avg_derail_duration:.1f}分",
                "severity": "info",
                "data": {"avg_derail_duration": avg_derail_duration}
            })

        return insights


def calculate_scores(date: str) -> Dict:
    """
    スコア計算の簡易インターフェース

    Args:
        date: 日付文字列 (YYYY-MM-DD)

    Returns:
        スコア情報
    """
    scorer = BehaviorScorer()
    return scorer.calculate_daily_scores(date)


def generate_story(date: str) -> Dict:
    """
    ストーリー生成の簡易インターフェース

    Args:
        date: 日付文字列 (YYYY-MM-DD)

    Returns:
        ストーリーデータ
    """
    scorer = BehaviorScorer()
    return scorer.generate_daily_story(date)
