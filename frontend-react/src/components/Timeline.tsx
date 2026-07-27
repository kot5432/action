import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Target, Clock } from 'lucide-react';
import { getTimeline, getSessionBlocks } from '../lib/api';
import type { TimelineEntry, SessionBlocksResponse } from '../types/api';

// ── カラー定義 ──────────────────────────────────────────────
const CAT_COLOR: Record<string, string> = {
  '開発':           '#3b82f6',
  '学習':           '#10b981',
  '娯楽':           '#f59e0b',
  'SNS':            '#f43f5e',
  'コミュニケーション': '#a78bfa',
  'その他':          '#64748b',
};
const GANTT_BAR: Record<string, { bg: string; border: string; text: string }> = {
  '開発':           { bg: '#1e3a5f', border: '#3b82f6', text: '#60a5fa' },
  '学習':           { bg: '#1a3a2e', border: '#10b981', text: '#34d399' },
  '娯楽':           { bg: '#3a2a10', border: '#f59e0b', text: '#fbbf24' },
  'SNS':            { bg: '#3a1a1f', border: '#f43f5e', text: '#fb7185' },
  'コミュニケーション': { bg: '#2a1f45', border: '#a78bfa', text: '#c4b5fd' },
  'その他':          { bg: '#1e2540', border: '#64748b', text: '#94a3b8' },
};
const CARD = { backgroundColor: '#131629', border: '1px solid #1a2040', borderRadius: 12 };

// ── ユーティリティ ───────────────────────────────────────────
const toMin = (t: string) => { const [h,m,s] = t.split(':').map(Number); return h*60+m+(s||0)/60; };
const fmtDur = (sec: number) => {
  const m = Math.floor(sec/60), s = sec%60;
  if (m >= 60) { const h = Math.floor(m/60); return `${h}h ${m%60}m`; }
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

// ── ガントチャート ───────────────────────────────────────────
function GanttChart({ timeline, serviceNames, GANTT_START, GANTT_RANGE, date }:
  { timeline: TimelineEntry[]; serviceNames: string[]; GANTT_START: number; GANTT_RANGE: number; date: string }) {
  const ROW_H = 38, LABEL_W = 110, HEADER_H = 28;
  const GANTT_END_VAL = GANTT_START + GANTT_RANGE;
  const isToday = date === localDateStr();
  const nowMin  = isToday ? new Date().getHours()*60+new Date().getMinutes() : null;
  const nowPct  = nowMin !== null ? ((nowMin - GANTT_START) / GANTT_RANGE) * 100 : null;

  const hourLabels: { hour: number; totalMinutes: number }[] = [];
  for (let m = Math.ceil(GANTT_START/60)*60; m <= GANTT_END_VAL; m += 60)
    hourLabels.push({ hour: Math.floor(m/60)%24, totalMinutes: m });

  const usedCats = [...new Set(timeline.map(e => e.category ?? 'その他'))];

  return (
    <div style={{ ...CARD, overflow: 'hidden' }}>
      {/* header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px 10px' }}>
        <span style={{ fontSize:13, fontWeight:600, color:'#e2e8f0' }}>アクティビティブロック</span>
        <div style={{ display:'flex', gap:14 }}>
          {usedCats.map(cat => {
            const c = GANTT_BAR[cat] ?? GANTT_BAR['その他'];
            return (
              <span key={cat} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#5d6680' }}>
                <span style={{ width:8, height:8, borderRadius:'50%', backgroundColor:c.border, display:'inline-block' }} />
                {cat}
              </span>
            );
          })}
        </div>
      </div>

      <div style={{ overflowX:'auto', paddingBottom:16 }}>
        <div style={{ minWidth:700, position:'relative', paddingRight:20 }}>
          {/* 時間軸 */}
          <div style={{ marginLeft:LABEL_W, height:HEADER_H, position:'relative', borderBottom:'1px solid #1a2040' }}>
            {hourLabels.map(({ hour, totalMinutes }) => {
              const pct = ((totalMinutes - GANTT_START) / GANTT_RANGE) * 100;
              if (pct < 0 || pct > 100) return null;
              return (
                <div key={totalMinutes} style={{ position:'absolute', left:`${pct}%`, top:0, bottom:0, transform:'translateX(-50%)' }}>
                  <span style={{ fontSize:10, color:'#3d4560', lineHeight:`${HEADER_H}px`, display:'block', whiteSpace:'nowrap', userSelect:'none' }}>
                    {String(hour).padStart(2,'0')}:00
                  </span>
                </div>
              );
            })}
            {nowPct !== null && nowPct >= 0 && nowPct <= 100 && (
              <div style={{ position:'absolute', left:`${nowPct}%`, top:4, transform:'translateX(-50%)', zIndex:10 }}>
                <span style={{ backgroundColor:'#ef4444', color:'#fff', fontSize:9, fontWeight:700, padding:'2px 5px', borderRadius:3, display:'block' }}>NOW</span>
              </div>
            )}
          </div>

          {/* ガント本体 */}
          <div style={{ position:'relative' }}>
            {hourLabels.map(({ totalMinutes }) => {
              const pct = ((totalMinutes - GANTT_START) / GANTT_RANGE) * 100;
              if (pct < 0 || pct > 100) return null;
              return (
                <div key={totalMinutes} style={{
                  position:'absolute', left:`calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${pct/100})`,
                  top:0, bottom:0, width:1, backgroundColor:'#1a2040', pointerEvents:'none', zIndex:0,
                }} />
              );
            })}
            {nowPct !== null && nowPct >= 0 && nowPct <= 100 && (
              <div style={{
                position:'absolute', left:`calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${nowPct/100})`,
                top:0, bottom:0, width:1.5, backgroundColor:'#ef4444', zIndex:5, pointerEvents:'none',
              }} />
            )}

            {timeline.length === 0 ? (
              <div style={{ height:100, display:'flex', alignItems:'center', justifyContent:'center', color:'#3d4560', fontSize:13 }}>
                この日のデータはありません
              </div>
            ) : serviceNames.map((svc, rowIdx) => {
              const entries = timeline.filter(e => (e.service ?? e.app) === svc);
              return (
                <div key={svc} style={{
                  display:'flex', alignItems:'center', height:ROW_H,
                  borderBottom: rowIdx < serviceNames.length-1 ? '1px solid #0f1220' : 'none',
                }}>
                  <div style={{
                    width:LABEL_W, flexShrink:0,
                    fontSize:11, fontWeight:500, color:'#5d6680',
                    textAlign:'right', paddingRight:12,
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                  }}>{svc}</div>
                  <div style={{ flex:1, position:'relative', height:ROW_H-10 }}>
                    {entries.map((entry, idx) => {
                      const sm   = toMin(entry.start);
                      const em   = entry.end ? toMin(entry.end) : sm + entry.duration_seconds/60;
                      const left = ((sm - GANTT_START) / GANTT_RANGE) * 100;
                      const width = ((em - sm) / GANTT_RANGE) * 100;
                      if (left > 100 || left + width < 0) return null;
                      const cl = Math.max(0, left), cw = Math.min(width, 100-cl);
                      const cat = entry.category ?? 'その他';
                      const clr = GANTT_BAR[cat] ?? GANTT_BAR['その他'];
                      return (
                        <div key={idx}
                          title={`${entry.start}–${entry.end ?? '?'} ${svc} (${fmtDur(entry.duration_seconds)})`}
                          style={{
                            position:'absolute', top:4, bottom:4,
                            left:`${cl}%`, width:`${Math.max(cw, 0.4)}%`,
                            backgroundColor: clr.bg,
                            border: `1px solid ${clr.border}`,
                            borderRadius: 4,
                            display:'flex', alignItems:'center', paddingLeft:6, overflow:'hidden', cursor:'default',
                          }}
                        >
                          {cw > 3 && (
                            <span style={{ fontSize:10, fontWeight:600, color:clr.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', pointerEvents:'none' }}>
                              {svc}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── メインコンポーネント ──────────────────────────────────────
export default function Timeline() {
  const [timeline,      setTimeline]      = useState<TimelineEntry[]>([]);
  const [sessionBlocks, setSessionBlocks] = useState<SessionBlocksResponse | null>(null);
  const [date,          setDate]          = useState(localDateStr());
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getTimeline(date), getSessionBlocks(date)])
      .then(([tl, sb]) => { setTimeline(tl); setSessionBlocks(sb); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date]);

  const changeDate = (d: number) => {
    const dt = new Date(date);
    dt.setDate(dt.getDate() + d);
    setDate(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`);
  };

  const totalSec = timeline.reduce((s,e) => s+e.duration_seconds, 0);
  const focusSec = timeline.filter(e => e.category==='開発'||e.category==='学習').reduce((s,e)=>s+e.duration_seconds,0);
  const focusPct = totalSec > 0 ? Math.round(focusSec/totalSec*100) : 0;
  const totalStr = `${String(Math.floor(totalSec/3600)).padStart(2,'0')}:${String(Math.floor((totalSec%3600)/60)).padStart(2,'0')}:${String(totalSec%60).padStart(2,'0')}`;

  const serviceNames = [...new Set(timeline.map(e => e.service ?? e.app))];
  const allMin = timeline.flatMap(e => { const sm=toMin(e.start); const em=e.end?toMin(e.end):sm+Math.floor(e.duration_seconds/60); return [sm,em]; });
  const minMin = allMin.length ? Math.min(...allMin) : 0;
  const maxMin = allMin.length ? Math.max(...allMin) : 24*60;
  const GANTT_START = Math.max(0, Math.floor(minMin/60)*60);
  const GANTT_END   = Math.min(24*60, Math.ceil(maxMin/60)*60+30);
  const GANTT_RANGE = Math.max(60, GANTT_END-GANTT_START);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* ページヘッダー */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#e2e8f0', letterSpacing:'-0.03em' }}>今日のタイムライン</h1>
          <p style={{ fontSize:12, color:'#3d4560', marginTop:3 }}>{fmtDate(date)}</p>
        </div>
        {/* 日付ナビ */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => changeDate(-1)} style={{ width:32, height:32, borderRadius:8, border:'1px solid #1a2040', backgroundColor:'#131629', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#5d6680' }}>
            <ChevronLeft size={16} />
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', backgroundColor:'#131629', border:'1px solid #1a2040', borderRadius:8 }}>
            <Calendar size={13} color="#5d6680" />
            <span style={{ fontSize:12, color:'#8892b0', fontWeight:500 }}>{fmtDate(date)}</span>
          </div>
          <button onClick={() => changeDate(1)} style={{ width:32, height:32, borderRadius:8, border:'1px solid #1a2040', backgroundColor:'#131629', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#5d6680' }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 統計カード */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12 }}>
        {[
          { label:'総稼働時間',         value:totalStr, bar:Math.min(totalSec/(8*3600)*100,100), color:'#3b82f6' },
          { label:'集中率（開発+学習）', value:`${focusPct}%`, bar:focusPct, color:'#10b981' },
        ].map(({ label, value, bar, color }) => (
          <div key={label} style={{ backgroundColor:'#131629', border:'1px solid #1a2040', borderRadius:12, padding:'14px 18px' }}>
            <p style={{ fontSize:11, color:'#3d4560', marginBottom:6, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</p>
            <p style={{ fontSize:22, fontWeight:800, color:'#e2e8f0' }}>{value}</p>
            <div style={{ marginTop:8, height:2, backgroundColor:'#1a2040', borderRadius:2, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${bar}%`, backgroundColor:color, borderRadius:2 }} />
            </div>
          </div>
        ))}
        <div style={{ backgroundColor:'#131629', border:'1px solid #1a2040', borderRadius:12, padding:'14px 18px' }}>
          <p style={{ fontSize:11, color:'#3d4560', marginBottom:8, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>主要カテゴリ</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {[...new Set(timeline.map(e => e.category ?? 'その他'))].slice(0,4).map(cat => (
              <span key={cat} style={{ fontSize:11, padding:'3px 8px', borderRadius:5, backgroundColor:`${CAT_COLOR[cat] ?? '#64748b'}22`, color:CAT_COLOR[cat] ?? '#64748b', fontWeight:600 }}>
                {cat}
              </span>
            ))}
            {timeline.length===0 && <span style={{ fontSize:12, color:'#3d4560' }}>データなし</span>}
          </div>
        </div>
      </div>

      {/* ガントチャート */}
      <GanttChart timeline={timeline} serviceNames={serviceNames} GANTT_START={GANTT_START} GANTT_RANGE={GANTT_RANGE} date={date} />

      {/* 行動ストーリー（セッションブロック） */}
      {sessionBlocks?.blocks && sessionBlocks.blocks.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16, alignItems:'start' }}>
          {/* Story feed */}
          <div style={{ backgroundColor:'#131629', border:'1px solid #1a2040', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px 12px', borderBottom:'1px solid #1a2040', display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:13, fontWeight:700, color:'#e2e8f0' }}>行動ストーリー</span>
              <span style={{ fontSize:11, color:'#3d4560' }}>{sessionBlocks.blocks.length}セッション</span>
            </div>
            <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
              {sessionBlocks.blocks.map((block, i) => {
                const isFocus  = block.is_focus;
                const isDerail = block.is_derail;
                const borderColor = isFocus ? '#10b981' : isDerail ? '#f59e0b' : '#3d4560';
                const bgColor     = isFocus ? 'rgba(16,185,129,0.06)' : isDerail ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.02)';
                const labelColor  = isFocus ? '#34d399' : isDerail ? '#fbbf24' : '#64748b';
                const labelBg     = isFocus ? 'rgba(16,185,129,0.15)' : isDerail ? 'rgba(245,158,11,0.15)' : 'rgba(100,116,139,0.15)';
                const startStr = new Date(block.start_time).toLocaleTimeString('ja-JP', { hour:'2-digit', minute:'2-digit' });
                const endStr   = new Date(block.end_time).toLocaleTimeString('ja-JP', { hour:'2-digit', minute:'2-digit' });
                const durationMin = Math.round(block.duration_seconds/60);
                return (
                  <div key={i} style={{
                    borderLeft:`3px solid ${borderColor}`, paddingLeft:14,
                    backgroundColor:bgColor, borderRadius:'0 8px 8px 0', padding:'10px 12px 10px 14px',
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      {isFocus  && <Target size={13} color="#34d399" />}
                      {isDerail && <Clock  size={13} color="#fbbf24" />}
                      <span style={{ fontSize:12, fontWeight:700, color:'#e2e8f0' }}>
                        {startStr} - {endStr}
                      </span>
                      <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, backgroundColor:labelBg, color:labelColor, fontWeight:600 }}>
                        {isFocus ? `集中 (${durationMin}分)` : isDerail ? `脱線 (${durationMin}分)` : `通常 (${durationMin}分)`}
                      </span>
                    </div>
                    <p style={{ fontSize:12, color:'#5d6680', margin:0 }}>
                      {block.category && <span style={{ color:'#8892b0', fontWeight:500 }}>{block.category}</span>}
                      {block.category && 'で'}{durationMin}分間の活動
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* サマリーサイドバー */}
          <div style={{ backgroundColor:'#131629', border:'1px solid #1a2040', borderRadius:12, padding:'18px 20px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:16 }}>
              <span style={{ fontSize:12, fontWeight:700, color:'#e2e8f0' }}>本日のサマリー</span>
            </div>
            <div style={{ fontSize:42, fontWeight:900, color:'#e2e8f0', lineHeight:1 }}>
              {sessionBlocks.blocks.filter(b=>b.is_focus).length * 20}
              <span style={{ fontSize:14, color:'#5d6680', fontWeight:400 }}>/100</span>
            </div>
            <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:10 }}>
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:11, color:'#5d6680' }}>集中セッション</span>
                  <span style={{ fontSize:11, color:'#34d399', fontWeight:700 }}>
                    {sessionBlocks.blocks.filter(b=>b.is_focus).length}件
                  </span>
                </div>
                <div style={{ height:2, backgroundColor:'#1a2040', borderRadius:2 }}>
                  <div style={{ height:'100%', backgroundColor:'#10b981', borderRadius:2, width:`${Math.min(sessionBlocks.blocks.filter(b=>b.is_focus).length*20,100)}%` }} />
                </div>
              </div>
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:11, color:'#5d6680' }}>脱線セッション</span>
                  <span style={{ fontSize:11, color:'#fbbf24', fontWeight:700 }}>
                    {sessionBlocks.blocks.filter(b=>b.is_derail).length}件
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 詳細ログテーブル */}
      <div style={{ backgroundColor:'#131629', border:'1px solid #1a2040', borderRadius:12, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #1a2040', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:13, fontWeight:700, color:'#e2e8f0' }}>詳細ログ</span>
          <span style={{ fontSize:11, color:'#3d4560' }}>{timeline.length}件</span>
        </div>
        {loading
          ? <div style={{ padding:40, textAlign:'center', color:'#3d4560', fontSize:13 }}>Loading...</div>
          : timeline.length === 0
            ? <div style={{ padding:40, textAlign:'center', color:'#3d4560', fontSize:13 }}>この日のデータはありません</div>
            : <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr>
                    {['開始時刻','期間','サービス','カテゴリ','ステータス'].map(h => (
                      <th key={h} style={{ padding:'8px 20px', textAlign:'left', fontSize:10, fontWeight:700, color:'#3d4560', textTransform:'uppercase', letterSpacing:'0.08em', borderBottom:'1px solid #1a2040' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeline.map((e, i) => {
                    const cat = e.category ?? 'その他';
                    const svc = e.service ?? e.app;
                    const color = CAT_COLOR[cat] ?? '#64748b';
                    return (
                      <tr key={i} style={{ borderBottom: i < timeline.length-1 ? '1px solid #0f1220' : 'none' }}>
                        <td style={{ padding:'9px 20px', fontFamily:'monospace', color:'#5d6680' }}>{e.start}</td>
                        <td style={{ padding:'9px 20px', color:'#5d6680' }}>{fmtDur(e.duration_seconds)}</td>
                        <td style={{ padding:'9px 20px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                            <span style={{ width:6, height:6, borderRadius:'50%', backgroundColor:color, flexShrink:0 }} />
                            <span style={{ fontWeight:600, color:'#8892b0' }}>{svc}</span>
                          </div>
                        </td>
                        <td style={{ padding:'9px 20px', color:'#5d6680' }}>{cat}</td>
                        <td style={{ padding:'9px 20px' }}>
                          <span style={{ fontSize:10, padding:'2px 8px', borderRadius:4, backgroundColor:`${color}22`, color, fontWeight:600 }}>{cat}</span>
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
