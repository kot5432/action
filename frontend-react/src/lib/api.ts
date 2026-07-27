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
  CategoryRule,
  CategoryRuleCreate,
  CategoryRuleUpdate,
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

export async function getCategoryRules(): Promise<CategoryRule[]> {
  const response = await fetch(`${API_BASE}/category-rules`);
  return response.json();
}

export async function createCategoryRule(rule: CategoryRuleCreate): Promise<{ success: boolean; id: number }> {
  const response = await fetch(`${API_BASE}/category-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule),
  });
  return response.json();
}

export async function updateCategoryRule(ruleId: number, rule: CategoryRuleUpdate): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/category-rules/${ruleId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule),
  });
  return response.json();
}

export async function deleteCategoryRule(ruleId: number): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/category-rules/${ruleId}`, {
    method: 'DELETE',
  });
  return response.json();
}

export async function getScores(date?: string): Promise<import('../types/api').ScoresData> {
  const url = date ? `${API_BASE}/scores?date=${date}` : `${API_BASE}/scores`;
  const response = await fetch(url);
  return response.json();
}

export async function getDailyStory(date?: string): Promise<import('../types/api').DailyStory> {
  const url = date ? `${API_BASE}/daily-story?date=${date}` : `${API_BASE}/daily-story`;
  const response = await fetch(url);
  return response.json();
}

export async function getSessionBlocks(date?: string): Promise<import('../types/api').SessionBlocksResponse> {
  const url = date ? `${API_BASE}/session-blocks?date=${date}` : `${API_BASE}/session-blocks`;
  const response = await fetch(url);
  return response.json();
}

export async function getTagUsageStats(date?: string): Promise<import('../types/api').TagUsageStats[]> {
  const url = date ? `${API_BASE}/tag-usage-stats?date=${date}` : `${API_BASE}/tag-usage-stats`;
  const response = await fetch(url);
  return response.json();
}

export async function getTags(): Promise<import('../types/api').Tag[]> {
  const response = await fetch(`${API_BASE}/tags`);
  return response.json();
}

export async function createTag(tag: import('../types/api').TagCreate): Promise<{ success: boolean; id: number }> {
  const response = await fetch(`${API_BASE}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tag),
  });
  return response.json();
}

export async function updateTag(tagId: number, tag: import('../types/api').TagUpdate): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/tags/${tagId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tag),
  });
  return response.json();
}

export async function deleteTag(tagId: number): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/tags/${tagId}`, {
    method: 'DELETE',
  });
  return response.json();
}

export async function getNotificationSettings(): Promise<import('../types/api').NotificationSettings> {
  const response = await fetch(`${API_BASE}/notification-settings`);
  return response.json();
}

export async function updateNotificationSettings(settings: import('../types/api').NotificationSettingsUpdate): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/notification-settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return response.json();
}
