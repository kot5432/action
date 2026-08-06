import { useState, lazy, Suspense } from 'react';
import { LayoutDashboard, Calendar, Settings as SettingsIcon, BarChart2 } from 'lucide-react';

// 遅延読み込みでコンポーネントを分割
const Dashboard = lazy(() => import('./components/Dashboard_mvp'));
const Timeline = lazy(() => import('./components/Timeline_mvp'));
const Settings = lazy(() => import('./components/Settings_mvp'));

type View = 'dashboard' | 'timeline' | 'settings';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  const navItems = [
    { id: 'dashboard' as View, label: 'ダッシュボード', icon: LayoutDashboard },
    { id: 'timeline'  as View, label: 'タイムライン',   icon: Calendar },
  ];

  const SIDEBAR_BG   = '#0a0c1d';
  const SIDEBAR_BORDER = '#141828';
  const ACTIVE_BG    = 'rgba(109,40,217,0.15)';
  const ACTIVE_COLOR = '#a78bfa';
  const INACTIVE_COLOR = '#5d6680';

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
          <p style={{ fontSize: 11, color: '#3d4560', marginTop: 2, paddingLeft: 26 }}>MVP</p>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 2 }} role="navigation" aria-label="メインナビゲーション">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = currentView === id;
            return (
              <button
                key={id}
                onClick={() => setCurrentView(id)}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
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
        <div style={{ padding: '12px 10px 20px', borderTop: `1px solid ${SIDEBAR_BORDER}` }} role="group" aria-label="設定">
          <button
            onClick={() => setCurrentView('settings')}
            aria-label="設定"
            aria-current={currentView === 'settings' ? 'page' : undefined}
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
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Content */}
        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <Suspense fallback={<div style={{ color: '#8892b0', textAlign: 'center', padding: 40 }}>読み込み中...</div>}>
            {currentView === 'dashboard' && <Dashboard />}
            {currentView === 'timeline'  && <Timeline />}
            {currentView === 'settings'  && <Settings />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
