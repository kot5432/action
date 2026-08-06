import { useEffect, useState } from 'react';
import { Clock, TrendingUp, Target } from 'lucide-react';
import { getDashboard } from '../lib/api_mvp';

const CARD = {
  backgroundColor: '#131629',
  border: '1px solid #1a2040',
  borderRadius: 12,
};

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const d = await getDashboard();
        setData(d);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  const fmt = (m: number) => {
    const h = Math.floor(m / 60), min = m % 60;
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, color:'#3d4560', fontSize:13 }}>
      読み込み中...
    </div>
  );
  if (!data) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, color:'#ef4444', fontSize:13 }}>
      データの取得に失敗しました
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* ページヘッダー */}
      <div>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#e2e8f0', letterSpacing:'-0.03em' }}>ダッシュボード</h1>
        <p style={{ fontSize:12, color:'#3d4560', marginTop:3 }}>今日の行動概要</p>
      </div>

      {/* 現在のセッション */}
      {data.current_session && (
        <div style={{ ...CARD, padding:'16px 20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <Clock size={16} color="#3b82f6" />
            <span style={{ fontSize:13, fontWeight:600, color:'#e2e8f0' }}>現在のセッション</span>
          </div>
          <div style={{ fontSize:18, fontWeight:700, color:'#8892b0' }}>
            {data.current_session.service}
          </div>
          <div style={{ fontSize:12, color:'#5d6680', marginTop:4 }}>
            {data.current_session.category} • {data.current_session.app_name}
          </div>
        </div>
      )}

      {/* 統計カード */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12 }}>
        <div style={{ ...CARD, padding:'16px 18px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <Clock size={14} color="#3b82f6" />
            <span style={{ fontSize:11, color:'#3d4560', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>総稼働時間</span>
          </div>
          <div style={{ fontSize:24, fontWeight:800, color:'#e2e8f0' }}>
            {fmt(data.today_summary.total_minutes)}
          </div>
          <div style={{ fontSize:11, color:'#5d6680', marginTop:4 }}>
            {data.today_summary.session_count} セッション
          </div>
        </div>

        <div style={{ ...CARD, padding:'16px 18px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <Target size={14} color="#10b981" />
            <span style={{ fontSize:11, color:'#3d4560', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>集中時間</span>
          </div>
          <div style={{ fontSize:24, fontWeight:800, color:'#e2e8f0' }}>
            {fmt(data.today_summary.focus_minutes)}
          </div>
          <div style={{ fontSize:11, color:'#5d6680', marginTop:4 }}>
            開発・学習
          </div>
        </div>

        <div style={{ ...CARD, padding:'16px 18px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <TrendingUp size={14} color="#f59e0b" />
            <span style={{ fontSize:11, color:'#3d4560', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>娯楽時間</span>
          </div>
          <div style={{ fontSize:24, fontWeight:800, color:'#e2e8f0' }}>
            {fmt(data.today_summary.distract_minutes)}
          </div>
          <div style={{ fontSize:11, color:'#5d6680', marginTop:4 }}>
            娯楽・SNS
          </div>
        </div>
      </div>
    </div>
  );
}
