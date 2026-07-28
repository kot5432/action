import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Calendar, TrendingUp, Clock, Activity } from 'lucide-react';

interface DailySummary {
  date: string;
  total_minutes: number;
  session_count: number;
}

interface WeeklyReport {
  period: {
    start_date: string;
    end_date: string;
  };
  summary: {
    total_minutes: number;
    active_days: number;
    session_count: number;
    avg_daily_minutes: number;
  };
  daily_summaries: DailySummary[];
  top_services: Array<{
    service: string;
    total_minutes: number;
  }>;
}

export default function WeeklyReport() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyReport();
  }, []);

  const fetchWeeklyReport = async () => {
    try {
      const response = await fetch('/api/weekly-report');
      const data = await response.json();
      setReport(data);
    } catch (error) {
      console.error('Failed to fetch weekly report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ color: '#8892b0', textAlign: 'center', padding: 40 }}>読み込み中...</div>;
  }

  if (!report) {
    return <div style={{ color: '#8892b0', textAlign: 'center', padding: 40 }}>データがありません</div>;
  }

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', marginBottom: 24 }}>
        週次レポート
      </h2>

      {/* 週次サマリー */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: 16, 
        marginBottom: 32 
      }}>
        <div style={{
          background: '#141828',
          padding: 20,
          borderRadius: 12,
          border: '1px solid #1a1f35'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Clock size={16} color="#7c3aed" />
            <span style={{ fontSize: 12, color: '#5d6680' }}>総利用時間</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#e2e8f0' }}>
            {Math.floor(report.summary.total_minutes / 60)}h {report.summary.total_minutes % 60}m
          </div>
        </div>

        <div style={{
          background: '#141828',
          padding: 20,
          borderRadius: 12,
          border: '1px solid #1a1f35'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Activity size={16} color="#7c3aed" />
            <span style={{ fontSize: 12, color: '#5d6680' }}>アクティブ日数</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#e2e8f0' }}>
            {report.summary.active_days}日
          </div>
        </div>

        <div style={{
          background: '#141828',
          padding: 20,
          borderRadius: 12,
          border: '1px solid #1a1f35'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <TrendingUp size={16} color="#7c3aed" />
            <span style={{ fontSize: 12, color: '#5d6680' }}>平均利用時間</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#e2e8f0' }}>
            {Math.floor(report.summary.avg_daily_minutes / 60)}h {report.summary.avg_daily_minutes % 60}m
          </div>
        </div>
      </div>

      {/* 日次利用時間チャート */}
      <div style={{ background: '#141828', padding: 24, borderRadius: 12, marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0', marginBottom: 16 }}>
          日次利用時間
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={report.daily_summaries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1f35" />
            <XAxis 
              dataKey="date" 
              stroke="#5d6680"
              tickFormatter={(value) => value.slice(5)}
            />
            <YAxis stroke="#5d6680" />
            <Tooltip 
              contentStyle={{ background: '#1a1f35', border: '1px solid #2a2f45' }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Bar dataKey="total_minutes" fill="#7c3aed" name="利用時間(分)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* トップサービス */}
      <div style={{ background: '#141828', padding: 24, borderRadius: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0', marginBottom: 16 }}>
          トップサービス
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={report.top_services} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1f35" />
            <XAxis type="number" stroke="#5d6680" />
            <YAxis dataKey="service" type="category" width={150} stroke="#5d6680" />
            <Tooltip 
              contentStyle={{ background: '#1a1f35', border: '1px solid #2a2f45' }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Bar dataKey="total_minutes" fill="#3b82f6" name="利用時間(分)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
