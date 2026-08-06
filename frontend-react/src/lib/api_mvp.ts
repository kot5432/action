const API_BASE = '/api';

// 統一的なエラーハンドリング
async function fetchWithErrorHandling(url: string, options?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.detail || `HTTP ${response.status}`);
    }
    
    return response;
  } catch (error) {
    console.error(`API Error [${url}]:`, error);
    throw error;
  }
}

// ダッシュボード
export async function getDashboard() {
  const response = await fetchWithErrorHandling(`${API_BASE}/dashboard`);
  return response.json();
}

// タイムライン
export async function getTimeline(date?: string) {
  const url = date ? `${API_BASE}/timeline?date=${date}` : `${API_BASE}/timeline`;
  const response = await fetchWithErrorHandling(url);
  return response.json();
}

// カテゴリ一覧
export async function getCategories() {
  const response = await fetchWithErrorHandling(`${API_BASE}/categories`);
  return response.json();
}

// カテゴリ作成
export async function createCategory(name: string, color: string) {
  const response = await fetchWithErrorHandling(`${API_BASE}/categories?name=${name}&color=${color}`, {
    method: 'POST',
  });
  return response.json();
}

// カテゴリ更新
export async function updateCategory(categoryId: number, name?: string, color?: string) {
  const params = new URLSearchParams();
  if (name) params.append('name', name);
  if (color) params.append('color', color);
  
  const response = await fetchWithErrorHandling(`${API_BASE}/categories/${categoryId}?${params}`, {
    method: 'PUT',
  });
  return response.json();
}

// カテゴリ削除
export async function deleteCategory(categoryId: number) {
  const response = await fetchWithErrorHandling(`${API_BASE}/categories/${categoryId}`, {
    method: 'DELETE',
  });
  return response.json();
}
