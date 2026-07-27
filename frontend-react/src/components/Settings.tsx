import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Shield, Clock, Plus, Trash2, Edit2, List } from 'lucide-react';
import {
  getCategoriesList,
  createCategory,
  updateCategory,
  deleteCategory,
  getPrivacy,
  updatePrivacy,
  getRetention,
  updateRetention,
  getCategoryRules,
  createCategoryRule,
  updateCategoryRule,
  deleteCategoryRule,
  getTags,
  createTag,
  updateTag,
  deleteTag,
  getNotificationSettings,
  updateNotificationSettings,
} from '../lib/api';
import type { Category, PrivacySettings, RetentionSettings, CategoryRule, Tag, NotificationSettings } from '../types/api';

export default function Settings() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [privacy, setPrivacy] = useState<PrivacySettings>({ enabled: true, masked_services: [] });
  const [retention, setRetention] = useState<RetentionSettings>({ retention_days: 90 });
  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState('');
  const [newRulePriority, setNewRulePriority] = useState(0);
  const [newRuleIsRegex, setNewRuleIsRegex] = useState(false);
  const [editingRule, setEditingRule] = useState<CategoryRule | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    id: 1,
    enabled: true,
    time: '09:00',
    last_sent: null,
    created_at: null,
    updated_at: null,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [cats, priv, ret, rules, tagsData, notifSettings] = await Promise.all([
          getCategoriesList().catch(() => []),
          getPrivacy().catch(() => ({ enabled: true, masked_services: [] })),
          getRetention().catch(() => ({ retention_days: 90 })),
          getCategoryRules().catch(() => []),
          getTags().catch(() => []),
          getNotificationSettings().catch(() => ({
            id: 1,
            enabled: true,
            time: '09:00',
            last_sent: null,
            created_at: null,
            updated_at: null,
          })),
        ]);
        setCategories(Array.isArray(cats) ? cats : []);
        setPrivacy(priv);
        setRetention(ret);
        setCategoryRules(Array.isArray(rules) ? rules : []);
        setTags(Array.isArray(tagsData) ? tagsData : []);
        setNotificationSettings(notifSettings);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        // デフォルト値を設定
        setCategories([]);
        setPrivacy({ enabled: true, masked_services: [] });
        setRetention({ retention_days: 90 });
        setCategoryRules([]);
        setTags([]);
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

  const handleAddRule = async () => {
    if (!newRulePattern.trim() || !newRuleCategory.trim()) return;
    try {
      await createCategoryRule({ 
        pattern: newRulePattern, 
        category: newRuleCategory,
        priority: newRulePriority,
        is_regex: newRuleIsRegex
      });
      const updated = await getCategoryRules();
      setCategoryRules(updated);
      setNewRulePattern('');
      setNewRuleCategory('');
      setNewRulePriority(0);
      setNewRuleIsRegex(false);
    } catch (error) {
      console.error('Failed to create category rule:', error);
    }
  };

  const handleUpdateRule = async (rule: CategoryRule) => {
    try {
      await updateCategoryRule(rule.id, { 
        pattern: rule.pattern,
        category: rule.category,
        priority: rule.priority,
        is_regex: rule.is_regex,
        enabled: rule.enabled
      });
      const updated = await getCategoryRules();
      setCategoryRules(updated);
      setEditingRule(null);
    } catch (error) {
      console.error('Failed to update category rule:', error);
    }
  };

  const handleDeleteRule = async (id: number) => {
    try {
      await deleteCategoryRule(id);
      const updated = await getCategoryRules();
      setCategoryRules(updated);
    } catch (error) {
      console.error('Failed to delete category rule:', error);
    }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    try {
      await createTag({ name: newTagName, color: newTagColor });
      const updated = await getTags();
      setTags(updated);
      setNewTagName('');
      setNewTagColor('#3B82F6');
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleUpdateTag = async (tag: Tag) => {
    try {
      await updateTag(tag.id, { name: tag.name, color: tag.color });
      const updated = await getTags();
      setTags(updated);
      setEditingTag(null);
    } catch (error) {
      console.error('Failed to update tag:', error);
    }
  };

  const handleDeleteTag = async (id: number) => {
    try {
      await deleteTag(id);
      const updated = await getTags();
      setTags(updated);
    } catch (error) {
      console.error('Failed to delete tag:', error);
    }
  };

  const handleUpdateNotificationSettings = async () => {
    try {
      await updateNotificationSettings({
        enabled: notificationSettings.enabled,
        time: notificationSettings.time,
      });
    } catch (error) {
      console.error('Failed to update notification settings:', error);
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

      {/* Category Rules Management */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <List className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">カテゴリルール管理</h2>
          </div>
        </div>

        {/* Add Rule */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={newRulePattern}
              onChange={(e) => setNewRulePattern(e.target.value)}
              placeholder="パターン（アプリ名または正規表現）"
              className="flex-grow px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <select
              value={newRuleCategory}
              onChange={(e) => setNewRuleCategory(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">カテゴリを選択</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="number"
              value={newRulePriority}
              onChange={(e) => setNewRulePriority(parseInt(e.target.value) || 0)}
              placeholder="優先度（数値が大きいほど優先）"
              className="w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={newRuleIsRegex}
                onChange={(e) => setNewRuleIsRegex(e.target.checked)}
                className="rounded"
              />
              <span>正規表現</span>
            </label>
            <button
              onClick={handleAddRule}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>追加</span>
            </button>
          </div>
        </div>

        {/* Rules List */}
        <div className="space-y-3">
          {categoryRules.map((rule) => (
            <div key={rule.id} className={`flex items-center justify-between p-3 rounded-lg ${rule.enabled ? 'bg-gray-50' : 'bg-gray-100 opacity-60'}`}>
              {editingRule?.id === rule.id ? (
                <div className="flex items-center space-x-3 flex-grow">
                  <input
                    type="text"
                    value={editingRule.pattern}
                    onChange={(e) => setEditingRule({ ...editingRule, pattern: e.target.value })}
                    className="flex-grow px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <select
                    value={editingRule.category}
                    onChange={(e) => setEditingRule({ ...editingRule, category: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={editingRule.priority}
                    onChange={(e) => setEditingRule({ ...editingRule, priority: parseInt(e.target.value) || 0 })}
                    className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <label className="flex items-center space-x-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={editingRule.is_regex}
                      onChange={(e) => setEditingRule({ ...editingRule, is_regex: e.target.checked })}
                      className="rounded"
                    />
                    <span>正規表現</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={editingRule.enabled}
                      onChange={(e) => setEditingRule({ ...editingRule, enabled: e.target.checked })}
                      className="rounded"
                    />
                    <span>有効</span>
                  </label>
                  <button
                    onClick={() => handleUpdateRule(editingRule)}
                    className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setEditingRule(null)}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-900 font-medium">{rule.pattern}</span>
                    {rule.is_regex && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">正規表現</span>
                    )}
                    <span className="text-gray-600">→</span>
                    <span className="text-gray-900">{rule.category}</span>
                    <span className="text-xs text-gray-500">優先度: {rule.priority}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingRule(rule)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {categoryRules.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              カテゴリルールがありません
            </div>
          )}
        </div>
      </div>

      {/* Tags Management */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <List className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">行動タグ管理</h2>
          </div>
        </div>

        {/* Add Tag */}
        <div className="flex items-center space-x-3 mb-6">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="新しいタグ名"
            className="flex-grow px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <input
            type="color"
            value={newTagColor}
            onChange={(e) => setNewTagColor(e.target.value)}
            className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
          />
          <button
            onClick={handleAddTag}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>追加</span>
          </button>
        </div>

        {/* Tags List */}
        <div className="space-y-3">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              {editingTag?.id === tag.id ? (
                <div className="flex items-center space-x-3 flex-grow">
                  <input
                    type="text"
                    value={editingTag.name}
                    onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                    className="flex-grow px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <input
                    type="color"
                    value={editingTag.color || '#3B82F6'}
                    onChange={(e) => setEditingTag({ ...editingTag, color: e.target.value })}
                    className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                  />
                  <button
                    onClick={() => handleUpdateTag(editingTag)}
                    className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setEditingTag(null)}
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
                      style={{ backgroundColor: tag.color || '#3B82F6' }}
                    />
                    <span className="text-gray-900">{tag.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingTag(tag)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {tags.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              行動タグがありません
            </div>
          )}
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">デイリーストーリー通知設定</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-900 font-medium">通知を有効にする</div>
              <div className="text-gray-500 text-sm">毎日の行動ストーリーを通知します</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.enabled}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-900 font-medium">通知時間</div>
              <div className="text-gray-500 text-sm">通知を送信する時間</div>
            </div>
            <input
              type="time"
              value={notificationSettings.time || '09:00'}
              onChange={(e) => setNotificationSettings({ ...notificationSettings, time: e.target.value })}
              disabled={!notificationSettings.enabled}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {notificationSettings.last_sent && (
            <div className="text-sm text-gray-500">
              最終送信: {new Date(notificationSettings.last_sent).toLocaleString('ja-JP')}
            </div>
          )}

          <button
            onClick={handleUpdateNotificationSettings}
            className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
          >
            設定を保存
          </button>
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
