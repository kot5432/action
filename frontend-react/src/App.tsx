import { useState } from 'react';
import { LayoutDashboard, Calendar, BookOpen, Lightbulb, BarChart2, Search, Settings as SettingsIcon, Bell, RefreshCw, PlusCircle, HelpCircle } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Timeline from './components/Timeline';
import Story from './components/Story';
import Insights from './components/Insights';
import Settings from './components/Settings';

type View = 'dashboard' | 'timeline' | 'story' | 'insights' | 'settings';

const navItems = [
  { id: 'dashboard' as View, label: 'ダッシュボード', icon: LayoutDashboard },
  { id: 'timeline'  as View, label: 'タイムライン',   icon: Calendar },
  { id: 'story'     as View, label: '行動ストーリー', icon: BookOpen },
  { id: 'insights'  as View, label: 'インサイト',     icon: Lightbulb },
];

const SIDEBAR_BG   = '#0a0c1d';
const SIDEBAR_BORDER = '#141828';
const ACTIVE_BG    = 'rgba(109,40,217,0.15)';
const ACTIVE_COLOR = '#a78bfa';
const INACTIVE_COLOR = '#5d6680';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#0d1025' }}>
      {/* Sidebar */}
      <aside style={{
        width: 200, flexShrink: 0,
        backgroundColor: SIDEBAR_BG,
        borderRight: `1px solid ${SIDEBAR_BORDER}`,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={18} color="#7c3aed" strokeWidth={2.5} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.02em' }}>ActionTracker</span>
          </div>
          <p style={{ fontSize: 11, color: '#3d4560', marginTop: 2, paddingLeft: 26 }}>インサイト・ハブ</p>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = currentView === id;
            return (
              <button
                key={id}
                onClick={() => setCurrentView(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: 'none', cursor: 'pointer',
                  width: '100%', textAlign: 'left',
                  backgroundColor: active ? ACTIVE_BG : 'transparent',
                  color: active ? ACTIVE_COLOR : INACTIVE_COLOR,
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  position: 'relative',
                  transition: 'all 0.15s',
                  boxShadow: active ? 'inset 2px 0 0 #7c3aed' : 'none',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
              >
                <Icon size={15} strokeWidth={active ? 2.5 : 2} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div style={{ padding: '12px 10px 8px', borderTop: `1px solid ${SIDEBAR_BORDER}` }}>
          <button
            onClick={() => setCurrentView('settings')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8,
              border: 'none', cursor: 'pointer',
              width: '100%', textAlign: 'left',
              backgroundColor: currentView === 'settings' ? ACTIVE_BG : 'transparent',
              color: currentView === 'settings' ? ACTIVE_COLOR : INACTIVE_COLOR,
              fontSize: 13, fontWeight: currentView === 'settings' ? 600 : 400,
              boxShadow: currentView === 'settings' ? 'inset 2px 0 0 #7c3aed' : 'none',
            }}
          >
            <SettingsIcon size={15} />
            <span>設定</span>
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 8,
            border: 'none', cursor: 'pointer',
            width: '100%', textAlign: 'left',
            backgroundColor: 'transparent',
            color: INACTIVE_COLOR, fontSize: 13,
          }}>
            <HelpCircle size={15} />
            <span>サポート</span>
          </button>
        </div>

        {/* CTA button */}
        <div style={{ padding: '12px 14px 20px' }}>
          <button style={{
            width: '100%', padding: '10px 0',
            background: 'linear-gradient(135deg, #6d28d9, #4f46e5)',
            border: 'none', borderRadius: 8,
            color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            boxShadow: '0 4px 12px rgba(109,40,217,0.4)',
          }}>
            <PlusCircle size={14} />
            新規分析
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{
          height: 52, flexShrink: 0,
          backgroundColor: '#0a0c1d',
          borderBottom: `1px solid ${SIDEBAR_BORDER}`,
          display: 'flex', alignItems: 'center',
          padding: '0 24px', gap: 12,
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <Search size={13} color="#3d4560" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="セッション、ツール、インサイトを検索..."
              style={{
                width: '100%', paddingLeft: 32, paddingRight: 12,
                height: 32, borderRadius: 6,
                border: '1px solid #1a1f35',
                backgroundColor: '#111428',
                color: '#8892b0', fontSize: 12,
                outline: 'none',
              }}
            />
          </div>
          <div style={{ flex: 1 }} />
          {/* Icons */}
          {[Bell, RefreshCw].map((Icon, i) => (
            <button key={i} style={{
              width: 32, height: 32, borderRadius: 6, border: 'none',
              backgroundColor: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#3d4560',
            }}>
              <Icon size={15} />
            </button>
          ))}
          {/* Avatar */}
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6d28d9, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: '#fff', fontWeight: 700, flexShrink: 0,
          }}>AT</div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'timeline'  && <Timeline />}
          {currentView === 'story'     && <Story />}
          {currentView === 'insights'  && <Insights />}
          {currentView === 'settings'  && <Settings />}
        </main>
      </div>
    </div>
  );
}
