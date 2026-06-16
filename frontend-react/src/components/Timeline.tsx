import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Filter, Tag, Activity } from 'lucide-react';
import { getTimeline } from '../lib/api';
import type { TimelineEntry } from '../types/api';

const CATEGORY_COLORS: Record<string, string> = {
  '開発':           '#2563eb',
  '学習':           '#16a34a',
  '娯楽':           '#d97706',
  'SNS':            '#f43f5e',
  'コミュニケーション': '#7c3aed',
  'その他':          '#94a3b8',
};

const STATUS_STYLE: Record<string, string> = {
  '開発':           'bg-blue-50 text-blue-700 border border-blue-200',
  '学習':           'bg-emerald-50 text-emerald-700 border border-emerald-200',
  '娯楽':           'bg-amber-50 text-amber-700 border border-amber-200',
  'SNS':            'bg-red-50 text-red-600 border border-red-200',
  'コミュニケーション': 'bg-violet-50 text-violet-700 border border-violet-200',
  'その他':          'bg-slate-50 text-slate-500 border border-slate-200',
};

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fmtDur = (sec: number) => {
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m >= 60) { const h = Math.floor(m / 60); return `${h}h ${m % 60}m`; }
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};
const fmtDate = (d: string) => {
  const dt = new Date(d);
  const days = ['日','月','火','水','木','金','土'];
  return `${dt.getFullYear()}年${dt.getMonth()+1}月${dt.getDate()}日（${days[dt.getDay()]}）`;
};

const CARD = { backgroundColor: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' };
const GANTT_START = 9*60, GANTT_END = 22*60, GANTT_RANGE = GANTT_END - GANTT_START;

export default function Timeline() {
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getTimeline(date).then(setTimeline).catch(console.error).finally(() => setLoading(false));
  }, [date]);

  const changeDate = (d: number) => { const dt = new Date(date); dt.setDate(dt.getDate() + d); setDate(dt.toISOString().split('T')[0]); };

  const totalSec = timeline.reduce((s, e) => s + e.duration_seconds, 0);
  const totalStr = `${String(Math.floor(totalSec/3600)).padStart(2,'0')}:${String(Math.floor((totalSec%3600)/60)).padStart(2,'0')}:${String(totalSec%60).padStart(2,'0')}`;
  const focusSec = timeline.filter(e => e.category === '開発' || e.category === '学習').reduce((s,e) => s + e.duration_seconds, 0);
  const focusPct = totalSec > 0 ? Math.round(focusSec / totalSec * 100) : 0;

  // ガント表示: service 単位でグループ化
  const serviceNames = [...new Set(timeline.map(e => e.service ?? e.app))];
  const hours = Array.from({length:14},(_,i)=>i+9);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">タイムライン分析</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">サービス別・カテゴリ別の活動ログ</p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => changeDate(-1)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white transition-colors" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center space-x-2 px-4 py-2 bg-white rounded-xl" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-[13px] text-slate-700 font-medium">{fmtDate(date)}</span>
          </div>
          <button onClick={() => changeDate(1)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white transition-colors" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '総稼働時間', value: totalStr, bar: Math.min(totalSec/(8*3600)*100,100), color: '#3b82f6' },
          { label: '集中率（開発+学習）', value: `${focusPct}%`, bar: focusPct, color: '#10b981' },
        ].map(({ label, value, bar, color }) => (
          <div key={label} className="p-5" style={CARD}>
            <p className="text-[11px] font-medium text-slate-400 mb-2">{label}</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
            <div className="mt-2.5 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-1 rounded-full transition-all" style={{ width: `${bar}%`, backgroundColor: color }} />
            </div>
          </div>
        ))}
        <div className="p-5" style={CARD}>
          <p className="text-[11px] font-medium text-slate-400 mb-2">主要サービス</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {serviceNames.slice(0,4).map(s => (
              <span key={s} className="text-[11px] px-2 py-1 rounded-lg text-white font-medium"
                style={{ backgroundColor: CATEGORY_COLORS[timeline.find(e=>(e.service??e.app)===s)?.category??''] ?? '#94a3b8' }}>
                {s}
              </span>
            ))}
            {serviceNames.length === 0 && <span className="text-[12px] text-slate-400">データなし</span>}
          </div>
        </div>
      </div>

      {/* Gantt */}
      <div className="p-5" style={CARD}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] font-semibold text-slate-800">アクティビティ分布</p>
          <div className="flex items-center space-x-3 text-[11px] text-slate-400">
            {Object.entries(CATEGORY_COLORS).slice(0,4).map(([cat,c])=>(
              <span key={cat} className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-sm inline-block" style={{backgroundColor:c}}/><span>{cat}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <div style={{ minWidth: 600 }}>
            <div className="flex mb-2.5 ml-28">
              {hours.map(h => <div key={h} className="flex-1 text-[10px] text-slate-400 text-center">{String(h).padStart(2,'0')}:00</div>)}
            </div>
            {timeline.length === 0 ? (
              <div className="h-28 flex flex-col items-center justify-center text-slate-400">
                <Activity className="w-7 h-7 text-slate-200 mb-2" />
                <p className="text-[12px]">この日のデータはありません</p>
              </div>
            ) : serviceNames.map(svcName => (
              <div key={svcName} className="flex items-center mb-2.5">
                <div className="w-28 text-[11px] text-slate-500 truncate pr-2 text-right font-medium">{svcName}</div>
                <div className="flex-1 relative h-8 rounded-lg overflow-hidden" style={{ backgroundColor: '#f8fafc' }}>
                  {timeline.filter(e=>(e.service??e.app)===svcName).map((entry,idx)=>{
                    const sm = toMin(entry.start);
                    const em = entry.end ? toMin(entry.end) : sm + Math.floor(entry.duration_seconds/60);
                    const left = (sm-GANTT_START)/GANTT_RANGE*100;
                    const width = (em-sm)/GANTT_RANGE*100;
                    const catColor = CATEGORY_COLORS[entry.category ?? ''] ?? '#94a3b8';
                    if (left < 0 || left > 100) return null;
                    return (
                      <div key={idx} className="absolute top-1 bottom-1 rounded-md flex items-center px-1.5 overflow-hidden"
                        style={{ left:`${Math.max(0,left)}%`, width:`${Math.max(0.5,Math.min(width,100-left))}%`, backgroundColor: catColor, opacity: 0.85 }}
                        title={`${entry.start}–${entry.end ?? ''} ${svcName} (${fmtDur(entry.duration_seconds)})`}>
                        <span className="text-[10px] text-white truncate">{entry.category}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail table */}
      <div style={{ ...CARD, overflow: 'hidden' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <p className="text-[13px] font-semibold text-slate-800">詳細ログ</p>
          <div className="flex items-center space-x-2">
            {[<><Tag className="w-3 h-3" /><span>全カテゴリ</span></>, <><Filter className="w-3 h-3" /><span>フィルター</span></>].map((c, i) => (
              <button key={i} className="flex items-center space-x-1.5 px-3 py-1.5 text-[12px] rounded-lg text-slate-500 hover:bg-slate-50 transition-colors" style={{ border: '1px solid #e2e8f0' }}>{c}</button>
            ))}
          </div>
        </div>
        {loading ? <div className="py-12 text-center text-[12px] text-slate-400">Loading...</div>
          : timeline.length === 0 ? <div className="py-12 text-center text-[12px] text-slate-400">この日のデータはありません</div>
          : <table className="w-full text-[13px]">
            <thead><tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              {['開始時刻','期間','サービス','カテゴリ','ステータス'].map(h=>(
                <th key={h} className="px-6 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {timeline.map((e, i) => {
                const cat = e.category ?? 'その他';
                const svc = e.service ?? e.app;
                return (
                  <tr key={i} style={{ borderBottom: i < timeline.length-1 ? '1px solid #f8fafc' : 'none' }} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 font-mono text-slate-600 text-[12px]">{e.start}</td>
                    <td className="px-6 py-3 text-slate-500">{fmtDur(e.duration_seconds)}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] ?? '#94a3b8' }} />
                        <span className="font-semibold text-slate-800">{svc}</span>
                        {e.service && e.app !== e.service && <span className="text-[11px] text-slate-400">{e.app}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-[12px] text-slate-500">{cat}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 text-[11px] rounded-md font-medium ${STATUS_STYLE[cat] ?? STATUS_STYLE['その他']}`}>{cat}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>}
      </div>
    </div>
  );
}
