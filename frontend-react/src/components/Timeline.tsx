import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Filter, Tag, Clock, Target } from 'lucide-react';
import { getTimeline, getSessionBlocks } from '../lib/api';
import type { TimelineEntry, SessionBlocksResponse } from '../types/api';

// ============================================================
// Constants
// ============================================================

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

// パステル系バーカラー（カテゴリ別）
const GANTT_BAR_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  '開発':           { bg: '#bfdbfe', border: '#93c5fd', text: '#1e40af' },
  '学習':           { bg: '#bbf7d0', border: '#86efac', text: '#166534' },
  '娯楽':           { bg: '#fed7aa', border: '#fdba74', text: '#92400e' },
  'SNS':            { bg: '#fecdd3', border: '#fda4af', text: '#9f1239' },
  'コミュニケーション': { bg: '#ddd6fe', border: '#c4b5fd', text: '#5b21b6' },
  'その他':          { bg: '#e2e8f0', border: '#cbd5e1', text: '#475569' },
};

// ============================================================
// Helpers
// ============================================================

const toMin = (t: string) => { const [h, m, s] = t.split(':').map(Number); return h * 60 + m + (s || 0) / 60; };
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
const localDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const CARD = { backgroundColor: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' };

// ============================================================
// GanttChart Component
// ============================================================

interface GanttChartProps {
  timeline: TimelineEntry[];
  serviceNames: string[];
  GANTT_START: number;
  GANTT_RANGE: number;
  toMin: (t: string) => number;
  fmtDur: (sec: number) => string;
  date: string;
}

function GanttChart({ timeline, serviceNames, GANTT_START, GANTT_RANGE, toMin, fmtDur, date }: GanttChartProps) {
  const ROW_HEIGHT = 36;
  const LABEL_W    = 96;
  const HEADER_H   = 28;
  const GANTT_END_VAL = GANTT_START + GANTT_RANGE;

  // NOW line
  const isToday = date === localDateStr();
  const nowMin  = isToday ? new Date().getHours() * 60 + new Date().getMinutes() : null;
  const nowPct  = nowMin !== null ? ((nowMin - GANTT_START) / GANTT_RANGE) * 100 : null;

  // Hour labels (major ticks every 1h)
  const hourLabels: { hour: number; totalMinutes: number }[] = [];
  for (let m = Math.ceil(GANTT_START / 60) * 60; m <= GANTT_END_VAL; m += 60) {
    hourLabels.push({ hour: Math.floor(m / 60) % 24, totalMinutes: m });
  }

  const usedCategories = [...new Set(timeline.map(e => e.category ?? 'その他'))];

  return (
    <div style={{ ...CARD, overflow: 'hidden' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 10px' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>カテゴリ別タイムライン</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {usedCategories.map(cat => {
            const c = GANTT_BAR_COLORS[cat] ?? GANTT_BAR_COLORS['その他'];
            return (
              <span key={cat} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: c.border, display: 'inline-block', flexShrink: 0 }} />
                {cat}
              </span>
            );
          })}
        </div>
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
        <div style={{ minWidth: 700, position: 'relative', paddingRight: 20 }}>

          {/* 時間軸ヘッダー */}
          <div style={{ marginLeft: LABEL_W, height: HEADER_H, position: 'relative', borderBottom: '1px solid #f1f5f9' }}>
            {hourLabels.map(({ hour, totalMinutes }) => {
              const pct = ((totalMinutes - GANTT_START) / GANTT_RANGE) * 100;
              if (pct < 0 || pct > 100) return null;
              return (
                <div key={totalMinutes} style={{ position: 'absolute', left: `${pct}%`, top: 0, bottom: 0, transform: 'translateX(-50%)' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', lineHeight: `${HEADER_H}px`, display: 'block', whiteSpace: 'nowrap', userSelect: 'none' }}>
                    {String(hour).padStart(2, '0')}:00
                  </span>
                </div>
              );
            })}
            {/* NOW バッジ */}
            {nowPct !== null && nowPct >= 0 && nowPct <= 100 && (
              <div style={{ position: 'absolute', left: `${nowPct}%`, top: 5, transform: 'translateX(-50%)', zIndex: 10 }}>
                <span style={{
                  backgroundColor: '#ef4444', color: '#fff',
                  fontSize: 9, fontWeight: 700,
                  padding: '2px 5px', borderRadius: 4,
                  letterSpacing: '0.06em', display: 'block',
                }}>NOW</span>
              </div>
            )}
          </div>

          {/* ガントボディ */}
          <div style={{ position: 'relative' }}>
            {/* グリッド縦線（全行にまたがる） */}
            {hourLabels.map(({ totalMinutes }) => {
              const pct = ((totalMinutes - GANTT_START) / GANTT_RANGE) * 100;
              if (pct < 0 || pct > 100) return null;
              return (
                <div key={totalMinutes} style={{
                  position: 'absolute',
                  left: `calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${pct / 100})`,
                  top: 0, bottom: 0, width: 1,
                  backgroundColor: '#f1f5f9',
                  pointerEvents: 'none', zIndex: 0,
                }} />
              );
            })}

            {/* NOW 縦線 */}
            {nowPct !== null && nowPct >= 0 && nowPct <= 100 && (
              <div style={{
                position: 'absolute',
                left: `calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${nowPct / 100})`,
                top: 0, bottom: 0, width: 1.5,
                backgroundColor: '#ef4444',
                zIndex: 5, pointerEvents: 'none',
              }} />
            )}

            {timeline.length === 0 ? (
              <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
                この日のデータはありません
              </div>
            ) : (
              serviceNames.map((svcName, rowIdx) => {
                const entries = timeline.filter(e => (e.service ?? e.app) === svcName);
                return (
                  <div
                    key={svcName}
                    style={{
                      display: 'flex', alignItems: 'center',
                      height: ROW_HEIGHT,
                      borderBottom: rowIdx < serviceNames.length - 1 ? '1px solid #f8fafc' : 'none',
                      position: 'relative',
                    }}
                  >
                    {/* アプリ名ラベル */}
                    <div style={{
                      width: LABEL_W, flexShrink: 0,
                      fontSize: 12, fontWeight: 500, color: '#475569',
                      textAlign: 'right', paddingRight: 14,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {svcName}
                    </div>

                    {/* バー領域 */}
                    <div style={{ flex: 1, position: 'relative', height: ROW_HEIGHT - 12 }}>
                      {entries.map((entry, idx) => {
                        const sm   = toMin(entry.start);
                        const em   = entry.end ? toMin(entry.end) : sm + entry.duration_seconds / 60;
                        const left = ((sm - GANTT_START) / GANTT_RANGE) * 100;
                        const width = ((em - sm) / GANTT_RANGE) * 100;
                        if (left > 100 || left + width < 0) return null;
                        const cl  = Math.max(0, left);
                        const cw  = Math.min(width, 100 - cl);
                        const cat = entry.category ?? 'その他';
                        const clr = GANTT_BAR_COLORS[cat] ?? GANTT_BAR_COLORS['その他'];

                        return (
                          <div
                            key={`${svcName}-${idx}`}
                            title={`${entry.start}–${entry.end ?? '?'} ${svcName} (${fmtDur(entry.duration_seconds)})`}
                            style={{
                              position: 'absolute', top: 4, bottom: 4,
                              left: `${cl}%`, width: `${Math.max(cw, 0.3)}%`,
                              backgroundColor: clr.bg,
                              border: `1px solid ${clr.border}`,
                              borderRadius: 2,
                              display: 'flex', alignItems: 'center',
                              paddingLeft: 6, overflow: 'hidden',
                              cursor: 'default',
                              transition: 'opacity 0.12s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '0.65')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                          >
                            {cw > 3 && (
                              <span style={{
                                fontSize: 10, fontWeight: 500, color: clr.text,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                pointerEvents: 'none',
                              }}>
                                {cat}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Timeline Page
// ============================================================

export default function Timeline() {
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [sessionBlocks, setSessionBlocks] = useState<SessionBlocksResponse | null>(null);
  const [date, setDate]         = useState(localDateStr());
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getTimeline(date),
      getSessionBlocks(date)
    ]).then(([timelineData, blocksData]) => {
      setTimeline(timelineData);
      setSessionBlocks(blocksData);
    }).catch(error => {
      console.error('Failed to fetch timeline data:', error);
      // タイムラインデータが取得できなくてもエラーを表示しない
    }).finally(() => setLoading(false));
  }, [date]);

  const changeDate = (d: number) => {
    const dt = new Date(date);
    dt.setDate(dt.getDate() + d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth()+1).padStart(2,'0');
    const day = String(dt.getDate()).padStart(2,'0');
    setDate(`${y}-${m}-${day}`);
  };

  const totalSec  = timeline.reduce((s, e) => s + e.duration_seconds, 0);
  const totalStr  = `${String(Math.floor(totalSec/3600)).padStart(2,'0')}:${String(Math.floor((totalSec%3600)/60)).padStart(2,'0')}:${String(totalSec%60).padStart(2,'0')}`;
  const focusSec  = timeline.filter(e => e.category === '開発' || e.category === '学習').reduce((s,e) => s + e.duration_seconds, 0);
  const focusPct  = totalSec > 0 ? Math.round(focusSec / totalSec * 100) : 0;

  // サービス単位でグループ化
  const serviceNames = [...new Set(timeline.map(e => e.service ?? e.app))];

  // 動的な時間範囲計算
  const allMinutes = timeline.flatMap(e => {
    const sm = toMin(e.start);
    const em = e.end ? toMin(e.end) : sm + Math.floor(e.duration_seconds/60);
    return [sm, em];
  });
  const minMinute = allMinutes.length > 0 ? Math.min(...allMinutes) : 0;
  const maxMinute = allMinutes.length > 0 ? Math.max(...allMinutes) : 24*60;
  const GANTT_START = Math.max(0, Math.floor(minMinute / 60) * 60);
  const GANTT_END   = Math.min(24*60, Math.ceil(maxMinute / 60) * 60 + 30);
  const GANTT_RANGE = Math.max(60, GANTT_END - GANTT_START);

  return (
    <div className="space-y-4">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">タイムライン分析</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">カテゴリ別アクティビティ分布（多段カテゴリ表示）</p>
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

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '総稼働時間',        value: totalStr,    bar: Math.min(totalSec/(8*3600)*100,100), color: '#3b82f6' },
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
          <p className="text-[11px] font-medium text-slate-400 mb-2">主要カテゴリ</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {[...new Set(timeline.map(e => e.category ?? 'その他'))].slice(0,4).map(cat => (
              <span key={cat} className="text-[11px] px-2 py-0.5 rounded-md font-medium"
                style={{ backgroundColor: CATEGORY_COLORS[cat] ?? '#94a3b8', color: '#fff' }}>
                {cat}
              </span>
            ))}
            {timeline.length === 0 && <span className="text-[12px] text-slate-400">データなし</span>}
          </div>
        </div>
      </div>

      {/* ガントチャート（カテゴリ別タイムライン） */}
      <GanttChart
        timeline={timeline}
        serviceNames={serviceNames}
        GANTT_START={GANTT_START}
        GANTT_RANGE={GANTT_RANGE}
        toMin={toMin}
        fmtDur={fmtDur}
        date={date}
      />

      {/* 行動ストーリー - セッションブロック形式 */}
      {sessionBlocks && sessionBlocks.blocks && sessionBlocks.blocks.length > 0 && (
        <div style={{ ...CARD, overflow: 'hidden' }}>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <p className="text-[13px] font-semibold text-slate-800">行動ストーリー</p>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-400">
                {sessionBlocks.blocks.length}セッション
              </span>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {sessionBlocks.blocks.map((block, index) => (
              <div key={index} className="border-l-4 pl-4" style={{ 
                borderColor: block.is_focus ? '#10b981' : block.is_derail ? '#f59e0b' : '#6b7280',
                backgroundColor: block.is_focus ? '#f0fdf4' : block.is_derail ? '#fffbeb' : '#f9fafb'
              }}>
                <div className="flex items-center space-x-2 mb-2">
                  {block.is_focus && <Target className="w-4 h-4 text-green-600" />}
                  {block.is_derail && <Clock className="w-4 h-4 text-amber-600" />}
                  <span className="text-sm font-semibold text-slate-900">
                    {new Date(block.start_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    {' ～ '}
                    {new Date(block.end_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{
                    backgroundColor: block.is_focus ? '#dcfce7' : block.is_derail ? '#fef3c7' : '#e5e7eb',
                    color: block.is_focus ? '#166534' : block.is_derail ? '#92400e' : '#374151'
                  }}>
                    {block.is_focus ? '集中' : block.is_derail ? '脱線' : '通常'}
                  </span>
                </div>
                <div className="text-sm text-slate-700 leading-relaxed">
                  {block.category && <span className="font-medium">{block.category}</span>}
                  {block.category && 'で'}
                  {Math.round(block.duration_seconds / 60)}分間の活動
                </div>
                {block.is_focus && (
                  <div className="mt-2 text-xs text-green-700">
                    集中時間: {Math.round(block.duration_seconds / 60)}分
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 詳細ログテーブル */}
      <div style={{ ...CARD, overflow: 'hidden' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <p className="text-[13px] font-semibold text-slate-800">詳細ログ</p>
          <div className="flex items-center space-x-2">
            {[<><Tag className="w-3 h-3" /><span>全カテゴリ</span></>, <><Filter className="w-3 h-3" /><span>フィルター</span></>].map((c, i) => (
              <button key={i} className="flex items-center space-x-1.5 px-3 py-1.5 text-[12px] rounded-lg text-slate-500 hover:bg-slate-50 transition-colors" style={{ border: '1px solid #e2e8f0' }}>{c}</button>
            ))}
          </div>
        </div>
        {loading
          ? <div className="py-12 text-center text-[12px] text-slate-400">Loading...</div>
          : timeline.length === 0
            ? <div className="py-12 text-center text-[12px] text-slate-400">この日のデータはありません</div>
            : <table className="w-full text-[13px]">
                <thead><tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {['開始時刻','期間','サービス','カテゴリ','ステータス'].map(h => (
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
              </table>
        }
      </div>
    </div>
  );
}
