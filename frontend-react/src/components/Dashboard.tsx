import { useEffect, useState } from 'react';
import { Clock, ArrowLeftRight, ChevronRight, TrendingUp } from 'lucide-react';
import { getDashboard, getCategories, getTransitions, getTimeline } from '../lib/api';
import type { DashboardData, Categories, Transition, TimelineEntry } from '../types/api';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const CATEGORY_COLORS: Record<string, string> = {
  '開発':           '#2563eb',
  '学習':           '#16a34a',
  '娯楽':           '#d97706',
  'SNS':            '#f43f5e',
  'コミュニケーション': '#7c3aed',
  'その他':          '#94a3b8',
};

interface PieSlice { name: string; value: number; pct: number; color: string }

function DonutChart({ slices, empty }: { slices: PieSlice[]; empty: boolean }) {
  const cx = 68, cy = 68, r = 52, inner = 35;
  const total = slices.reduce((s, d) => s + d.value, 0);
  let start = -Math.PI / 2;
  const paths: React.ReactNode[] = [];
  slices.forEach((sl, i) => {
    const pct = total > 0 ? sl.value / total : 1 / slices.length;
    const angle = pct * 2 * Math.PI;
    const end = start + angle;
    const x1 = cx + r * Math.cos(start),   y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end),     y2 = cy + r * Math.sin(end);
    const xi1 = cx + inner * Math.cos(end), yi1 = cy + inner * Math.sin(end);
    const xi2 = cx + inner * Math.cos(start), yi2 = cy + inner * Math.sin(start);
    const lg = angle > Math.PI ? 1 : 0;
    const d = `M${x1} ${y1} A${r} ${r} 0 ${lg} 1 ${x2} ${y2} L${xi1} ${yi1} A${inner} ${inner} 0 ${lg} 0 ${xi2} ${yi2}Z`;
    paths.push(<path key={i} d={d} fill={empty ? '#e2e8f0' : sl.color} />);
    start = end;
  });
  return (
    <svg width={136} height={136} viewBox="0 0 136 136" style={{ flexShrink: 0 }}>
      {paths}
      <text x={cx} y={cy - 7} textAnchor="middle" fontSize={10} fill="#94a3b8">合計</text>
      <text x={cx} y={cy + 9} textAnchor="middle" fontSize={14} fontWeight="700" fill={empty ? '#cbd5e1' : '#0f172a'}>
        {empty ? '0%' : '100%'}
      </text>
    </svg>
  );
}

function computeFocusTrend(timeline: TimelineEntry[]) {
  const hours: Record<number, number> = {};
  for (let h = 9; h <= 21; h++) hours[h] = 0;
  timeline.forEach(e => {
    const h = parseInt(e.start.split(':')[0]);
    if (h >= 9 && h <= 21) hours[h] = (hours[h] || 0) + e.duration_seconds;
  });
  return Object.entries(hours).map(([h, sec]) => ({
    hour: `${h.padStart(2, '0')}:00`,
    focus: Math.min(100, Math.round(sec / 36)),
  }));
}

const CARD = { backgroundColor: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' };

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [categories, setCategories] = useState<Categories>({});
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [focusTrend, setFocusTrend] = useState<{ hour: string; focus: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    async function fetchAll() {
      try {
        const [dash, cats, trans, tl] = await Promise.all([
          getDashboard(), getCategories(), getTransitions(), getTimeline(today),
        ]);
        setData(dash);
        setCategories(cats);
        setTransitions(trans);
        setFocusTrend(computeFocusTrend(tl));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    fetchAll();
    timer = setInterval(fetchAll, 10000);
    return () => clearInterval(timer);
  }, [today]);

  const fmt = (min: number) => { const h = Math.floor(min / 60), m = min % 60; return h > 0 ? `${h}h ${m}m` : `${m}m`; };
  const fmtDur = (min: number) => `${String(Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}:00`;

  const catEntries = Object.entries(categories);
  const totalCatSec = catEntries.reduce((sum, [, v]) => {
    const m = v.match(/(\d+)時間(\d+)分|(\d+)分/);
    if (!m) return sum;
    return m[1] ? sum + parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 : sum + parseInt(m[3]) * 60;
  }, 0);

  const pieData: PieSlice[] = catEntries.map(([name, time]) => {
    const m = time.match(/(\d+)時間(\d+)分|(\d+)分/);
    let sec = 0;
    if (m) sec = m[1] ? parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 : parseInt(m[3]) * 60;
    return { name, value: sec, pct: totalCatSec > 0 ? Math.round((sec / totalCatSec) * 100) : 0, color: CATEGORY_COLORS[name] ?? '#94a3b8' };
  });

  const noCatData = pieData.length === 0;
  const displayPie: PieSlice[] = noCatData
    ? [{ name: '開発', value: 1, pct: 0, color: '#e2e8f0' }, { name: '学習', value: 1, pct: 0, color: '#e2e8f0' }, { name: 'その他', value: 1, pct: 0, color: '#e2e8f0' }]
    : pieData;

  const topTrans = transitions.slice(0, 4);
  const maxCount = topTrans.length > 0 ? topTrans[0].count : 1;
  const hasActivity = focusTrend.some(d => d.focus > 0);

  // 現在のサービス表示名（service → app の順でフォールバック）
  const displayService = data?.current_service ?? data?.current_app ?? '—';
  const displayCategory = data?.current_category;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-slate-400 text-sm">Loading...</div></div>;

  return (
    <div className="space-y-4">
      {/* Row 1: Current activity + stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 p-6" style={CARD}>
          <div className="flex items-start justify-between mb-4">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">現在のアクティビティ</p>
            <span className="px-2.5 py-1 text-[11px] font-bold bg-emerald-500 text-white rounded-lg tracking-wide flex-shrink-0">
              FOCUS MODE
            </span>
          </div>
          <h2 className="text-4xl font-bold text-slate-900 mb-1 tracking-tight">{displayService}</h2>
          {displayCategory && (
            <span className="inline-block px-2 py-0.5 text-[11px] font-semibold rounded-md mb-4"
              style={{ backgroundColor: `${CATEGORY_COLORS[displayCategory]}18`, color: CATEGORY_COLORS[displayCategory] ?? '#64748b' }}>
              {displayCategory}
            </span>
          )}
          {!displayCategory && <div className="mb-4" />}
          <div>
            <p className="text-[11px] font-medium text-slate-400 mb-1.5">セッション時間</p>
            <p className="text-3xl font-mono font-semibold text-slate-800 tabular-nums">{fmtDur(data?.session_duration_minutes ?? 0)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="p-5 flex-1" style={CARD}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-medium text-slate-400">今日の合計使用時間</p>
              <Clock className="w-4 h-4 text-slate-300" />
            </div>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">{fmt(data?.today_usage_minutes ?? 0)}</p>
            <div className="mt-3 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-1 bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min((data?.today_usage_minutes ?? 0) / 480 * 100, 100)}%` }} />
            </div>
          </div>
          <div className="p-5 flex-1" style={CARD}>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-medium text-slate-400">サービス切替回数</p>
              <ArrowLeftRight className="w-4 h-4 text-slate-300" />
            </div>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">{data?.switch_count ?? 0}</p>
            <p className="text-[12px] text-slate-400 mt-1.5">平均集中持続: 48分</p>
          </div>
        </div>
      </div>

      {/* Row 2: Category + Transitions */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-5" style={CARD}>
          <p className="text-[13px] font-semibold text-slate-800 mb-4">カテゴリー別内訳</p>
          <div className="flex items-center space-x-4">
            <DonutChart slices={displayPie} empty={noCatData} />
            <div className="space-y-2.5 flex-1">
              {noCatData ? (
                <div className="text-[12px] text-slate-400 leading-relaxed">
                  <p className="font-medium text-slate-500 mb-1">データなし</p>
                  <p>Windowsトラッカーを起動すると<br />カテゴリが表示されます</p>
                </div>
              ) : (
                displayPie.map(e => (
                  <div key={e.name} className="flex items-center space-x-2 text-[13px]">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                    <span className="text-slate-500 flex-1">{e.name}</span>
                    <span className="font-semibold text-slate-800 tabular-nums">{e.pct}%</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-5" style={CARD}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-semibold text-slate-800">サービス遷移パターン</p>
            <button className="text-[12px] text-blue-500 hover:text-blue-600 flex items-center space-x-0.5">
              <span>詳細を表示</span><ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {topTrans.length === 0 ? (
            <div className="py-6 text-center">
              <TrendingUp className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-[12px] text-slate-400">遷移データがありません</p>
              <p className="text-[11px] text-slate-300 mt-1">例: GitHub → YouTube → VS Code</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topTrans.map((t, i) => {
                const fromColor = CATEGORY_COLORS[t.from_category ?? ''] ?? '#94a3b8';
                const toColor   = CATEGORY_COLORS[t.to_category ?? '']   ?? '#94a3b8';
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-1.5 text-[13px] text-slate-700 min-w-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: fromColor }} />
                        <span className="truncate max-w-[80px] font-medium">{t.from}</span>
                        <span className="text-slate-300 flex-shrink-0">→</span>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: toColor }} />
                        <span className="truncate max-w-[80px] font-medium">{t.to}</span>
                        {i === 0 && <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-600 rounded font-semibold flex-shrink-0">高頻度</span>}
                      </div>
                      <span className="text-[12px] text-slate-400 flex-shrink-0 ml-2 tabular-nums">{t.count}回</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${(t.count / maxCount) * 100}%`, backgroundColor: fromColor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Focus trend */}
      <div className="p-5" style={CARD}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] font-semibold text-slate-800">今日の集中力トレンド</p>
          <div className="flex items-center space-x-4 text-[11px] text-slate-400">
            <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /><span>集中</span></span>
            <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-200 inline-block" /><span>低活動</span></span>
          </div>
        </div>
        {!hasActivity ? (
          <div className="h-28 flex flex-col items-center justify-center">
            <p className="text-[12px] text-slate-400">本日のアクティビティがまだありません</p>
            <p className="text-[11px] text-slate-300 mt-1">タイムラインAPIから計算されます</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={focusTrend} barSize={13} barGap={2} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip formatter={(v: number) => [`${v}%`, '集中度']} contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
              <Bar dataKey="focus" radius={[3, 3, 0, 0]}>
                {focusTrend.map((e, i) => <Cell key={i} fill={e.focus >= 60 ? '#3b82f6' : e.focus >= 30 ? '#93c5fd' : '#dbeafe'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
