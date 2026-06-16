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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center space-x-2">
            <BarChart2 className="w-5 h-5 text-blue-600" />
            <span className="text-base font-bold text-gray-900">ActionTracker</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 ml-7">Silent Partner</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setCurrentView(id)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                currentView === id
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{label}</span>
              {currentView === id && (
                <div className="ml-auto w-0.5 h-4 bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </nav>

        {/* View Reports button */}
        <div className="p-4">
          <button className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors">
            <BarChart2 className="w-4 h-4" />
            <span>View Reports</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="アクティビティを検索..."
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4 ml-4">
            <div className="flex items-center space-x-1.5 text-sm font-medium text-red-500">
              <Circle className="w-2.5 h-2.5 fill-red-500 animate-pulse" />
              <span>Recording</span>
            </div>
          </div>
        </header>

        {/* Page content */}
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
