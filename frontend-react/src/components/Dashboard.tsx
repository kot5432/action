import { useEffect, useState } from 'react';
import { Clock, ArrowLeftRight, ChevronRight } from 'lucide-react';
import { getDashboard, getCategories, getTransitions } from '../lib/api';
import type { DashboardData, Categories, Transition } from '../types/api';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const CATEGORY_COLORS: Record<string, string> = {
  '開発': '#2563eb',
  '学習': '#16a34a',
  'エンタメ': '#b45309',
  'SNS': '#9ca3af',
  'コミュニケーション': '#7c3aed',
  'その他': '#d1d5db',
};

const FOCUS_DATA = [
  { hour: '09:00', focus: 60 },
  { hour: '10:00', focus: 45 },
  { hour: '11:00', focus: 80 },
  { hour: '12:00', focus: 90 },
  { hour: '13:00', focus: 30 },
  { hour: '14:00', focus: 20 },
  { hour: '15:00', focus: 55 },
  { hour: '16:00', focus: 70 },
  { hour: '17:00', focus: 85 },
  { hour: '18:00', focus: 65 },
  { hour: '19:00', focus: 40 },
  { hour: '20:00', focus: 50 },
  { hour: '21:00', focus: 35 },
];

interface PieSlice {
  name: string;
  value: number;
  pct: number;
  color: string;
}

function DonutChart({ slices }: { slices: PieSlice[] }) {
  const cx = 70;
  const cy = 70;
  const r = 52;
  const inner = 34;
  const total = slices.reduce((s, d) => s + d.value, 0);

  let startAngle = -Math.PI / 2;
  const paths: React.ReactNode[] = [];

  slices.forEach((slice, i) => {
    const pct = total > 0 ? slice.value / total : 1 / slices.length;
    const angle = pct * 2 * Math.PI;
    const endAngle = startAngle + angle;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const xi1 = cx + inner * Math.cos(endAngle);
    const yi1 = cy + inner * Math.sin(endAngle);
    const xi2 = cx + inner * Math.cos(startAngle);
    const yi2 = cy + inner * Math.sin(startAngle);

    const large = angle > Math.PI ? 1 : 0;

    const d = [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
      `L ${xi1} ${yi1}`,
      `A ${inner} ${inner} 0 ${large} 0 ${xi2} ${yi2}`,
      'Z',
    ].join(' ');

    paths.push(<path key={i} d={d} fill={slice.color} />);
    startAngle = endAngle;
  });

  return (
    <svg width={140} height={140} viewBox="0 0 140 140">
      {paths}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize={10} fill="#9ca3af">合計</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize={13} fontWeight="bold" fill="#111827">100%</text>
    </svg>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [categories, setCategories] = useState<Categories>({});
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    async function fetchAll() {
      try {
        const [dash, cats, trans] = await Promise.all([
          getDashboard(),
          getCategories(),
          getTransitions(),
        ]);
        setData(dash);
        setCategories(cats);
        setTransitions(trans);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
    timer = setInterval(fetchAll, 10000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const s = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const categoryEntries = Object.entries(categories);
  const totalCatSec = categoryEntries.reduce((sum, [, v]) => {
    const match = v.match(/(\d+)時間(\d+)分|(\d+)分/);
    if (!match) return sum;
    if (match[1] !== undefined) return sum + parseInt(match[1]) * 3600 + parseInt(match[2]) * 60;
    return sum + parseInt(match[3]) * 60;
  }, 0);

  const pieData: PieSlice[] = categoryEntries.map(([name, time]) => {
    const match = time.match(/(\d+)時間(\d+)分|(\d+)分/);
    let seconds = 0;
    if (match) {
      if (match[1] !== undefined) seconds = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60;
      else seconds = parseInt(match[3]) * 60;
    }
    const pct = totalCatSec > 0 ? Math.round((seconds / totalCatSec) * 100) : 0;
    return { name, value: seconds, pct, color: CATEGORY_COLORS[name] ?? '#d1d5db' };
  });

  if (pieData.length === 0) {
    pieData.push(
      { name: '開発', value: 45, pct: 45, color: '#2563eb' },
      { name: '学習', value: 25, pct: 25, color: '#16a34a' },
      { name: 'エンタメ', value: 15, pct: 15, color: '#b45309' },
      { name: 'その他', value: 15, pct: 15, color: '#d1d5db' },
    );
  }

  const topTransitions = transitions.slice(0, 4);
  const maxCount = topTransitions.length > 0 ? topTransitions[0].count : 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current activity + stats */}
      <div className="grid grid-cols-3 gap-4">
        {/* Current activity */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1">現在のアクティビティ</p>
              <h2 className="text-3xl font-bold text-gray-900 mb-0.5">
                {data?.current_app ?? '-'}
              </h2>
              {data?.current_domain && (
                <p className="text-sm text-gray-400">{data.current_domain}</p>
              )}
              <div className="mt-4">
                <p className="text-xs text-gray-400 mb-1">セッション時間</p>
                <p className="text-3xl font-mono font-semibold text-gray-900">
                  {formatDuration(data?.session_duration_minutes ?? 0)}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-500 text-white rounded-md flex-shrink-0">
              FOCUS MODE
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-400">今日の合計使用時間</p>
              <Clock className="w-4 h-4 text-gray-300" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatTime(data?.today_usage_minutes ?? 0)}
            </p>
            <div className="mt-2 h-1 bg-gray-100 rounded-full">
              <div className="h-1 bg-blue-500 rounded-full w-3/4" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-400">コンテキストスイッチ</p>
              <ArrowLeftRight className="w-4 h-4 text-gray-300" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {data?.switch_count ?? 0}
            </p>
            <p className="text-xs text-gray-400 mt-1">平均集中持続: 48分</p>
          </div>
        </div>
      </div>

      {/* Category + Transitions */}
      <div className="grid grid-cols-2 gap-4">
        {/* Category donut */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">カテゴリー別内訳</h3>
          </div>
          <div className="flex items-center space-x-2">
            <DonutChart slices={pieData} />
            <div className="space-y-2">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center space-x-2 text-sm">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-gray-600 w-20">{entry.name}</span>
                  <span className="font-semibold text-gray-900">{entry.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Frequent transitions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">頻繁な遷移パターン</h3>
            <button className="text-xs text-blue-600 hover:underline flex items-center space-x-0.5">
              <span>詳細を表示</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {topTransitions.length === 0 ? (
            <p className="text-sm text-gray-400">データなし</p>
          ) : (
            <div className="space-y-4">
              {topTransitions.map((t, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-1.5 text-sm text-gray-700">
                      <span className="truncate max-w-[80px]">{t.from}</span>
                      <span className="text-gray-400 flex-shrink-0">→</span>
                      <span className="truncate max-w-[80px]">{t.to}</span>
                      {i === 0 && (
                        <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded flex-shrink-0">高頻度</span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500 flex-shrink-0 ml-2">{t.count} 回</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-1.5 bg-blue-500 rounded-full"
                      style={{ width: `${(t.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Focus trend */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">今日の集中力トレンド</h3>
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              <span>集中</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-200 inline-block" />
              <span>休憩</span>
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={FOCUS_DATA} barSize={14} barGap={2}>
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              formatter={(v: number) => [`${v}%`, '集中度']}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
            <Bar dataKey="focus" radius={[2, 2, 0, 0]}>
              {FOCUS_DATA.map((entry, i) => (
                <Cell key={i} fill={entry.focus >= 60 ? '#3b82f6' : '#bfdbfe'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
