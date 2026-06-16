export interface DashboardData {
  current_app: string;
  current_domain: string | null;
  session_start_time: string | null;
  session_duration_minutes: number;
  today_usage_minutes: number;
  switch_count: number;
}

export interface TimelineEntry {
  start: string;
  end: string;
  app: string;
  domain: string | null;
  duration_seconds: number;
}

export interface Transition {
  from: string;
  to: string;
  count: number;
}

export interface StoryEntry {
  time: string;
  text: string;
}

export interface StoryResponse {
  story: StoryEntry[];
  total_drift_minutes: number;
}

export interface Insight {
  type: string;
  message: string;
}

export interface Categories {
  [category: string]: string;
}
