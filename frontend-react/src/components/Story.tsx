import { useEffect, useState } from 'react';
import { BookOpen, Calendar, AlertCircle, Clock } from 'lucide-react';
import { getStory } from '../lib/api';
import type { StoryResponse } from '../types/api';

export default function Story() {
  const [storyData,    setStoryData]    = useState<StoryResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    setLoading(true);
    getStory(selectedDate)
      .then(setStoryData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedDate]);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, color:'#3d4560', fontSize:13 }}>読み込み中...</div>
  );

  const story = storyData?.story ?? [];
  const drift = storyData?.total_drift_minutes ?? 0;

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <BookOpen size={18} color="#a78bfa" />
          <h1 style={{ fontSize:22, fontWeight:800, color:'#e2e8f0', letterSpacing:'-0.03em' }}>行動ストーリー</h1>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px', backgroundColor:'#131629', border:'1px solid #1a2040', borderRadius:8 }}>
          <Calendar size={13} color="#5d6680" />
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{ background:'transparent', border:'none', color:'#8892b0', fontSize:12, outline:'none', cursor:'pointer' }}
          />
        </div>
      </div>

      {drift > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', backgroundColor:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:8, marginBottom:16 }}>
          <AlertCircle size={14} color="#f59e0b" />
          <span style={{ fontSize:12, color:'#f59e0b', fontWeight:500 }}>推定離脱時間: {drift}分</span>
        </div>
      )}

      {story.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'#3d4560', fontSize:13 }}>この日のデータはありません</div>
      ) : (
        <div style={{ position:'relative' }}>
          {/* タイムライン縦線 */}
          <div style={{ position:'absolute', left:27, top:0, bottom:0, width:1, backgroundColor:'#1a2040' }} />

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {story.map((entry, index) => (
              <div key={index} style={{ display:'flex', alignItems:'flex-start', gap:16, position:'relative' }}>
                {/* アイコン */}
                <div style={{
                  width:28, height:28, borderRadius:8, flexShrink:0,
                  backgroundColor:'#1a2040', border:'1px solid #252d50',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  position:'relative', zIndex:1,
                }}>
                  <Clock size={12} color="#5d6680" />
                </div>

                {/* カード */}
                <div style={{
                  flex:1, backgroundColor:'#131629', border:'1px solid #1a2040',
                  borderRadius:10, padding:'12px 16px',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <span style={{ fontSize:11, fontFamily:'monospace', color:'#5d6680', backgroundColor:'#0f1220', padding:'2px 7px', borderRadius:4 }}>
                      {entry.time}
                    </span>
                  </div>
                  <p style={{ fontSize:13, color:'#8892b0', lineHeight:1.7, margin:0 }}>{entry.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
