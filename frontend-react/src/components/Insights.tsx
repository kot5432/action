import { useEffect, useState } from 'react';
import { TrendingUp, Zap, BarChart2, Calendar, Download, Clock, Ban, Coffee, ListTodo, ChevronRight, AlertTriangle, Lightbulb } from 'lucide-react';
import { getInsights, getTransitions } from '../lib/api';
import type { Insight, Transition } from '../types/api';
import { BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';

const CONC_DATA = [
  { day: 'Mon', v: 55 }, { day: 'Tue', v: 72 }, { day: 'Wed', v: 48 },
  { day: 'Thu', v: 88 }, { day: 'Fri', v: 60 }, { day: 'Sat', v: 35 }, { day: 'Sun', v: 28 },
];

const RECS = [
  { icon: <Ban className="w-4 h-4 text-slate-500" />, title: 'Digital Distraction Filter', desc: '14:00 - 15:30の特定サイトへのアクセス制限を強化することを推奨します。', cta: '+18% Focus potential', color: 'text-blue-600' },
  { icon: <Coffee className="w-4 h-4 text-slate-500" />, title: 'Pre-emptive Breaks', desc: '現在の「32分」の壁を越えるために、25分毎に軽いストレッチを取り入れてください。', cta: '+12min Focus session', color: 'text-emerald-600' },
  { icon: <ListTodo className="w-4 h-4 text-slate-500" />, title: 'Task Prioritization', desc: '最も困難な「調査」タスクを、集中力の高い午前10時台に再配置してください。', cta: 'High Impact Change', color: 'text-amber-600' },
];

const CARD = { backgroundColor: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' };

export default function Insights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getInsights(), getTransitions()])
      .then(([ins, trans]) => { setInsights(ins); setTransitions(trans); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const patternInsight = insights.find(i => i.type === 'pattern');
  const timeInsight = insights.find(i => i.type === 'time_pattern');
  const focusInsight = insights.find(i => i.type === 'focus');
  const topTrans = transitions[0];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-slate-400 text-sm">Loading...</div></div>;

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-bold text-blue-500 tracking-widest mb-1.5">SILENT PARTNER AI</p>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Behavioral Insights</h1>
          <p className="text-[13px] text-slate-400 mt-1">行動分析に基づいたパーソナライズ・インサイト</p>
        </div>
        <div className="flex items-center space-x-2">
          <button className="flex items-center space-x-2 px-4 py-2 rounded-xl text-[13px] text-slate-600 hover:bg-slate-50 transition-colors" style={{ ...CARD, border: '1px solid #e2e8f0' }}>
            <Calendar className="w-4 h-4" /><span>Weekly</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-semibold transition-colors shadow-sm">
            <Download className="w-4 h-4" /><span>Export</span>
          </button>
        </div>
      </div>

      {/* High impact + Focus metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 p-6" style={CARD}>
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              <TrendingUp className="w-3 h-3" /><span>High Impact</span>
            </span>
            <span className="text-[11px] text-slate-400">Updated 2m ago</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2 leading-snug">
            {timeInsight?.message ?? '14時台にSNS利用が増加'}
          </h3>
          <p className="text-[13px] text-slate-500 leading-relaxed mb-4">
            午後の早い時間帯に、主要な業務からSNSへのコンテキストスイッチが頻繁に発生しています。このパターンは疲労の蓄積と相関しており、集中力の持続時間に影響を与えています。
          </p>
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#f8fafc' }}>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Actionable Strategy</p>
                <p className="text-[13px] text-slate-700 font-medium">13:45に5分間のマイクロ休憩をスケジュールする</p>
              </div>
            </div>
            <button className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 flex-shrink-0 ml-4">Apply Routine</button>
          </div>
        </div>

        <div className="p-5" style={CARD}>
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="w-4 h-4 text-emerald-500" />
            <p className="text-[13px] font-semibold text-slate-700">Focus Metrics</p>
          </div>
          <p className="text-4xl font-bold text-slate-900 tabular-nums">32分</p>
          <p className="text-[12px] text-slate-400 mt-1">平均集中時間</p>
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid #f1f5f9' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-slate-400">Previous Week</span>
              <span className="text-[12px] font-bold text-emerald-600">+4.2%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-1.5 bg-emerald-500 rounded-full" style={{ width: '74%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Behavioral trigger + Concentration */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-5" style={CARD}>
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <p className="text-[13px] font-bold text-red-500">Behavioral Trigger</p>
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-2 leading-snug">
            {patternInsight?.message ?? '調査開始後に動画サイトへ移動する傾向'}
          </h3>
          <p className="text-[13px] text-slate-500 leading-relaxed mb-4">
            ブラウザでの調査プロセス中に、YouTube等の動画プラットフォームへの遷移が72%の確率で発生しています。「情報のオーバーロード」が引き金となっている可能性があります。
          </p>
          {topTrans ? (
            <p className="text-[11px] text-slate-400">Trigger Point: <span className="font-medium text-slate-600">{topTrans.from} → {topTrans.to}</span></p>
          ) : (
            <p className="text-[11px] text-slate-300">遷移データがありません</p>
          )}
        </div>

        <div className="p-5" style={CARD}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[13px] font-semibold text-slate-800">Concentration Levels</p>
            <div className="flex items-center space-x-3 text-[11px] text-slate-400">
              <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-sm bg-blue-500 inline-block"/><span>Target</span></span>
              <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-sm bg-blue-200 inline-block"/><span>Actual</span></span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">過去7日間の集中度推移</p>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={CONC_DATA} barSize={16} barGap={4} margin={{top:0,right:0,bottom:0,left:0}}>
              <XAxis dataKey="day" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0,100]} />
              <Tooltip formatter={(v:number)=>[`${v}%`,'集中度']} contentStyle={{fontSize:11,borderRadius:10,border:'1px solid #e2e8f0',boxShadow:'0 4px 12px rgba(0,0,0,0.08)'}} />
              <ReferenceLine y={70} stroke="#dbeafe" strokeDasharray="4 4" />
              <Bar dataKey="v" radius={[3,3,0,0]}>
                {CONC_DATA.map((e,i)=><Cell key={i} fill={e.v>=70?'#2563eb':'#bfdbfe'}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recommendation Engine */}
      <div className="p-5" style={CARD}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[14px] font-bold text-slate-900">Recommendation Engine</p>
            <p className="text-[12px] text-slate-400 mt-0.5">AI suggested improvements for next week</p>
          </div>
          <span className="px-3 py-1 text-[11px] font-bold rounded-full" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>High Reliability (94%)</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {RECS.map((rec, i) => (
            <div key={i} className="p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/20 transition-all">
              <div className="flex items-center space-x-2 mb-2">{rec.icon}<p className="text-[13px] font-bold text-slate-800">{rec.title}</p></div>
              <p className="text-[12px] text-slate-500 leading-relaxed mb-3">{rec.desc}</p>
              <button className={`text-[12px] font-semibold ${rec.color} flex items-center space-x-0.5 hover:opacity-80`}>
                <span>{rec.cta}</span><ChevronRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Live focus insight if from API */}
      {focusInsight && (
        <div className="flex items-start space-x-3 p-4 rounded-2xl" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-[13px] text-blue-800 font-medium">{focusInsight.message}</p>
        </div>
      )}
    </div>
  );
}
