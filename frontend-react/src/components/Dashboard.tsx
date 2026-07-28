import { useEffect, useState } from 'react';
import { Clock, AlertTriangle, TrendingUp, Target, MessageSquare, Zap } from 'lucide-react';
import { getDashboard, getScores, getDailyStory } from '../lib/api';
import type { DashboardData, ScoresData, DailyStory } from '../types/api';

const CARD = {
  backgroundColor: '#131629',
  border: '1px solid #1a2040',
  borderRadius: 12,
};

export default function Dashboard() {
  const [data,       setData]       = useState<DashboardData | null>(null);
  const [scores,     setScores]     = useState<ScoresData | null>(null);
  const [dailyStory, setDailyStory] = useState<DailyStory | null>(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [d, s] = await Promise.all([getDashboard(), getScores()]);
        setData(d); setScores(s);
        try { setDailyStory(await getDailyStory()); } catch {}
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  const fmt = (m: number) => {
    const h = Math.floor(m / 60), min = m % 60;
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
  };
  const fmtTimer = (m: number) => {
    const h = Math.floor(m / 60), min = m % 60;
    return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}:00`;
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

  const productivity = scores?.productivity_index ?? 0;
  const focusPct = scores?.score_focus ?? 0;

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.03em' }}>ダッシュボード</h1>
        <p style={{ fontSize: 12, color: '#3d4560', marginTop: 3 }}>現在の作業状況をリアルタイムで確認</p>
      </div>

      {/* Current session hero card */}
      <div style={{
        ...CARD,
        padding: '20px 24px',
        marginBottom: 16,
        background: 'linear-gradient(135deg, #131629 60%, #1a1040)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* green dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 6px #10b981' }} />
          <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600, letterSpacing: '0.06em' }}>
            {data.current_category ?? 'アクティブセッション'}
          </span>
          {data.current_category && (
            <span style={{
              marginLeft: 6, padding: '2px 8px',
              backgroundColor: '#ef4444', borderRadius: 4,
              fontSize: 11, fontWeight: 700, color: '#fff',
            }}>セッション中</span>
          )}
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.03em', marginBottom: 4 }}>
          {data.current_app || '—'}
        </h2>
        {data.current_service && (
          <p style={{ fontSize: 13, color: '#5d6680', marginBottom: 12 }}>
            サービス: <span style={{ color: '#8892b0' }}>{data.current_service}</span>
          </p>
        )}
        <div style={{ fontFamily: 'monospace', fontSize: 36, fontWeight: 700, color: '#7c3aed', letterSpacing: 2 }}>
          {fmtTimer(data.session_duration_minutes)}
        </div>
        <p style={{ fontSize: 11, color: '#3d4560', marginTop: 4 }}>経過時間</p>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {/* Focus time */}
        <div style={{ ...CARD, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Clock size={14} color="#3b82f6" />
            <span style={{ fontSize: 10, color: '#3d4560', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              集中時間
            </span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#3b82f6', letterSpacing: '-0.02em' }}>
            {fmt(scores?.focus_minutes ?? 0)}
          </div>
          <div style={{ fontSize: 10, color: '#3d4560', marginTop: 4 }}>Focus Time</div>
          <div style={{ marginTop: 8, height: 2, backgroundColor: '#1a2040', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${focusPct}%`, backgroundColor: '#3b82f6', borderRadius: 2 }} />
          </div>
        </div>

        {/* Derailments */}
        <div style={{ ...CARD, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <AlertTriangle size={14} color="#f59e0b" />
            <span style={{ fontSize: 10, color: '#3d4560', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              脱線回数
            </span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b', letterSpacing: '-0.02em' }}>
            {scores?.derail_count ?? 0}
            <span style={{ fontSize: 14, color: '#5d6680', fontWeight: 400, marginLeft: 4 }}>回</span>
          </div>
          <div style={{ fontSize: 10, color: '#3d4560', marginTop: 4 }}>Derailments</div>
        </div>

        {/* Return rate */}
        <div style={{ ...CARD, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <TrendingUp size={14} color="#10b981" />
            <span style={{ fontSize: 10, color: '#3d4560', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              復帰率
            </span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981', letterSpacing: '-0.02em' }}>
            {(scores?.return_rate ?? 0).toFixed(1)}%
          </div>
          <div style={{ fontSize: 10, color: '#3d4560', marginTop: 4 }}>Return Rate</div>
          <div style={{ marginTop: 8, height: 2, backgroundColor: '#1a2040', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${scores?.return_rate ?? 0}%`, backgroundColor: '#10b981', borderRadius: 2 }} />
          </div>
        </div>

        {/* Productivity */}
        <div style={{ ...CARD, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Zap size={14} color="#a78bfa" />
            <span style={{ fontSize: 10, color: '#3d4560', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              生産性指数
            </span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#a78bfa', letterSpacing: '-0.02em' }}>
            {productivity.toFixed(1)}
            <span style={{ fontSize: 12, color: '#5d6680', fontWeight: 400 }}>/100</span>
          </div>
          <div style={{ fontSize: 10, color: '#3d4560', marginTop: 4 }}>Productivity</div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Today usage */}
        <div style={{ ...CARD, padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Target size={14} color="#6d28d9" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#8892b0' }}>今日の合計使用時間</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.03em' }}>
            {fmt(data.today_usage_minutes)}
          </div>
          <div style={{ marginTop: 10, height: 3, backgroundColor: '#1a2040', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min((data.today_usage_minutes / 480) * 100, 100)}%`,
              background: 'linear-gradient(90deg, #6d28d9, #3b82f6)',
              borderRadius: 3,
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: '#3d4560' }}>0h</span>
            <span style={{ fontSize: 10, color: '#3d4560' }}>目標 8h</span>
          </div>
        </div>

        {/* Daily story */}
        <div style={{ ...CARD, padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <MessageSquare size={14} color="#f59e0b" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#8892b0' }}>今日の一言</span>
          </div>
          {dailyStory?.story && typeof dailyStory.story === 'string' && dailyStory.story !== '今日のデータはまだありません' ? (
            <p style={{ fontSize: 12, color: '#8892b0', lineHeight: 1.7, margin: 0 }}>
              {dailyStory.story.length > 160 ? dailyStory.story.slice(0, 160) + '…' : dailyStory.story}
            </p>
          ) : (
            <p style={{ fontSize: 12, color: '#3d4560', lineHeight: 1.7, margin: 0 }}>
              今日のデータはまだありません
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
