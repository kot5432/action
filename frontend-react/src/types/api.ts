export interface DashboardData {
  current_app: string;
  current_service: string | null;
  current_category: string | null;
  session_start_time: string | null;
  session_duration_minutes: number;
  today_usage_minutes: number;
  switch_count: number;
}

export interface CurrentSession {
  app_name: string | null;
  service: string | null;
  category: string | null;
  started_at: string | null;
  duration_seconds: number;
}

export interface TimelineEntry {
  start: string;
  end: string;
  app: string;
  service: string | null;
  category: string | null;
  duration_seconds: number;
}

export interface Transition {
  from: string;
  to: string;
  from_category: string | null;
  to_category: string | null;
  count: number;
}

export interface StoryEntry {
  time: string;
  text: string;
  service: string | null;
  category: string | null;
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

export interface Category {
  id: number;
  name: string;
  color: string;
}

export interface CategoryCreate {
  name: string;
  color: string;
}

export interface CategoryUpdate {
  name?: string;
  color?: string;
}

export interface DailySummary {
  total_usage_minutes: number;
  switch_count: number;
  focus_sessions: number;
  top_services: {
    service: string;
    minutes: number;
  }[];
}

export interface ServiceUsage {
  service: string;
  category: string | null;
  minutes: number;
}

export interface CategoryUsage {
  category: string;
  minutes: number;
}

export interface HealthStatus {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  tracker: 'running' | 'stopped';
}

export interface PrivacySettings {
  enabled: boolean;
  masked_services: string[];
}

export interface RetentionSettings {
  retention_days: number;
}

export interface CategoryRule {
  id: number;
  service: string;
  category: string;
}

export interface CategoryRuleCreate {
  service: string;
  category: string;
}

export interface CategoryRuleUpdate {
  category: string;
}
