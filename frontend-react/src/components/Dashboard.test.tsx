import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Dashboard from './Dashboard'

// APIモック
vi.mock('../lib/api', () => ({
  getDashboard: vi.fn(() => Promise.resolve({
    current_app: 'TestApp',
    current_service: 'test.com',
    current_category: '開発',
    session_start_time: '14:30:00',
    session_duration_minutes: 45,
    today_usage_minutes: 240,
    switch_count: 12
  })),
  getScores: vi.fn(() => Promise.resolve({
    date: '2026-07-28',
    total_minutes: 240,
    focus_minutes: 180,
    distract_minutes: 60,
    session_count: 8,
    derail_count: 2,
    return_rate: 0.75,
    score_focus: 85,
    score_derail: 70,
    productivity_index: 80
  })),
  getDailyStory: vi.fn(() => Promise.resolve({
    date: '2026-07-28',
    story: '今日は集中して作業できました',
    total_focus_minutes: 180,
    total_derail_count: 2,
    score: 85
  }))
}))

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dashboard component', async () => {
    render(<Dashboard />)
    // データがロードされるのを待つ
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('displays current app information', async () => {
    render(<Dashboard />)
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(screen.getByText('TestApp')).toBeInTheDocument()
  })

  it('displays usage statistics', async () => {
    render(<Dashboard />)
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(screen.getByText('240')).toBeInTheDocument()
  })
})
