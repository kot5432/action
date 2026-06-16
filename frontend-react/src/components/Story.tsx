import { useEffect, useState } from 'react';
import { Calendar, Code2, Search, RotateCcw, AlertTriangle, Circle } from 'lucide-react';
import { getStory } from '../lib/api';
import type { StoryResponse } from '../types/api';
import { BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

const FOCUS_HOURS = [
  { h: '09', v: 55 }, { h: '10', v: 40 }, { h: '11', v: 75 }, { h: '12', v: 90 },
  { h: '13', v: 25 }, { h: '14', v: 20 }, { h: '15', v: 60 }, { h: '16', v: 80 },
];

type StoryType = 'DEEP WORK' | 'TRANSITION' | 'ESCAPE DETECTED' | 'RECOVERY' | 'WORK';

function classifyEntry(text: string): StoryType {
  const t = text.toLowerCase();
  if (t.includes('youtube') || t.includes('twitter') || t.includes('x.com') || t.includes('tiktok') || t.includes('instagram') || t.includes('脱線')) return 'ESCAPE DETECTED';
  if (t.includes('復帰') || t.includes('戻')) return 'RECOVERY';
  if (t.includes('調査') || t.includes('github') || t.includes('エラー') || t.includes('検索')) return 'TRANSITION';
  if (t.includes('開発') || t.includes('vscode') || (t.includes('作業') && !t.includes('移動'))) return 'DEEP WORK';
  return 'WORK';
}

interface TypeStyle {
  badge: string;
  iconBg: string;
  cardBg: string;
  cardBorder: string;
  icon: React.ReactNode;
}

function getTypeStyle(type: StoryType): TypeStyle {
  switch (type) {
    case 'DEEP WORK':
      return {
        badge: 'bg-blue-100 text-blue-700',
        iconBg: 'bg-blue-600',
        cardBg: 'bg-white',
        cardBorder: 'border-gray-200',
        icon: <Code2 className="w-4 h-4 text-white" />,
      };
    case 'TRANSITION':
      return {
        badge: 'bg-gray-100 text-gray-600',
        iconBg: 'bg-gray-300',
        cardBg: 'bg-white',
        cardBorder: 'border-gray-200',
        icon: <Search className="w-4 h-4 text-gray-600" />,
      };
    case 'ESCAPE DETECTED':
      return {
        badge: 'bg-red-100 text-red-600',
        iconBg: 'bg-red-100',
        cardBg: 'bg-red-50',
        cardBorder: 'border-red-200',
        icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
      };
    case 'RECOVERY':
      return {
        badge: 'bg-emerald-100 text-emerald-700',
        iconBg: 'bg-emerald-500',
        cardBg: 'bg-white',
        cardBorder: 'border-gray-200',
        icon: <RotateCcw className="w-4 h-4 text-white" />,
      };
    default:
      return {
        badge: 'bg-gray-100 text-gray-600',
        iconBg: 'bg-gray-400',
        cardBg: 'bg-white',
        cardBorder: 'border-gray-200',
        icon: <Circle className="w-4 h-4 text-white" />,
      };
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${days[d.getDay()]} — 静かな観察と分析`;
}

export default function Story() {
  const [storyData, setStoryData] = useState<StoryResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getStory(selectedDate)
      .then(setStoryData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedDate]);

  const story = storyData?.story ?? [];
  const driftMinutes = storyData?.total_drift_minutes ?? 0;
  const focusMinutes = story.length > 0 ? story.length * 8 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Today's Story</h1>
          <p className="text-sm text-gray-400 mt-1">{formatDate(selectedDate)}</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
            <div>
              <p className="text-xs text-blue-500 font-medium">FOCUS TIME</p>
              <p className="text-lg font-bold text-blue-600">
                {focusMinutes > 0 ? `${Math.floor(focusMinutes / 60)}h ${focusMinutes % 60}m` : '—'}
              </p>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div>
              <p className="text-xs text-gray-400">推定離脱時間</p>
              <p className="text-lg font-bold text-red-500">{driftMinutes > 0 ? `${driftMinutes}分` : '—'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm text-gray-700 focus:outline-none bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* Focus flow + Daily Insight */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600">Focus Flow</h3>
            <span className="text-xs text-gray-400">Real-time Analysis</span>
          </div>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={FOCUS_HOURS} barSize={18} barGap={2}>
              <XAxis dataKey="h" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(v: number) => [`${v}%`, '集中度']}
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="v" radius={[3, 3, 0, 0]}>
                {FOCUS_HOURS.map((entry, i) => (
                  <Cell key={i} fill={entry.v < 30 ? '#fca5a5' : entry.v >= 60 ? '#3b82f6' : '#93c5fd'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-amber-700 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-200 mb-2">Daily Insight</p>
            <p className="text-sm text-white leading-relaxed">
              {story.length > 0
                ? `${story.length}件の行動を記録。集中時間の最適化で生産性向上が期待できます。`
                : '午前のGitHubでの調査が、午後の実装スピードを30%向上させています。'}
            </p>
          </div>
          <button className="mt-4 text-xs font-semibold text-amber-200 flex items-center space-x-1 hover:text-white transition-colors">
            <span>DETAILS →</span>
          </button>
        </div>
      </div>

      {/* Story timeline */}
      {story.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">この日のデータはありません</div>
      ) : (
        <div className="space-y-3">
          {story.map((entry, i) => {
            const type = classifyEntry(entry.text);
            const styles = getTypeStyle(type);
            const isEscape = type === 'ESCAPE DETECTED';
            return (
              <div key={i} className="flex space-x-4">
                {/* Icon column */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${styles.iconBg}`}>
                    {styles.icon}
                  </div>
                  {i < story.length - 1 && (
                    <div className="w-px flex-1 mt-1 bg-gray-200 min-h-[20px]" />
                  )}
                </div>
                {/* Card */}
                <div className={`flex-1 mb-2 rounded-xl border p-4 ${styles.cardBg} ${styles.cardBorder}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-mono text-gray-500">{entry.time}</span>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded ${styles.badge}`}>{type}</span>
                    </div>
                    {isEscape && driftMinutes > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-gray-400">経過時間</p>
                        <p className="text-lg font-bold text-red-500">{driftMinutes}m</p>
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{entry.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Real-time footer */}
      <div className="flex justify-center pt-2">
        <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-xs text-blue-600 font-medium">リアルタイム追跡中...</span>
        </div>
      </div>
    </div>
  );
}
