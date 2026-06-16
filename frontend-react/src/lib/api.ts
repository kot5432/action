import type { DashboardData, TimelineEntry, Transition, StoryResponse, Insight, Categories } from '../types/api';

const API_BASE = '/api';

export async function getDashboard(): Promise<DashboardData> {
  const response = await fetch(`${API_BASE}/dashboard`);
  return response.json();
}

export async function getTimeline(date?: string): Promise<TimelineEntry[]> {
  const url = date ? `${API_BASE}/timeline?date=${date}` : `${API_BASE}/timeline`;
  const response = await fetch(url);
  return response.json();
}

export async function getTransitions(date?: string): Promise<Transition[]> {
  const url = date ? `${API_BASE}/transitions?date=${date}` : `${API_BASE}/transitions`;
  const response = await fetch(url);
  return response.json();
}

export async function getStory(date?: string): Promise<StoryResponse> {
  const url = date ? `${API_BASE}/story?date=${date}` : `${API_BASE}/story`;
  const response = await fetch(url);
  return response.json();
}

export async function getInsights(): Promise<Insight[]> {
  const response = await fetch(`${API_BASE}/insights`);
  return response.json();
}

export async function getCategories(): Promise<Categories> {
  const response = await fetch(`${API_BASE}/categories`);
  return response.json();
}
