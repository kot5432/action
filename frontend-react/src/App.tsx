import { useState } from 'react';
import { BookOpen, Home, Calendar, Lightbulb, BarChart3 } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Timeline from './components/Timeline';
import Story from './components/Story';
import Insights from './components/Insights';

type View = 'dashboard' | 'timeline' | 'story' | 'insights';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  const navItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: Home },
    { id: 'timeline' as View, label: 'Timeline', icon: Calendar },
    { id: 'story' as View, label: 'Story', icon: BookOpen },
    { id: 'insights' as View, label: 'Insights', icon: Lightbulb },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-6 h-6 text-gray-900" />
              <h1 className="text-lg font-semibold text-gray-900">ActionTracker</h1>
            </div>
            <nav className="flex space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      currentView === item.id
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'timeline' && <Timeline />}
        {currentView === 'story' && <Story />}
        {currentView === 'insights' && <Insights />}
      </main>
    </div>
  );
}

export default App;
