import { useEffect, useState } from 'react';
import { Clock, SwitchCamera, Pause, Square, Target, TrendingUp, MessageSquare } from 'lucide-react';
import { getDashboard, getScores, getDailyStory } from '../lib/api';
import type { DashboardData, ScoresData, DailyStory } from '../types/api';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [scores, setScores] = useState<ScoresData | null>(null);
  const [dailyStory, setDailyStory] = useState<DailyStory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [dashboardData, scoresData] = await Promise.all([
          getDashboard(),
          getScores()
        ]);
        setData(dashboardData);
        setScores(scoresData);
        
        // デイリーストーリーはエラーがあっても無視
        try {
          const storyData = await getDailyStory();
          setDailyStory(storyData);
        } catch (storyError) {
          console.warn('Failed to fetch daily story:', storyError);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Failed to load data</div>
      </div>
    );
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const secs = 0;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">現在の状態をリアルタイムで確認</p>
        </div>
      </div>

      {/* Today's Summary - 今日の一言 */}
      {dailyStory && dailyStory.story && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-grow">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">今日の一言</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                {typeof dailyStory.story === 'string' 
                  ? (dailyStory.story.length > 200 
                      ? dailyStory.story.substring(0, 200) + '...' 
                      : dailyStory.story)
                  : '今日のストーリーを生成中...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Activity */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-grow">
            <p className="text-sm text-gray-500 mb-2">現在のアクティビティ</p>
            <div className="flex items-center space-x-4">
              <div>
                <p className="text-2xl font-semibold text-gray-900">{data.current_app}</p>
                {data.current_service && (
                  <p className="text-sm text-gray-400 mt-1">{data.current_service}</p>
                )}
              </div>
              <div className="text-2xl font-mono text-gray-700">
                {formatDuration(data.session_duration_minutes)}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
              <Pause className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
              <Square className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid - 最適化されたレイアウト */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Productivity Index - 最も重要 */}
        {scores && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-xs text-green-600 font-medium">生産性指数</span>
            </div>
            <p className="text-4xl font-bold text-gray-900">
              {scores.productivity_index.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              復帰率: {scores.return_rate.toFixed(1)}%
            </p>
          </div>
        )}

        {/* Focus Score */}
        {scores && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <Target className="w-5 h-5 text-blue-600" />
              <span className="text-xs text-blue-600 font-medium">集中スコア</span>
            </div>
            <p className="text-4xl font-bold text-gray-900">
              {scores.score_focus.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {formatTime(scores.focus_minutes)}
            </p>
          </div>
        )}

        {/* Today's Usage */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <Clock className="w-5 h-5 text-gray-400" />
            <span className="text-xs text-gray-400">今日の合計使用時間</span>
          </div>
          <p className="text-4xl font-semibold text-gray-900">
            {formatTime(data.today_usage_minutes)}
          </p>
        </div>

        {/* Derail Count */}
        {scores && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <SwitchCamera className="w-5 h-5 text-orange-400" />
              <span className="text-xs text-gray-400">脱線回数</span>
            </div>
            <p className="text-4xl font-semibold text-gray-900">
              {scores.derail_count}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              スコア: {scores.score_derail.toFixed(1)}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
