import { useEffect, useState } from 'react';
import { Lightbulb, TrendingUp, Clock, Repeat, AlertTriangle, Tag } from 'lucide-react';
import { getInsights, getTagUsageStats } from '../lib/api';
import type { Insight, TagUsageStats } from '../types/api';

export default function Insights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [tagStats, setTagStats] = useState<TagUsageStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [insightsData, tagStatsData] = await Promise.all([
          getInsights().catch(() => []),
          getTagUsageStats().catch(() => [])
        ]);
        setInsights(Array.isArray(insightsData) ? insightsData : []);
        setTagStats(Array.isArray(tagStatsData) ? tagStatsData : []);
      } catch (error) {
        console.error('Failed to fetch insights:', error);
        setInsights([]);
        setTagStats([]);
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
      case 'transition':
        return <Repeat className="w-5 h-5" />;
      case 'time_pattern':
        return <Clock className="w-5 h-5" />;
      case 'focus':
        return <TrendingUp className="w-5 h-5" />;
      case 'derail':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Lightbulb className="w-5 h-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'danger':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  // カテゴリ別にグループ化
  const groupedInsights = insights.reduce((acc, insight) => {
    if (!acc[insight.category]) {
      acc[insight.category] = [];
    }
    acc[insight.category].push(insight);
    return acc;
  }, {} as Record<string, Insight[]>);

  return (
    <div className="max-w-6xl mx-auto">
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
        <div className="space-y-6">
          {Object.entries(groupedInsights).map(([category, categoryInsights]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryInsights.map((insight, index) => (
                  <div
                    key={`${category}-${index}`}
                    className={`bg-white border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow ${getSeverityColor(insight.severity).split(' ')[1]}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`flex-shrink-0 p-2 rounded-lg ${getSeverityColor(insight.severity)}`}>
                        <div className="text-current">
                          {getIcon(insight.type)}
                        </div>
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${getSeverityColor(insight.severity)}`}>
                            {insight.severity}
                          </span>
                          <span className="text-xs text-gray-500 capitalize">
                            {insight.type.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-gray-900 font-medium mb-2">{insight.message}</p>
                        
                        {/* 原因分析表示 */}
                        {insight.data && Object.keys(insight.data).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs font-semibold text-gray-700 mb-2">原因分析</p>
                            <div className="space-y-1">
                              {insight.data.cause && (
                                <p className="text-xs text-gray-600">
                                  <span className="font-medium">原因:</span> {insight.data.cause}
                                </p>
                              )}
                              {insight.data.transition_services && (
                                <p className="text-xs text-gray-600">
                                  <span className="font-medium">遷移先:</span> {insight.data.transition_services}
                                </p>
                              )}
                              {insight.data.average_duration && (
                                <p className="text-xs text-gray-600">
                                  <span className="font-medium">平均滞在:</span> {Math.round(insight.data.average_duration / 60)}分
                                </p>
                              )}
                              {insight.data.return_rate && (
                                <p className="text-xs text-gray-600">
                                  <span className="font-medium">復帰率:</span> {insight.data.return_rate}%
                                </p>
                              )}
                              {insight.data.time_range && (
                                <p className="text-xs text-gray-600">
                                  <span className="font-medium">時間帯:</span> {insight.data.time_range}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tag Usage Stats */}
      {tagStats.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">タグ別使用統計</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tagStats.map((stat, index) => (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 p-2 rounded-lg bg-blue-50">
                    <Tag className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center space-x-2 mb-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stat.color || '#3B82F6' }}
                      />
                      <span className="text-gray-900 font-medium">{stat.name}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      使用回数: {stat.usage_count}回
                    </div>
                    <div className="text-sm text-gray-600">
                      総時間: {Math.round(stat.total_duration / 60)}分
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
