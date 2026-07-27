import { useEffect, useState } from 'react';
import { Lightbulb, TrendingUp, Clock, Repeat, AlertTriangle, Tag } from 'lucide-react';
import { getInsights, getTagUsageStats } from '../lib/api';
import type { Insight, TagUsageStats } from '../types/api';

const SEVERITY_STYLE: Record<string, { bg: string; border: string; icon: string; badge: string; badgeText: string }> = {
  success: { bg:'rgba(16,185,129,0.06)',  border:'rgba(16,185,129,0.2)',  icon:'#34d399', badge:'rgba(16,185,129,0.15)',  badgeText:'#34d399' },
  warning: { bg:'rgba(245,158,11,0.06)',  border:'rgba(245,158,11,0.2)',  icon:'#fbbf24', badge:'rgba(245,158,11,0.15)',  badgeText:'#fbbf24' },
  danger:  { bg:'rgba(239,68,68,0.06)',   border:'rgba(239,68,68,0.2)',   icon:'#f87171', badge:'rgba(239,68,68,0.15)',   badgeText:'#f87171' },
  info:    { bg:'rgba(59,130,246,0.06)',  border:'rgba(59,130,246,0.2)',  icon:'#60a5fa', badge:'rgba(59,130,246,0.15)',  badgeText:'#60a5fa' },
};

const getIcon = (type: string) => {
  switch (type) {
    case 'pattern': case 'transition': return Repeat;
    case 'time_pattern': return Clock;
    case 'focus':   return TrendingUp;
    case 'derail':  return AlertTriangle;
    default:        return Lightbulb;
  }
};

export default function Insights() {
  const [insights,  setInsights]  = useState<Insight[]>([]);
  const [tagStats,  setTagStats]  = useState<TagUsageStats[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([getInsights().catch(()=>[]), getTagUsageStats().catch(()=>[])])
      .then(([ins, ts]) => {
        setInsights(Array.isArray(ins) ? ins : []);
        setTagStats(Array.isArray(ts) ? ts : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, color:'#3d4560', fontSize:13 }}>読み込み中...</div>
  );

  const grouped = insights.reduce((acc, insight) => {
    if (!acc[insight.category]) acc[insight.category] = [];
    acc[insight.category].push(insight);
    return acc;
  }, {} as Record<string, Insight[]>);

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Lightbulb size={18} color="#f59e0b" />
          <h1 style={{ fontSize:22, fontWeight:800, color:'#e2e8f0', letterSpacing:'-0.03em' }}>インサイト</h1>
        </div>
        <p style={{ fontSize:12, color:'#3d4560', marginTop:3 }}>行動パターンから傾向を抽出</p>
      </div>

      {insights.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'#3d4560', fontSize:13 }}>
          まだデータがありません。データを収集してパターンを発見しましょう。
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:28 }}>
          {Object.entries(grouped).map(([category, categoryInsights]) => (
            <div key={category}>
              <h2 style={{ fontSize:13, fontWeight:700, color:'#5d6680', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>
                {category}
              </h2>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:12 }}>
                {categoryInsights.map((insight, index) => {
                  const sev   = SEVERITY_STYLE[insight.severity] ?? SEVERITY_STYLE.info;
                  const IconComp = getIcon(insight.type);
                  return (
                    <div key={index} style={{
                      backgroundColor:'#131629',
                      border:`1px solid ${sev.border}`,
                      borderRadius:10, padding:'16px 18px',
                      background:`linear-gradient(135deg, ${sev.bg} 0%, #131629 100%)`,
                    }}>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                        <div style={{
                          width:32, height:32, borderRadius:8, flexShrink:0,
                          backgroundColor:`${sev.icon}18`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                        }}>
                          <IconComp size={14} color={sev.icon} />
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                            <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, backgroundColor:sev.badge, color:sev.badgeText, fontWeight:700 }}>
                              {insight.severity}
                            </span>
                            <span style={{ fontSize:10, color:'#3d4560' }}>{insight.type.replace('_',' ')}</span>
                          </div>
                          <p style={{ fontSize:12, color:'#8892b0', fontWeight:500, lineHeight:1.6, margin:0 }}>{insight.message}</p>

                          {insight.data && Object.keys(insight.data).length > 0 && (
                            <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid #1a2040' }}>
                              <p style={{ fontSize:10, fontWeight:700, color:'#5d6680', marginBottom:6 }}>原因分析</p>
                              <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                                {insight.data.cause && (
                                  <p style={{ fontSize:11, color:'#3d4560', margin:0 }}>
                                    <span style={{ color:'#5d6680', fontWeight:600 }}>原因: </span>{insight.data.cause}
                                  </p>
                                )}
                                {insight.data.transition_services && (
                                  <p style={{ fontSize:11, color:'#3d4560', margin:0 }}>
                                    <span style={{ color:'#5d6680', fontWeight:600 }}>遷移先: </span>{insight.data.transition_services}
                                  </p>
                                )}
                                {insight.data.average_duration && (
                                  <p style={{ fontSize:11, color:'#3d4560', margin:0 }}>
                                    <span style={{ color:'#5d6680', fontWeight:600 }}>平均滞在: </span>{Math.round(insight.data.average_duration/60)}分
                                  </p>
                                )}
                                {insight.data.return_rate && (
                                  <p style={{ fontSize:11, color:'#3d4560', margin:0 }}>
                                    <span style={{ color:'#5d6680', fontWeight:600 }}>復帰率: </span>{insight.data.return_rate}%
                                  </p>
                                )}
                                {insight.data.time_range && (
                                  <p style={{ fontSize:11, color:'#3d4560', margin:0 }}>
                                    <span style={{ color:'#5d6680', fontWeight:600 }}>時間帯: </span>{insight.data.time_range}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* タグ別使用統計 */}
      {tagStats.length > 0 && (
        <div style={{ marginTop:32 }}>
          <h2 style={{ fontSize:13, fontWeight:700, color:'#5d6680', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>
            タグ別使用統計
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10 }}>
            {tagStats.map((stat, i) => (
              <div key={i} style={{ backgroundColor:'#131629', border:'1px solid #1a2040', borderRadius:10, padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <Tag size={13} color="#60a5fa" />
                  <span style={{ fontSize:12, color:'#8892b0', fontWeight:600 }}>{stat.tag}</span>
                </div>
                <div style={{ fontSize:11, color:'#3d4560' }}>
                  総時間: <span style={{ color:'#5d6680' }}>{Math.round(stat.total_seconds/60)}分</span>
                </div>
                <div style={{ fontSize:11, color:'#3d4560', marginTop:2 }}>
                  セッション: <span style={{ color:'#5d6680' }}>{stat.session_count}回</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
