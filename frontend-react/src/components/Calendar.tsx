import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
}

export default function Calendar({ selectedDate, onDateSelect }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const selectedDateObj = new Date(selectedDate);
  selectedDateObj.setHours(0, 0, 0, 0);
  
  const days = [];
  
  // 空白セル（月の初めの前）
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  
  // 日付セル
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    date.setHours(0, 0, 0, 0);
    days.push(date);
  }
  
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };
  
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };
  
  const formatDate = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  
  return (
    <div style={{
      backgroundColor: '#131629',
      border: '1px solid #1a2040',
      borderRadius: 12,
      padding: 16,
      minWidth: 280,
    }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button
          onClick={prevMonth}
          style={{
            width: 28, height: 28,
            borderRadius: 6,
            border: '1px solid #1a2040',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#5d6680',
          }}
        >
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>
          {currentMonth.getFullYear()}年 {monthNames[currentMonth.getMonth()]}
        </span>
        <button
          onClick={nextMonth}
          style={{
            width: 28, height: 28,
            borderRadius: 6,
            border: '1px solid #1a2040',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#5d6680',
          }}
        >
          <ChevronRight size={14} />
        </button>
      </div>
      
      {/* 曜日ヘッダー */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
        {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
          <div key={day} style={{ fontSize: 11, fontWeight: 600, color: '#3d4560', textAlign: 'center' }}>
            {day}
          </div>
        ))}
      </div>
      
      {/* 日付グリッド */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {days.map((date, index) => {
          if (!date) {
            return <div key={index} style={{ height: 32 }} />;
          }
          
          const isToday = date.getTime() === today.getTime();
          const isSelected = date.getTime() === selectedDateObj.getTime();
          const isSunday = date.getDay() === 0;
          const isSaturday = date.getDay() === 6;
          
          return (
            <button
              key={index}
              onClick={() => onDateSelect(formatDate(date))}
              style={{
                height: 32,
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
                backgroundColor: isSelected ? '#6d28d9' : isToday ? '#1a2040' : 'transparent',
                color: isSelected ? '#fff' : isSunday ? '#ef4444' : isSaturday ? '#3b82f6' : '#8892b0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1a2040';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected && !isToday) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                }
              }}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
