import { useState, lazy, Suspense } from 'react';
import { LayoutDashboard, Calendar, BookOpen, Lightbulb, BarChart2, Search, Settings as SettingsIcon, Bell, RefreshCw, PlusCircle, HelpCircle, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './i18n/config';

// 遅延読み込みでコンポーネントを分割
const Dashboard = lazy(() => import('./components/Dashboard'));
const Timeline = lazy(() => import('./components/Timeline'));
const Story = lazy(() => import('./components/Story'));
const Insights = lazy(() => import('./components/Insights'));
const Settings = lazy(() => import('./components/Settings'));

type View = 'dashboard' | 'timeline' | 'story' | 'insights' | 'settings';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const { t, i18n } = useTranslation();

  const navItems = [
    { id: 'dashboard' as View, label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'timeline'  as View, label: t('nav.timeline'),   icon: Calendar },
    { id: 'story'     as View, label: t('nav.story'),     icon: BookOpen },
    { id: 'insights'  as View, label: t('nav.insights'),  icon: Lightbulb },
  ];

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

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
          <p style={{ fontSize: 11, color: '#3d4560', marginTop: 2, paddingLeft: 26 }}>インサイト・ハブ</p>
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
        <div style={{ padding: '12px 10px 8px', borderTop: `1px solid ${SIDEBAR_BORDER}` }} role="group" aria-label="設定とサポート">
          <button
            onClick={() => setCurrentView('settings')}
            aria-label={t('nav.settings')}
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
            <span>{t('nav.settings')}</span>
          </button>
          <button
            onClick={() => changeLanguage(i18n.language === 'ja' ? 'en' : 'ja')}
            aria-label={i18n.language === 'ja' ? '英語に切り替え' : '日本語に切り替え'}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8,
              border: 'none', cursor: 'pointer',
              width: '100%', textAlign: 'left',
              backgroundColor: 'transparent',
              color: INACTIVE_COLOR, fontSize: 13,
            }}
          >
            <Globe size={15} />
            <span>{i18n.language === 'ja' ? 'English' : '日本語'}</span>
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 8,
            border: 'none', cursor: 'pointer',
            width: '100%', textAlign: 'left',
            backgroundColor: 'transparent',
            color: INACTIVE_COLOR, fontSize: 13,
          }}
          aria-label={t('nav.support')}>
            <HelpCircle size={15} />
            <span>{t('nav.support')}</span>
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
          <Suspense fallback={<div style={{ color: '#8892b0', textAlign: 'center', padding: 40 }}>読み込み中...</div>}>
            {currentView === 'dashboard' && <Dashboard />}
            {currentView === 'timeline'  && <Timeline />}
            {currentView === 'story'     && <Story />}
            {currentView === 'insights'  && <Insights />}
            {currentView === 'settings'  && <Settings />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
