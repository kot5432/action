import { useEffect, useState } from 'react';
import { TrendingUp, Zap, BarChart2, Calendar, Download, Clock, Ban, Coffee, ListTodo, ChevronRight, AlertTriangle } from 'lucide-react';
import { getInsights, getTransitions } from '../lib/api';
import type { Insight, Transition } from '../types/api';
import { BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';

const CONCENTRATION_DATA = [
  { day: 'Mon', target: 70, actual: 55 },
  { day: 'Tue', target: 70, actual: 72 },
  { day: 'Wed', target: 70, actual: 48 },
  { day: 'Thu', target: 70, actual: 88 },
  { day: 'Fri', target: 70, actual: 60 },
  { day: 'Sat', target: 70, actual: 35 },
  { day: 'Sun', target: 70, actual: 28 },
];

interface Recommendation {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
  ctaColor: string;
}

const RECOMMENDATIONS: Recommendation[] = [
  {
    icon: <Ban className="w-4 h-4 text-gray-500" />,
    title: 'Digital Distraction Filter',
    description: '14:00 - 15:30の特定サイトへのアクセス制限を強化することを推奨します。',
    cta: '+18% Focus potential',
    ctaColor: 'text-blue-600',
  },
  {
    icon: <Coffee className="w-4 h-4 text-gray-500" />,
    title: 'Pre-emptive Breaks',
    description: '現在の「32分」の壁を越えるために、25分毎に軽いストレッチを取り入れてください。',
    cta: '+12min Focus session',
    ctaColor: 'text-emerald-600',
  },
  {
    icon: <ListTodo className="w-4 h-4 text-gray-500" />,
    title: 'Task Prioritization',
    description: '最も困難な「調査」タスクを、集中力の高い午前10時台に再配置してください。',
    cta: 'High Impact Change',
    ctaColor: 'text-amber-600',
  },
];

export default function Insights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getInsights(), getTransitions()])
      .then(([ins, trans]) => {
        setInsights(ins);
        setTransitions(trans);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const patternInsight = insights.find(i => i.type === 'pattern');
  const timeInsight = insights.find(i => i.type === 'time_pattern');
  const focusInsight = insights.find(i => i.type === 'focus');
  const topTransition = transitions[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold text-blue-500 tracking-widest mb-1">SILENT PARTNER AI</p>
          <h1 className="text-3xl font-bold text-gray-900">Behavioral Insights</h1>
          <p className="text-sm text-gray-400 mt-0.5">行動分析に基づいたパーソナライズ・インサイト</p>
        </div>
        <div className="flex items-center space-x-2">
          <button className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <Calendar className="w-4 h-4" />
            <span>Weekly</span>
          </button>
          <button className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* High impact + Focus metrics */}
      <div className="grid grid-cols-3 gap-4">
        {/* High impact card */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full flex items-center space-x-1">
              <TrendingUp className="w-3 h-3" />
              <span>High Impact</span>
            </span>
            <span className="text-xs text-gray-400">Updated 2m ago</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {timeInsight?.message ?? '14時台にSNS利用が増加'}
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed mb-4">
            午後の早い時間帯に、主要な業務からSNSへのコンテキストスイッチが頻繁に発生しています。このパターンは疲労の蓄積と相関しており、集中力の持続時間に影響を与えています。
          </p>
          <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Zap className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Actionable Strategy</p>
                <p className="text-sm text-gray-700">13:45に5分間のマイクロ休憩をスケジュールする</p>
              </div>
            </div>
            <button className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex-shrink-0 ml-4">
              Apply Routine
            </button>
          </div>
        </div>

        {/* Focus metrics */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center space-x-2 mb-3">
            <Clock className="w-4 h-4 text-emerald-500" />
            <p className="text-sm font-medium text-gray-600">Focus Metrics</p>
          </div>
          <p className="text-4xl font-bold text-gray-900">32分</p>
          <p className="text-sm text-gray-400 mt-1">平均集中時間</p>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400">Previous Week</span>
              <span className="text-xs font-semibold text-emerald-600">+4.2%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full">
              <div className="h-1.5 bg-emerald-500 rounded-full" style={{ width: '74%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Behavioral trigger + Concentration levels */}
      <div className="grid grid-cols-2 gap-4">
        {/* Behavioral trigger */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <p className="text-sm font-semibold text-red-500">Behavioral Trigger</p>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {patternInsight?.message ?? '調査開始後に動画サイトへ移動する傾向'}
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed mb-3">
            ブラウザでの調査プロセス中に、YouTube等の動画プラットフォームへの遷移が72%の確率で発生しています。これは「情報のオーバーロード」が引き金となっている可能性があります。
          </p>
          {topTransition && (
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <span>Trigger Point:</span>
              <span className="font-medium text-gray-600">{topTransition.from} → {topTransition.to}</span>
            </div>
          )}
        </div>

        {/* Concentration levels chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-900">Concentration Levels</h3>
            <div className="flex items-center space-x-3 text-xs text-gray-400">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                <span>Target</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-blue-200 inline-block" />
                <span>Actual</span>
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-3">過去7日間の集中度推移</p>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={CONCENTRATION_DATA} barSize={16} barGap={4}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                formatter={(v: number, name: string) => [`${v}%`, name === 'actual' ? 'Actual' : 'Target']}
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <ReferenceLine y={70} stroke="#dbeafe" strokeDasharray="3 3" />
              <Bar dataKey="actual" radius={[3, 3, 0, 0]}>
                {CONCENTRATION_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.actual >= entry.target ? '#2563eb' : '#bfdbfe'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recommendation Engine */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Recommendation Engine</h3>
            <p className="text-xs text-gray-400 mt-0.5">AI suggested improvements for next week</p>
          </div>
          <span className="px-3 py-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full">
            High Reliability (94%)
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {RECOMMENDATIONS.map((rec, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4 hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
              <div className="flex items-center space-x-2 mb-2">
                {rec.icon}
                <p className="text-sm font-semibold text-gray-800">{rec.title}</p>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">{rec.description}</p>
              <button className={`text-xs font-semibold ${rec.ctaColor} flex items-center space-x-1 hover:opacity-80`}>
                <span>{rec.cta}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Focus insight if available */}
      {focusInsight && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start space-x-3">
          <BarChart2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">{focusInsight.message}</p>
        </div>
      )}
    </div>
  );
}
