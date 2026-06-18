import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Shield, Clock, Plus, Trash2, Edit2 } from 'lucide-react';
import {
  getCategoriesList,
  createCategory,
  updateCategory,
  deleteCategory,
  getPrivacy,
  updatePrivacy,
  getRetention,
  updateRetention,
} from '../lib/api';
import type { Category, PrivacySettings, RetentionSettings } from '../types/api';

export default function Settings() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [privacy, setPrivacy] = useState<PrivacySettings>({ enabled: true, masked_services: [] });
  const [retention, setRetention] = useState<RetentionSettings>({ retention_days: 90 });
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [cats, priv, ret] = await Promise.all([
          getCategoriesList(),
          getPrivacy(),
          getRetention(),
        ]);
        setCategories(cats);
        setPrivacy(priv);
        setRetention(ret);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await createCategory({ name: newCategoryName, color: newCategoryColor });
      const updated = await getCategoriesList();
      setCategories(updated);
      setNewCategoryName('');
      setNewCategoryColor('#3B82F6');
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  const handleUpdateCategory = async (category: Category) => {
    try {
      await updateCategory(category.id, { name: category.name, color: category.color });
      const updated = await getCategoriesList();
      setCategories(updated);
      setEditingCategory(null);
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await deleteCategory(id);
      const updated = await getCategoriesList();
      setCategories(updated);
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const handleUpdatePrivacy = async () => {
    try {
      await updatePrivacy(privacy);
    } catch (error) {
      console.error('Failed to update privacy:', error);
    }
  };

  const handleUpdateRetention = async () => {
    try {
      await updateRetention(retention);
    } catch (error) {
      console.error('Failed to update retention:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3">
          <SettingsIcon className="w-8 h-8 text-gray-900" />
          <h1 className="text-2xl font-semibold text-gray-900">設定</h1>
        </div>
        <p className="text-gray-500 mt-1">カテゴリ、プライバシー、データ保持の設定</p>
      </div>

      {/* Category Management */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <SettingsIcon className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">カテゴリ管理</h2>
          </div>
        </div>

        {/* Add Category */}
        <div className="flex items-center space-x-3 mb-6">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="新しいカテゴリ名"
            className="flex-grow px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <input
            type="color"
            value={newCategoryColor}
            onChange={(e) => setNewCategoryColor(e.target.value)}
            className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
          />
          <button
            onClick={handleAddCategory}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>追加</span>
          </button>
        </div>

        {/* Category List */}
        <div className="space-y-3">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              {editingCategory?.id === category.id ? (
                <div className="flex items-center space-x-3 flex-grow">
                  <input
                    type="text"
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    className="flex-grow px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <input
                    type="color"
                    value={editingCategory.color}
                    onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                    className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                  />
                  <button
                    onClick={() => handleUpdateCategory(editingCategory)}
                    className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setEditingCategory(null)}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-gray-900">{category.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingCategory(category)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">プライバシー設定</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-900 font-medium">プライバシーモード</p>
              <p className="text-sm text-gray-500">機密サービスをマスクする</p>
            </div>
            <button
              onClick={() => setPrivacy({ ...privacy, enabled: !privacy.enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                privacy.enabled ? 'bg-gray-900' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  privacy.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-gray-900 font-medium mb-2">マスク対象サービス</p>
            <textarea
              value={privacy.masked_services.join('\n')}
              onChange={(e) => setPrivacy({ ...privacy, masked_services: e.target.value.split('\n').filter(s => s.trim()) })}
              placeholder="1行につき1つのサービス名"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              rows={4}
            />
          </div>

          <button
            onClick={handleUpdatePrivacy}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
          >
            保存
          </button>
        </div>
      </div>

      {/* Retention Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">データ保持設定</h2>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-gray-900 font-medium mb-2">保存期間</p>
            <select
              value={retention.retention_days}
              onChange={(e) => setRetention({ retention_days: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value={30}>30日</option>
              <option value={90}>90日</option>
              <option value={365}>365日</option>
              <option value={0}>無期限</option>
            </select>
          </div>

          <button
            onClick={handleUpdateRetention}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
