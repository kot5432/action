import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Filter, Tag } from 'lucide-react';
import { getTimeline } from '../lib/api';
import type { TimelineEntry } from '../types/api';

const APP_COLORS: Record<string, string> = {
  vscode: '#2563eb',
  code: '#2563eb',
  chrome: '#16a34a',
  slack: '#7c3aed',
  notion: '#f59e0b',
  github: '#374151',
  youtube: '#dc2626',
  default: '#6b7280',
};

function getAppColor(app: string): string {
  const lower = app.toLowerCase();
  for (const [key, color] of Object.entries(APP_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return APP_COLORS.default;
}

function getStatusLabel(app: string, domain: string | null): string {
  const lower = (domain ?? app).toLowerCase();
  if (lower.includes('github') || lower.includes('code') || lower.includes('vscode')) return 'Focus';
  if (lower.includes('youtube') || lower.includes('twitter') || lower.includes('x.com')) return 'Escape';
  if (lower.includes('slack') || lower.includes('gmail') || lower.includes('mail')) return 'Active';
  return 'Research';
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'Focus': return 'bg-emerald-100 text-emerald-700';
    case 'Escape': return 'bg-red-100 text-red-600';
    case 'Active': return 'bg-blue-100 text-blue-700';
    default: return 'bg-amber-100 text-amber-700';
  }
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m`;
  }
  return `${m}m ${s}s`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
}

export default function Timeline() {
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getTimeline(selectedDate)
      .then(setTimeline)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedDate]);

  const changeDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const totalSeconds = timeline.reduce((sum, e) => sum + e.duration_seconds, 0);
  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMins = Math.floor((totalSeconds % 3600) / 60);
  const totalStr = `${String(totalHours).padStart(2, '0')}:${String(totalMins).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;

  const ganttStart = 9 * 60;
  const ganttEnd = 22 * 60;
  const ganttRange = ganttEnd - ganttStart;
  const hours = Array.from({ length: 14 }, (_, i) => i + 9);
  const appNames = [...new Set(timeline.map(e => e.app))];

  const focusSec = timeline
    .filter(e => getStatusLabel(e.app, e.domain) === 'Focus')
    .reduce((s, e) => s + e.duration_seconds, 0);
  const focusPct = totalSeconds > 0 ? Math.round((focusSec / totalSeconds) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">タイムライン分析</h1>
          <p className="text-sm text-gray-400 mt-0.5">今日のアプリケーション使用状況の詳細ログ</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => changeDate(-1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-700">{formatDate(selectedDate)}</span>
          </div>
          <button
            onClick={() => changeDate(1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-2">総稼働時間</p>
          <p className="text-2xl font-bold text-gray-900">{totalStr}</p>
          <div className="mt-2 h-1 bg-gray-100 rounded-full">
            <div
              className="h-1 bg-blue-500 rounded-full"
              style={{ width: `${Math.min((totalSeconds / (8 * 3600)) * 100, 100)}%` }}
            />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-2">フォーカス率</p>
          <p className="text-2xl font-bold text-gray-900">{focusPct}%</p>
          <div className="mt-2 h-1 bg-gray-100 rounded-full">
            <div className="h-1 bg-emerald-500 rounded-full" style={{ width: `${focusPct}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-2">主要カテゴリ</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {appNames.slice(0, 3).map((app) => (
              <span
                key={app}
                className="flex items-center space-x-1 text-xs px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: getAppColor(app) }}
              >
                <span>{app}</span>
              </span>
            ))}
            {appNames.length === 0 && <span className="text-sm text-gray-400">データなし</span>}
          </div>
        </div>
      </div>

      {/* Gantt chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">アクティビティ分布</h3>
          <div className="flex items-center space-x-3 text-xs text-gray-500">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              <span>仕事</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span>学習</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              <span>休憩</span>
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Hour axis */}
            <div className="flex mb-2 ml-28">
              {hours.map((h) => (
                <div key={h} className="flex-1 text-xs text-gray-400 text-center">
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>
            {/* Rows */}
            {timeline.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-sm text-gray-400">
                この日のデータはありません
              </div>
            ) : (
              appNames.map((app) => (
                <div key={app} className="flex items-center mb-3">
                  <div className="w-28 text-xs text-gray-500 truncate pr-2">{app}</div>
                  <div className="flex-1 relative h-8 bg-gray-50 rounded border border-gray-100">
                    {timeline
                      .filter((e) => e.app === app)
                      .map((entry, idx) => {
                        const startMin = timeToMinutes(entry.start);
                        const endMin = entry.end
                          ? timeToMinutes(entry.end)
                          : startMin + Math.floor(entry.duration_seconds / 60);
                        const left = ((startMin - ganttStart) / ganttRange) * 100;
                        const width = ((endMin - startMin) / ganttRange) * 100;
                        if (left < 0 || left > 100) return null;
                        return (
                          <div
                            key={idx}
                            className="absolute top-1 bottom-1 rounded text-xs flex items-center px-1 text-white overflow-hidden"
                            style={{
                              left: `${Math.max(0, left)}%`,
                              width: `${Math.max(0.5, Math.min(width, 100 - left))}%`,
                              backgroundColor: getAppColor(app),
                              opacity: 0.85,
                            }}
                            title={`${entry.start}–${entry.end ?? ''} (${formatDuration(entry.duration_seconds)})`}
                          >
                            <span className="truncate text-[10px]">{entry.domain ?? app}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Detail log table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">詳細ログ</h3>
          <div className="flex items-center space-x-2">
            <button className="flex items-center space-x-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              <Tag className="w-3 h-3" />
              <span>全カテゴリ</span>
            </button>
            <button className="flex items-center space-x-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              <Filter className="w-3 h-3" />
              <span>フィルター</span>
            </button>
          </div>
        </div>
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading...</div>
        ) : timeline.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">この日のデータはありません</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="px-5 py-3 text-xs font-medium text-gray-400">開始時刻</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400">期間</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400">アプリケーション</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400">ドメイン</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400">ステータス</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {timeline.map((entry, i) => {
                const status = getStatusLabel(entry.app, entry.domain);
                return (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-gray-700">{entry.start}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDuration(entry.duration_seconds)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getAppColor(entry.app) }}
                        />
                        <span className="font-medium text-gray-800">{entry.app}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{entry.domain ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getStatusColor(status)}`}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
