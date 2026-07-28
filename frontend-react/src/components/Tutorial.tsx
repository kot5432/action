import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface TutorialStep {
  title: string;
  description: string;
  target?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: 'ActionTrackerへようこそ',
    description: 'ActionTrackerはあなたの行動パターンを可視化し、生産性向上を支援するツールです。',
  },
  {
    title: 'ダッシュボード',
    description: '現在の作業状況と今日の行動を一目で確認できます。リアルタイムで更新されます。',
    target: 'dashboard',
  },
  {
    title: 'タイムライン',
    description: '1日の行動を時系列で振り返ることができます。カテゴリ別に色分けされています。',
    target: 'timeline',
  },
  {
    title: '行動ストーリー',
    description: 'ログではなく「行動の流れ」として理解できる文章が生成されます。',
    target: 'story',
  },
  {
    title: 'インサイト',
    description: '改善につながる気づきをカード形式で提示します。',
    target: 'insights',
  },
  {
    title: '設定',
    description: 'カテゴリ、タグ、プライバシー設定などを管理できます。',
    target: 'settings',
  },
];

export default function Tutorial() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 初回アクセス時にチュートリアルを表示
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (!hasSeenTutorial) {
      setIsVisible(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('hasSeenTutorial', 'true');
  };

  if (!isVisible) return null;

  const step = tutorialSteps[currentStep];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: '#141828',
        borderRadius: 16,
        padding: 32,
        maxWidth: 500,
        width: '90%',
        border: '1px solid #2a2f45',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
      }}>
        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: index === currentStep ? '#7c3aed' : '#3d4560',
                }}
              />
            ))}
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#5d6680',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* コンテンツ */}
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>
          {step.title}
        </h2>
        <p style={{ fontSize: 15, color: '#8892b0', lineHeight: 1.6, marginBottom: 32 }}>
          {step.description}
        </p>

        {/* フッター */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            style={{
              background: 'none',
              border: 'none',
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              color: currentStep === 0 ? '#3d4560' : '#8892b0',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
            }}
          >
            <ChevronLeft size={16} />
            戻る
          </button>

          <div style={{ fontSize: 13, color: '#5d6680' }}>
            {currentStep + 1} / {tutorialSteps.length}
          </div>

          <button
            onClick={handleNext}
            style={{
              background: 'linear-gradient(135deg, #6d28d9, #4f46e5)',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {currentStep === tutorialSteps.length - 1 ? '完了' : '次へ'}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
