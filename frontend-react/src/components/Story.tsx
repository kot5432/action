import { useEffect, useState } from 'react';
import { BookOpen, Calendar, AlertCircle } from 'lucide-react';
import { getStory } from '../lib/api';
import type { StoryResponse } from '../types/api';

export default function Story() {
  const [storyData, setStoryData] = useState<StoryResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const data = await getStory(selectedDate);
        setStoryData(data);
      } catch (error) {
        console.error('Failed to fetch story:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!storyData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Failed to load data</div>
      </div>
    );
  }

  const { story, total_drift_minutes } = storyData;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <BookOpen className="w-8 h-8 text-gray-900" />
            <h1 className="text-2xl font-semibold text-gray-900">今日のストーリー</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {total_drift_minutes > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">
                  推定離脱時間: {total_drift_minutes}分
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Story Feed */}
      {story.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">この日のデータはありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {story.map((entry, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-16 pt-1">
                  <span className="text-sm font-mono text-gray-500">{entry.time}</span>
                </div>
                <div className="flex-grow">
                  <p className="text-base text-gray-900">{entry.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
