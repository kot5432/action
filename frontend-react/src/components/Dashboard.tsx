import { useEffect, useState } from 'react';
import { Clock, SwitchCamera, Pause, Square } from 'lucide-react';
import { getDashboard } from '../lib/api';
import type { DashboardData } from '../types/api';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecording] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const dashboardData = await getDashboard();
        setData(dashboardData);
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
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm text-gray-600">{isRecording ? 'Recording' : 'Paused'}</span>
          </div>
        </div>
      </div>

      {/* Current Activity */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-grow">
            <p className="text-sm text-gray-500 mb-2">現在のアクティビティ</p>
            <div className="flex items-center space-x-4">
              <div>
                <p className="text-2xl font-semibold text-gray-900">{data.current_app}</p>
                {data.current_domain && (
                  <p className="text-sm text-gray-400 mt-1">{data.current_domain}</p>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Usage */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <Clock className="w-5 h-5 text-gray-400" />
            <span className="text-xs text-gray-400">今日の合計使用時間</span>
          </div>
          <p className="text-3xl font-semibold text-gray-900">
            {formatTime(data.today_usage_minutes)}
          </p>
        </div>

        {/* Switch Count */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <SwitchCamera className="w-5 h-5 text-gray-400" />
            <span className="text-xs text-gray-400">コンテキストスイッチ</span>
          </div>
          <p className="text-3xl font-semibold text-gray-900">
            {data.switch_count}
          </p>
        </div>
      </div>
    </div>
  );
}
