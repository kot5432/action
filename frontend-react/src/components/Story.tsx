import { useEffect, useState } from 'react';
import { Calendar, Code2, Search, RotateCcw, AlertTriangle, BookOpen, MessageSquare, Play } from 'lucide-react';
import { getStory, getTimeline } from '../lib/api';
import type { StoryResponse, TimelineEntry } from '../types/api';
import { BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

type StoryCategory = '開発' | '学習' | '娯楽' | 'SNS' | 'コミュニケーション' | 'その他';

const CAT_CFG: Record<StoryCategory, {
  badge: string; iconBg: string; cardBg: string; border: string; icon: React.ReactNode;
}> = {
  '開発':           { badge: 'bg-blue-50 text-blue-600 border border-blue-200',     iconBg: '#2563eb', cardBg: '#fff',     border: '1px solid #e2e8f0',  icon: <Code2 className="w-4 h-4 text-white" /> },
  '学習':           { badge: 'bg-emerald-50 text-emerald-600 border border-emerald-200', iconBg: '#16a34a', cardBg: '#fff', border: '1px solid #e2e8f0',  icon: <Search className="w-4 h-4 text-white" /> },
  '娯楽':           { badge: 'bg-red-50 text-red-500 border border-red-200',         iconBg: '#fee2e2', cardBg: '#fff7f7', border: '1px solid #fecaca', icon: <AlertTriangle className="w-4 h-4 text-red-500" /> },
  'SNS':            { badge: 'bg-pink-50 text-pink-500 border border-pink-200',      iconBg: '#fee2e2', cardBg: '#fff7f7', border: '1px solid #fecaca', icon: <AlertTriangle className="w-4 h-4 text-pink-500" /> },
  'コミュニケーション': { badge: 'bg-violet-50 text-violet-600 border border-violet-200', iconBg: '#7c3aed', cardBg: '#fff',border: '1px solid #e2e8f0',  icon: <MessageSquare className="w-4 h-4 text-white" /> },
  'その他':          { badge: 'bg-slate-50 text-slate-500 border border-slate-200',  iconBg: '#94a3b8', cardBg: '#fff',   border: '1px solid #e2e8f0',  icon: <Play className="w-4 h-4 text-white" /> },
};
const RECOVERY_CFG = { badge: 'bg-emerald-50 text-emerald-600 border border-emerald-200', iconBg: '#10b981', cardBg: '#fff', border: '1px solid #e2e8f0', icon: <RotateCcw className="w-4 h-4 text-white" /> };

function buildFocusFlow(tl: TimelineEntry[]) {
  const hours: Record<number, number> = {};
  for (let h = 9; h <= 16; h++) hours[h] = 0;
  tl.forEach(e => { const h = parseInt(e.start.split(':')[0]); if (h >= 9 && h <= 16) hours[h] = (hours[h]||0) + e.duration_seconds; });
  return Object.entries(hours).map(([h, sec]) => ({ h: h.padStart(2,'0'), v: Math.min(100, Math.round(sec/36)) }));
}

const fmtDate = (d: string) => {
  const dt = new Date(d);
  const days = ['日曜日','月曜日','火曜日','水曜日','木曜日','金曜日','土曜日'];
  return `${dt.getFullYear()}年${dt.getMonth()+1}月${dt.getDate()}日 ${days[dt.getDay()]}`;
};
const CARD = { backgroundColor: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' };

export default function Story() {
  const [storyData, setStoryData] = useState<StoryResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getStory(date), getTimeline(date)])
      .then(([s, tl]) => { setStoryData(s); setTimeline(tl); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date]);

  const story = storyData?.story ?? [];
  const driftMin = storyData?.total_drift_minutes ?? 0;
  const focusFlow = buildFocusFlow(timeline);
  const hasFlow = focusFlow.some(d => d.v > 0);
  const totalSec = timeline.reduce((s, e) => s + e.duration_seconds, 0);
  const focusSec = timeline.filter(e => e.category === '開発' || e.category === '学習').reduce((s,e)=>s+e.duration_seconds,0);
  const focusMin = Math.floor(focusSec / 60);

  // 前のエントリが脱線で今のエントリが開発/学習 → RECOVERY
  const isRecovery = (i: number) => {
    if (i === 0) return false;
    const prev = story[i - 1].category;
    return (prev === '娯楽' || prev === 'SNS') && (story[i].category === '開発' || story[i].category === '学習');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-slate-400 text-sm">Loading...</div></div>;

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Today's Story</h1>
          <p className="text-[13px] text-slate-400 mt-1">{fmtDate(date)} — 静かな観察と分析</p>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <div className="flex items-center space-x-4 px-5 py-3 rounded-2xl" style={CARD}>
            <div>
              <p className="text-[10px] font-bold text-blue-500 tracking-wider">FOCUS TIME</p>
              <p className="text-xl font-bold text-blue-600 tabular-nums">
                {focusMin > 0 ? `${Math.floor(focusMin/60)}h ${focusMin%60}m` : '—'}
              </p>
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <div>
              <p className="text-[10px] text-slate-400">推定離脱時間</p>
              <p className={`text-xl font-bold tabular-nums ${driftMin > 0 ? 'text-red-500' : 'text-slate-300'}`}>
                {driftMin > 0 ? `${driftMin}分` : '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 px-3 py-2 rounded-xl" style={CARD}>
            <Calendar className="w-4 h-4 text-slate-400" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="text-[13px] text-slate-700 focus:outline-none bg-transparent" />
          </div>
        </div>
      </div>

      {/* Focus Flow + Daily Insight */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 p-5" style={CARD}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-medium text-slate-600">Focus Flow</p>
            <span className="text-[11px] text-slate-400">タイムラインから計算</span>
          </div>
          {!hasFlow ? (
            <div className="h-28 flex items-center justify-center text-[12px] text-slate-400">本日のデータがありません</div>
          ) : (
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={focusFlow} barSize={18} barGap={2} margin={{top:0,right:0,bottom:0,left:0}}>
                <XAxis dataKey="h" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(v:number)=>[`${v}%`,'集中度']} contentStyle={{fontSize:11,borderRadius:10,border:'1px solid #e2e8f0',boxShadow:'0 4px 12px rgba(0,0,0,0.08)'}} />
                <Bar dataKey="v" radius={[3,3,0,0]}>
                  {focusFlow.map((e,i)=><Cell key={i} fill={e.v<20?'#fca5a5':e.v>=60?'#3b82f6':'#93c5fd'}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="p-5 flex flex-col justify-between" style={{ backgroundColor: '#1e293b', borderRadius: 16 }}>
          <div>
            <p className="text-[10px] font-bold text-blue-400 tracking-wider mb-2">Daily Insight</p>
            <p className="text-[13px] text-slate-300 leading-relaxed">
              {story.length > 0
                ? `${story.length}件の行動を記録。集中の流れを分析しました。`
                : 'トラッカーが起動すると、今日の行動ストーリーがここに表示されます。'}
            </p>
            {driftMin > 0 && (
              <div className="mt-3 px-3 py-2 rounded-lg" style={{ backgroundColor: '#7f1d1d33' }}>
                <p className="text-[11px] text-red-400">⚠ 推定離脱 {driftMin}分</p>
              </div>
            )}
          </div>
          {totalSec > 0 && (
            <div className="mt-4">
              <p className="text-[10px] text-slate-500 mb-1">集中率</p>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${totalSec > 0 ? Math.round(focusSec/totalSec*100) : 0}%` }} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{totalSec > 0 ? Math.round(focusSec/totalSec*100) : 0}% 集中</p>
            </div>
          )}
        </div>
      </div>

      {/* Story entries */}
      {story.length === 0 ? (
        <div className="py-16 text-center" style={CARD}>
          <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-[13px] text-slate-400 font-medium">この日のストーリーデータがありません</p>
          <p className="text-[12px] text-slate-300 mt-1">Windowsトラッカーを起動するとストーリーが生成されます</p>
          <div className="mt-4 text-[11px] text-slate-400 space-y-1">
            <p>例: <span className="text-blue-400 font-mono">14:02 VS Codeで開発作業（16分）</span></p>
            <p>例: <span className="text-amber-400 font-mono">14:18 GitHubで調査・学習（6分）</span></p>
            <p>例: <span className="text-red-400 font-mono">14:24 YouTubeで動画閲覧（19分）</span></p>
            <p>例: <span className="text-blue-400 font-mono">14:43 VS Codeで開発作業（復帰）</span></p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {story.map((entry, i) => {
            const cat = (entry.category ?? 'その他') as StoryCategory;
            const recovery = isRecovery(i);
            const cfg = recovery ? RECOVERY_CFG : (CAT_CFG[cat] ?? CAT_CFG['その他']);
            const isDistraction = cat === '娯楽' || cat === 'SNS';

            return (
              <div key={i} className="flex space-x-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: cfg.iconBg }}>
                    {cfg.icon}
                  </div>
                  {i < story.length - 1 && <div className="w-px flex-1 mt-1 min-h-[20px]" style={{ backgroundColor: '#e2e8f0' }} />}
                </div>
                <div className="flex-1 mb-2 p-4 rounded-2xl" style={{ backgroundColor: cfg.cardBg, border: cfg.border }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-[12px] font-mono text-slate-400">{entry.time}</span>
                      {entry.service && (
                        <span className="text-[12px] font-semibold text-slate-700">{entry.service}</span>
                      )}
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md tracking-wide ${cfg.badge}`}>
                        {recovery ? 'RECOVERY' : cat}
                      </span>
                    </div>
                    {isDistraction && driftMin > 0 && (
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-[10px] text-slate-400">離脱時間</p>
                        <p className="text-base font-bold text-red-500 tabular-nums">{driftMin}分</p>
                      </div>
                    )}
                  </div>
                  <p className="text-[13px] text-slate-700">{entry.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-center pt-2">
        <div className="flex items-center space-x-2 px-4 py-2 rounded-full" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-[12px] text-blue-600 font-medium">リアルタイム追跡中...</span>
        </div>
      </div>
    </div>
  );
}
