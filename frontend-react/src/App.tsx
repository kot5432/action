import { useState } from 'react';
import { LayoutDashboard, Calendar, BookOpen, Lightbulb, BarChart2, Circle, Search } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Timeline from './components/Timeline';
import Story from './components/Story';
import Insights from './components/Insights';

type View = 'dashboard' | 'timeline' | 'story' | 'insights';

const navItems = [
  { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'timeline' as View, label: 'Timeline', icon: Calendar },
  { id: 'story' as View, label: 'Story', icon: BookOpen },
  { id: 'insights' as View, label: 'Insights', icon: Lightbulb },
];

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#f8fafc' }}>
      {/* Sidebar */}
      <aside className="w-52 bg-white flex flex-col flex-shrink-0" style={{ boxShadow: '1px 0 0 #e2e8f0' }}>
        {/* Logo */}
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center space-x-2">
            <BarChart2 className="w-5 h-5 text-blue-600" strokeWidth={2.5} />
            <span className="text-[15px] font-bold text-gray-900 tracking-tight">ActionTracker</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5 ml-7">Silent Partner</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = currentView === id;
            return (
              <button
                key={id}
                onClick={() => setCurrentView(id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-[13px] transition-all relative ${
                  active
                    ? 'bg-blue-50 text-blue-600 font-semibold'
                    : 'text-gray-500 hover:bg-slate-50 hover:text-gray-700'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-blue-600' : 'text-gray-400'}`} strokeWidth={active ? 2.5 : 2} />
                <span>{label}</span>
                {active && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-600 rounded-l-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* View Reports */}
        <div className="p-4">
          <button className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold py-2.5 px-4 rounded-xl transition-colors shadow-sm">
            <BarChart2 className="w-4 h-4" />
            <span>View Reports</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white px-6 py-3 flex items-center justify-between flex-shrink-0" style={{ boxShadow: '0 1px 0 #e2e8f0' }}>
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="アクティビティを検索..."
                className="w-full pl-8 pr-4 py-1.5 text-[13px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 focus:bg-white transition-all"
              />
            </div>
          </div>
          <div className="flex items-center space-x-3 ml-4">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-100">
              <Circle className="w-2 h-2 fill-red-500 text-red-500 animate-pulse" />
              <span className="text-[12px] font-semibold text-red-500">Recording</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'timeline' && <Timeline />}
          {currentView === 'story' && <Story />}
          {currentView === 'insights' && <Insights />}
        </main>
      </div>
    </div>
  );
}
