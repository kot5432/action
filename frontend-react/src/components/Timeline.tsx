import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Filter, Tag, Activity } from 'lucide-react';
import { getTimeline } from '../lib/api';
import type { TimelineEntry } from '../types/api';

const APP_COLORS: Record<string, string> = {
  vscode: '#2563eb', code: '#2563eb', chrome: '#16a34a',
  slack: '#7c3aed', notion: '#f59e0b', github: '#374151',
  youtube: '#dc2626', default: '#64748b',
};
const getColor = (app: string) => { const l = app.toLowerCase(); for (const [k, c] of Object.entries(APP_COLORS)) if (l.includes(k)) return c; return APP_COLORS.default; };
const getStatus = (app: string, domain: string | null) => { const l = (domain ?? app).toLowerCase(); if (l.includes('github') || l.includes('code') || l.includes('vscode')) return 'Focus'; if (l.includes('youtube') || l.includes('twitter') || l.includes('x.com')) return 'Escape'; if (l.includes('slack') || l.includes('gmail') || l.includes('mail')) return 'Active'; return 'Research'; };
const statusStyle: Record<string, string> = { Focus: 'bg-emerald-50 text-emerald-700 border border-emerald-200', Escape: 'bg-red-50 text-red-600 border border-red-200', Active: 'bg-blue-50 text-blue-700 border border-blue-200', Research: 'bg-amber-50 text-amber-700 border border-amber-200' };
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fmtDur = (sec: number) => { const m = Math.floor(sec / 60), s = sec % 60; if (m >= 60) { const h = Math.floor(m / 60); return `${h}h ${m % 60}m`; } return `${m}m ${s}s`; };
const fmtDate = (d: string) => { const dt = new Date(d); const days = ['日','月','火','水','木','金','土']; return `${dt.getFullYear()}年${dt.getMonth()+1}月${dt.getDate()}日（${days[dt.getDay()]}）`; };

const CARD = { backgroundColor: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' };

export default function Timeline() {
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setLoading(true); getTimeline(date).then(setTimeline).catch(console.error).finally(() => setLoading(false)); }, [date]);

  const changeDate = (d: number) => { const dt = new Date(date); dt.setDate(dt.getDate() + d); setDate(dt.toISOString().split('T')[0]); };
  const totalSec = timeline.reduce((s, e) => s + e.duration_seconds, 0);
  const totalStr = `${String(Math.floor(totalSec/3600)).padStart(2,'0')}:${String(Math.floor((totalSec%3600)/60)).padStart(2,'0')}:${String(totalSec%60).padStart(2,'0')}`;
  const focusSec = timeline.filter(e => getStatus(e.app,e.domain)==='Focus').reduce((s,e)=>s+e.duration_seconds,0);
  const focusPct = totalSec > 0 ? Math.round(focusSec/totalSec*100) : 0;
  const appNames = [...new Set(timeline.map(e => e.app))];
  const GANTT_START = 9*60, GANTT_END = 22*60, GANTT_RANGE = GANTT_END - GANTT_START;
  const hours = Array.from({length:14},(_,i)=>i+9);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">タイムライン分析</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">今日のアプリケーション使用状況の詳細ログ</p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => changeDate(-1)} className="p-2 rounded-xl hover:bg-white text-slate-400 hover:text-slate-600 transition-colors" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center space-x-2 px-4 py-2 bg-white rounded-xl" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-[13px] text-slate-700 font-medium">{fmtDate(date)}</span>
          </div>
          <button onClick={() => changeDate(1)} className="p-2 rounded-xl hover:bg-white text-slate-400 hover:text-slate-600 transition-colors" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '総稼働時間', value: totalStr, bar: Math.min(totalSec/(8*3600)*100,100), color: '#3b82f6' },
          { label: 'フォーカス率', value: `${focusPct}%`, bar: focusPct, color: '#10b981' },
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
          <p className="text-[11px] font-medium text-slate-400 mb-2">主要カテゴリ</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {appNames.slice(0,3).map(a => (
              <span key={a} className="text-[11px] px-2 py-1 rounded-lg text-white font-medium" style={{ backgroundColor: getColor(a) }}>{a}</span>
            ))}
            {appNames.length === 0 && <span className="text-[12px] text-slate-400">データなし</span>}
          </div>
        </div>
      </div>

      {/* Gantt */}
      <div className="p-5" style={CARD}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] font-semibold text-slate-800">アクティビティ分布</p>
          <div className="flex items-center space-x-3 text-[11px] text-slate-400">
            {[['#3b82f6','仕事'],['#10b981','学習'],['#f87171','休憩']].map(([c,l])=>(
              <span key={l} className="flex items-center space-x-1"><span className="w-2 h-2 rounded-sm inline-block" style={{backgroundColor:c}}/><span>{l}</span></span>
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
            ) : appNames.map(app => (
              <div key={app} className="flex items-center mb-2.5">
                <div className="w-28 text-[11px] text-slate-500 truncate pr-2 text-right">{app}</div>
                <div className="flex-1 relative h-8 rounded-lg overflow-hidden" style={{ backgroundColor: '#f8fafc' }}>
                  {timeline.filter(e=>e.app===app).map((entry,idx)=>{
                    const sm = toMin(entry.start), em = entry.end ? toMin(entry.end) : sm + Math.floor(entry.duration_seconds/60);
                    const left = (sm-GANTT_START)/GANTT_RANGE*100, width = (em-sm)/GANTT_RANGE*100;
                    if (left < 0 || left > 100) return null;
                    return (
                      <div key={idx} className="absolute top-1 bottom-1 rounded-md flex items-center px-1.5 overflow-hidden" style={{ left:`${Math.max(0,left)}%`, width:`${Math.max(0.5,Math.min(width,100-left))}%`, backgroundColor: getColor(app), opacity: 0.85 }} title={`${entry.start}–${entry.end ?? ''} (${fmtDur(entry.duration_seconds)})`}>
                        <span className="text-[10px] text-white truncate">{entry.domain ?? app}</span>
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
              {['開始時刻','期間','アプリケーション','ドメイン','ステータス'].map(h=>(
                <th key={h} className="px-6 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {timeline.map((e, i) => {
                const st = getStatus(e.app, e.domain);
                return (
                  <tr key={i} style={{ borderBottom: i < timeline.length-1 ? '1px solid #f8fafc' : 'none' }} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 font-mono text-slate-600 text-[12px]">{e.start}</td>
                    <td className="px-6 py-3 text-slate-500">{fmtDur(e.duration_seconds)}</td>
                    <td className="px-6 py-3"><div className="flex items-center space-x-2"><span className="w-2 h-2 rounded-full" style={{backgroundColor:getColor(e.app)}}/><span className="font-medium text-slate-800">{e.app}</span></div></td>
                    <td className="px-6 py-3 text-slate-400">{e.domain ?? '—'}</td>
                    <td className="px-6 py-3"><span className={`px-2 py-0.5 text-[11px] rounded-md font-medium ${statusStyle[st]}`}>{st}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>}
      </div>
    </div>
  );
}
