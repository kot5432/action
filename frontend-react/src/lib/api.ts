import type {
  DashboardData,
  CurrentSession,
  TimelineEntry,
  Transition,
  StoryResponse,
  Insight,
  Categories,
  Category,
  CategoryCreate,
  CategoryUpdate,
  DailySummary,
  ServiceUsage,
  CategoryUsage,
  HealthStatus,
  PrivacySettings,
  RetentionSettings,
} from '../types/api';

const API_BASE = '/api';

export async function getDashboard(): Promise<DashboardData> {
  const response = await fetch(`${API_BASE}/dashboard`);
  return response.json();
}

export async function getCurrent(): Promise<CurrentSession> {
  const response = await fetch(`${API_BASE}/current`);
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

export async function getCategoriesList(): Promise<Category[]> {
  const response = await fetch(`${API_BASE}/categories`);
  return response.json();
}

export async function createCategory(category: CategoryCreate): Promise<{ success: boolean; id: number }> {
  const response = await fetch(`${API_BASE}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(category),
  });
  return response.json();
}

export async function updateCategory(categoryId: number, category: CategoryUpdate): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/categories/${categoryId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(category),
  });
  return response.json();
}

export async function deleteCategory(categoryId: number): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/categories/${categoryId}`, {
    method: 'DELETE',
  });
  return response.json();
}

export async function getSummary(date?: string): Promise<DailySummary> {
  const url = date ? `${API_BASE}/summary?date=${date}` : `${API_BASE}/summary`;
  const response = await fetch(url);
  return response.json();
}

export async function getServices(range: string = 'today'): Promise<ServiceUsage[]> {
  const response = await fetch(`${API_BASE}/services?range=${range}`);
  return response.json();
}

export async function getCategoriesUsage(range: string = 'today'): Promise<CategoryUsage[]> {
  const response = await fetch(`${API_BASE}/categories/usage?range=${range}`);
  return response.json();
}

export async function getHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE}/health`);
  return response.json();
}

export async function getPrivacy(): Promise<PrivacySettings> {
  const response = await fetch(`${API_BASE}/privacy`);
  return response.json();
}

export async function updatePrivacy(settings: PrivacySettings): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/privacy`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return response.json();
}

export async function getRetention(): Promise<RetentionSettings> {
  const response = await fetch(`${API_BASE}/settings/retention`);
  return response.json();
}

export async function updateRetention(settings: RetentionSettings): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/settings/retention`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return response.json();
}
