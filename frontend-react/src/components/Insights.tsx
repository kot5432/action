import { useEffect, useState } from 'react';
import { Lightbulb, TrendingUp, Clock, Repeat } from 'lucide-react';
import { getInsights } from '../lib/api';
import type { Insight } from '../types/api';

export default function Insights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getInsights();
        setInsights(data);
      } catch (error) {
        console.error('Failed to fetch insights:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'pattern':
        return <Repeat className="w-5 h-5" />;
      case 'time_pattern':
        return <Clock className="w-5 h-5" />;
      case 'focus':
        return <TrendingUp className="w-5 h-5" />;
      default:
        return <Lightbulb className="w-5 h-5" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3">
          <Lightbulb className="w-8 h-8 text-gray-900" />
          <h1 className="text-2xl font-semibold text-gray-900">インサイト</h1>
        </div>
        <p className="text-gray-500 mt-1">行動パターンから傾向を抽出</p>
      </div>

      {insights.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">まだデータがありません。データを収集してパターンを発見しましょう。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map((insight, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 bg-gray-100 p-2 rounded-lg">
                  <div className="text-gray-600">
                    {getIcon(insight.type)}
                  </div>
                </div>
                <div className="flex-grow">
                  <div className="text-sm text-gray-500 capitalize mb-1">
                    {insight.type.replace('_', ' ')}
                  </div>
                  <p className="text-gray-900">{insight.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
