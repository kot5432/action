import { useEffect, useState } from 'react';
import { getTimeline } from '../lib/api_mvp';
import Calendar from './Calendar';

const CAT_COLOR: Record<string, string> = {
  '開発': '#3b82f6',
  '学習': '#10b981',
  '娯楽': '#f59e0b',
  'SNS': '#f43f5e',
  'コミュニケーション': '#a78bfa',
  'その他': '#64748b',
};

const CARD = { backgroundColor: '#131629', border: '1px solid #1a2040', borderRadius: 12 };

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

export default function Timeline() {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [date, setDate] = useState(localDateStr());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getTimeline(date)
      .then(setTimeline)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date]);

  const totalSec = timeline.reduce((s,e) => s+e.duration_seconds, 0);
  const focusSec = timeline.filter(e => e.category==='開発'||e.category==='学習').reduce((s,e)=>s+e.duration_seconds,0);
  const focusPct = totalSec > 0 ? Math.round(focusSec/totalSec*100) : 0;
  const totalStr = `${String(Math.floor(totalSec/3600)).padStart(2,'0')}:${String(Math.floor((totalSec%3600)/60)).padStart(2,'0')}:${String(totalSec%60).padStart(2,'0')}`;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* ページヘッダー */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#e2e8f0', letterSpacing:'-0.03em' }}>タイムライン</h1>
          <p style={{ fontSize:12, color:'#3d4560', marginTop:3 }}>{fmtDate(date)}</p>
        </div>
        {/* カレンダー */}
        <Calendar selectedDate={date} onDateSelect={setDate} />
      </div>

      {/* 統計カード */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:12 }}>
        <div style={{ ...CARD, padding:'14px 18px' }}>
          <p style={{ fontSize:11, color:'#3d4560', marginBottom:6, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>総稼働時間</p>
          <p style={{ fontSize:22, fontWeight:800, color:'#e2e8f0' }}>{totalStr}</p>
          <div style={{ marginTop:8, height:2, backgroundColor:'#1a2040', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${Math.min(totalSec/(8*3600)*100,100)}%`, backgroundColor:'#3b82f6', borderRadius:2 }} />
          </div>
        </div>
        <div style={{ ...CARD, padding:'14px 18px' }}>
          <p style={{ fontSize:11, color:'#3d4560', marginBottom:6, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>集中率（開発+学習）</p>
          <p style={{ fontSize:22, fontWeight:800, color:'#e2e8f0' }}>{focusPct}%</p>
          <div style={{ marginTop:8, height:2, backgroundColor:'#1a2040', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${focusPct}%`, backgroundColor:'#10b981', borderRadius:2 }} />
          </div>
        </div>
      </div>

      {/* 詳細ログテーブル */}
      <div style={{ ...CARD, overflow:'hidden' }}>
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
                    {['開始時刻','期間','サービス','カテゴリ'].map(h => (
                      <th key={h} style={{ padding:'8px 20px', textAlign:'left', fontSize:10, fontWeight:700, color:'#3d4560', textTransform:'uppercase', letterSpacing:'0.08em', borderBottom:'1px solid #1a2040' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeline.map((e, i) => {
                    const cat = e.category ?? 'その他';
                    const color = CAT_COLOR[cat] ?? '#64748b';
                    return (
                      <tr key={i} style={{ borderBottom: i < timeline.length-1 ? '1px solid #0f1220' : 'none' }}>
                        <td style={{ padding:'9px 20px', fontFamily:'monospace', color:'#5d6680' }}>{e.start}</td>
                        <td style={{ padding:'9px 20px', color:'#5d6680' }}>{fmtDur(e.duration_seconds)}</td>
                        <td style={{ padding:'9px 20px', fontWeight:600, color:'#8892b0' }}>{e.service}</td>
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
