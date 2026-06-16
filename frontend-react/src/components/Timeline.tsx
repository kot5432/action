import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { getTimeline } from '../lib/api';
import type { TimelineEntry } from '../types/api';

export default function Timeline() {
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const data = await getTimeline(selectedDate);
        setTimeline(data);
      } catch (error) {
        console.error('Failed to fetch timeline:', error);
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

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">タイムライン</h1>
            <p className="text-gray-500 mt-1">1日の行動履歴を時系列で表示</p>
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
      </div>

      {timeline.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">この日のデータはありません</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="space-y-2">
            {timeline.map((entry, index) => (
              <div
                key={index}
                className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-shrink-0 w-24 text-sm text-gray-600">
                  {entry.start} - {entry.end}
                </div>
                <div className="flex-grow">
                  <div className="font-medium text-gray-900">{entry.app}</div>
                  {entry.domain && (
                    <div className="text-sm text-gray-500">{entry.domain}</div>
                  )}
                </div>
                <div className="flex-shrink-0 text-sm text-gray-500">
                  {Math.floor(entry.duration_seconds / 60)}m {entry.duration_seconds % 60}s
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
