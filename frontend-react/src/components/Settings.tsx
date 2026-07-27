import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Shield, Clock, Plus, Trash2, Edit2, List, Bell, Tag } from 'lucide-react';
import {
  getCategoriesList, createCategory, updateCategory, deleteCategory,
  getPrivacy, updatePrivacy, getRetention, updateRetention,
  getCategoryRules, createCategoryRule, updateCategoryRule, deleteCategoryRule,
  getTags, createTag, updateTag, deleteTag,
  getNotificationSettings, updateNotificationSettings,
} from '../lib/api';
import type { Category, PrivacySettings, RetentionSettings, CategoryRule, Tag as TagType, NotificationSettings } from '../types/api';

// ── スタイル定数 ─────────────────────────────────────────────
const CARD  = { backgroundColor:'#131629', border:'1px solid #1a2040', borderRadius:12 };
const INPUT = {
  width:'100%', padding:'8px 12px',
  backgroundColor:'#0d1025', border:'1px solid #1a2040',
  borderRadius:8, color:'#8892b0', fontSize:12, outline:'none',
} as const;
const BTN_PRIMARY = {
  display:'flex', alignItems:'center', gap:6,
  padding:'7px 14px', borderRadius:8,
  backgroundColor:'#6d28d9', border:'none',
  color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer',
} as const;
const BTN_GHOST = {
  padding:'6px 10px', borderRadius:6, border:'1px solid #1a2040',
  backgroundColor:'transparent', color:'#5d6680', fontSize:12, cursor:'pointer',
} as const;

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div style={{ ...CARD, overflow:'hidden', marginBottom:16 }}>
      <div style={{ padding:'14px 20px', borderBottom:'1px solid #1a2040', display:'flex', alignItems:'center', gap:8 }}>
        <Icon size={14} color="#5d6680" />
        <span style={{ fontSize:13, fontWeight:700, color:'#e2e8f0' }}>{title}</span>
      </div>
      <div style={{ padding:'18px 20px' }}>{children}</div>
    </div>
  );
}

export default function Settings() {
  const [categories,           setCategories]           = useState<Category[]>([]);
  const [privacy,              setPrivacy]              = useState<PrivacySettings>({ enabled:true, masked_services:[] });
  const [retention,            setRetention]            = useState<RetentionSettings>({ retention_days:90 });
  const [categoryRules,        setCategoryRules]        = useState<CategoryRule[]>([]);
  const [tags,                 setTags]                 = useState<TagType[]>([]);
  const [notifSettings,        setNotifSettings]        = useState<NotificationSettings>({ id:1, enabled:true, time:'09:00', last_sent:null, created_at:null, updated_at:null });
  const [loading,              setLoading]              = useState(true);

  // Category form
  const [newCatName,  setNewCatName]  = useState('');
  const [newCatColor, setNewCatColor] = useState('#6d28d9');
  const [editingCat,  setEditingCat]  = useState<Category | null>(null);

  // Rule form
  const [newRulePattern,  setNewRulePattern]  = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState('');
  const [newRulePriority, setNewRulePriority] = useState(0);
  const [newRuleIsRegex,  setNewRuleIsRegex]  = useState(false);
  const [editingRule,     setEditingRule]     = useState<CategoryRule | null>(null);

  // Tag form
  const [newTagName,  setNewTagName]  = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [editingTag,  setEditingTag]  = useState<TagType | null>(null);

  useEffect(() => {
    Promise.all([
      getCategoriesList().catch(()=>[]),
      getPrivacy().catch(()=>({ enabled:true, masked_services:[] })),
      getRetention().catch(()=>({ retention_days:90 })),
      getCategoryRules().catch(()=>[]),
      getTags().catch(()=>[]),
      getNotificationSettings().catch(()=>({ id:1, enabled:true, time:'09:00', last_sent:null, created_at:null, updated_at:null })),
    ]).then(([cats, priv, ret, rules, ts, notif]) => {
      setCategories(Array.isArray(cats) ? cats : []);
      setPrivacy(priv);
      setRetention(ret);
      setCategoryRules(Array.isArray(rules) ? rules : []);
      setTags(Array.isArray(ts) ? ts : []);
      setNotifSettings(notif);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Category handlers
  const addCategory    = async () => { if (!newCatName.trim()) return; await createCategory({ name:newCatName, color:newCatColor }); setCategories(await getCategoriesList()); setNewCatName(''); };
  const saveCategory   = async (c: Category) => { await updateCategory(c.id, { name:c.name, color:c.color }); setCategories(await getCategoriesList()); setEditingCat(null); };
  const removeCat      = async (id: number) => { await deleteCategory(id); setCategories(await getCategoriesList()); };

  // Rule handlers
  const addRule    = async () => { if (!newRulePattern.trim() || !newRuleCategory.trim()) return; await createCategoryRule({ pattern:newRulePattern, category:newRuleCategory, priority:newRulePriority, is_regex:newRuleIsRegex }); setCategoryRules(await getCategoryRules()); setNewRulePattern(''); setNewRuleCategory(''); };
  const saveRule   = async (r: CategoryRule) => { await updateCategoryRule(r.id, { pattern:r.pattern, category:r.category, priority:r.priority, is_regex:r.is_regex, enabled:r.enabled }); setCategoryRules(await getCategoryRules()); setEditingRule(null); };
  const removeRule = async (id: number) => { await deleteCategoryRule(id); setCategoryRules(await getCategoryRules()); };

  // Tag handlers
  const addTag    = async () => { if (!newTagName.trim()) return; await createTag({ name:newTagName, color:newTagColor }); setTags(await getTags()); setNewTagName(''); };
  const saveTag   = async (t: TagType) => { await updateTag(t.id, { name:t.name, color:t.color }); setTags(await getTags()); setEditingTag(null); };
  const removeTag = async (id: number) => { await deleteTag(id); setTags(await getTags()); };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, color:'#3d4560', fontSize:13 }}>読み込み中...</div>
  );

  return (
    <div style={{ maxWidth:800 }}>
      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <SettingsIcon size={18} color="#5d6680" />
          <h1 style={{ fontSize:22, fontWeight:800, color:'#e2e8f0', letterSpacing:'-0.03em' }}>設定</h1>
        </div>
        <p style={{ fontSize:12, color:'#3d4560', marginTop:3 }}>カテゴリ、タグ、プライバシー、通知の設定</p>
      </div>

      {/* カテゴリ管理 */}
      <Section icon={SettingsIcon} title="カテゴリ管理">
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          <input value={newCatName} onChange={e=>setNewCatName(e.target.value)} placeholder="新しいカテゴリ名" style={{ ...INPUT, flex:1 }} />
          <input type="color" value={newCatColor} onChange={e=>setNewCatColor(e.target.value)} style={{ width:36, height:36, borderRadius:6, border:'1px solid #1a2040', backgroundColor:'#0d1025', cursor:'pointer', padding:2 }} />
          <button onClick={addCategory} style={BTN_PRIMARY}><Plus size={13} />追加</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {categories.map(cat => (
            <div key={cat.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', backgroundColor:'#0d1025', borderRadius:8, border:'1px solid #141828' }}>
              {editingCat?.id === cat.id ? (
                <div style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
                  <input value={editingCat.name} onChange={e=>setEditingCat({...editingCat,name:e.target.value})} style={{ ...INPUT, flex:1 }} />
                  <input type="color" value={editingCat.color} onChange={e=>setEditingCat({...editingCat,color:e.target.value})} style={{ width:32, height:32, borderRadius:6, border:'1px solid #1a2040', backgroundColor:'#0d1025', cursor:'pointer', padding:2 }} />
                  <button onClick={()=>saveCategory(editingCat)} style={BTN_PRIMARY}>保存</button>
                  <button onClick={()=>setEditingCat(null)} style={BTN_GHOST}>キャンセル</button>
                </div>
              ) : (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', backgroundColor:cat.color }} />
                    <span style={{ fontSize:12, color:'#8892b0' }}>{cat.name}</span>
                  </div>
                  <div style={{ display:'flex', gap:4 }}>
                    <button onClick={()=>setEditingCat(cat)} style={{ ...BTN_GHOST, padding:'4px 8px' }}><Edit2 size={12} /></button>
                    <button onClick={()=>removeCat(cat.id)} style={{ ...BTN_GHOST, padding:'4px 8px', color:'#ef4444' }}><Trash2 size={12} /></button>
                  </div>
                </>
              )}
            </div>
          ))}
          {categories.length === 0 && <p style={{ fontSize:12, color:'#3d4560', textAlign:'center', padding:'20px 0' }}>カテゴリがありません</p>}
        </div>
      </Section>

      {/* カテゴリルール管理 */}
      <Section icon={List} title="カテゴリルール管理">
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
          <div style={{ display:'flex', gap:8 }}>
            <input value={newRulePattern} onChange={e=>setNewRulePattern(e.target.value)} placeholder="パターン（アプリ名または正規表現）" style={{ ...INPUT, flex:2 }} />
            <select value={newRuleCategory} onChange={e=>setNewRuleCategory(e.target.value)} style={{ ...INPUT, flex:1, cursor:'pointer' }}>
              <option value="">カテゴリを選択</option>
              {categories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <input type="number" value={newRulePriority} onChange={e=>setNewRulePriority(parseInt(e.target.value)||0)} placeholder="優先度" style={{ ...INPUT, width:100 }} />
            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#5d6680', cursor:'pointer' }}>
              <input type="checkbox" checked={newRuleIsRegex} onChange={e=>setNewRuleIsRegex(e.target.checked)} />
              正規表現
            </label>
            <button onClick={addRule} style={BTN_PRIMARY}><Plus size={13} />追加</button>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {categoryRules.map(rule => (
            <div key={rule.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', backgroundColor:'#0d1025', borderRadius:8, border:'1px solid #141828', opacity:rule.enabled?1:0.5 }}>
              {editingRule?.id === rule.id ? (
                <div style={{ display:'flex', alignItems:'center', gap:6, flex:1, flexWrap:'wrap' }}>
                  <input value={editingRule.pattern} onChange={e=>setEditingRule({...editingRule,pattern:e.target.value})} style={{ ...INPUT, width:140 }} />
                  <select value={editingRule.category} onChange={e=>setEditingRule({...editingRule,category:e.target.value})} style={{ ...INPUT, width:100, cursor:'pointer' }}>
                    {categories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <input type="number" value={editingRule.priority} onChange={e=>setEditingRule({...editingRule,priority:parseInt(e.target.value)||0})} style={{ ...INPUT, width:60 }} />
                  <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#5d6680', cursor:'pointer' }}>
                    <input type="checkbox" checked={editingRule.is_regex} onChange={e=>setEditingRule({...editingRule,is_regex:e.target.checked})} />正規表現
                  </label>
                  <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#5d6680', cursor:'pointer' }}>
                    <input type="checkbox" checked={editingRule.enabled} onChange={e=>setEditingRule({...editingRule,enabled:e.target.checked})} />有効
                  </label>
                  <button onClick={()=>saveRule(editingRule)} style={BTN_PRIMARY}>保存</button>
                  <button onClick={()=>setEditingRule(null)} style={BTN_GHOST}>✕</button>
                </div>
              ) : (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
                    <span style={{ color:'#8892b0', fontWeight:600 }}>{rule.pattern}</span>
                    {rule.is_regex && <span style={{ fontSize:10, padding:'1px 5px', borderRadius:3, backgroundColor:'rgba(59,130,246,0.15)', color:'#60a5fa' }}>正規表現</span>}
                    <span style={{ color:'#3d4560' }}>→</span>
                    <span style={{ color:'#5d6680' }}>{rule.category}</span>
                    <span style={{ fontSize:10, color:'#3d4560' }}>優先度: {rule.priority}</span>
                  </div>
                  <div style={{ display:'flex', gap:4 }}>
                    <button onClick={()=>setEditingRule(rule)} style={{ ...BTN_GHOST, padding:'4px 8px' }}><Edit2 size={12} /></button>
                    <button onClick={()=>removeRule(rule.id)} style={{ ...BTN_GHOST, padding:'4px 8px', color:'#ef4444' }}><Trash2 size={12} /></button>
                  </div>
                </>
              )}
            </div>
          ))}
          {categoryRules.length === 0 && <p style={{ fontSize:12, color:'#3d4560', textAlign:'center', padding:'20px 0' }}>カテゴリルールがありません</p>}
        </div>
      </Section>

      {/* タグ管理 */}
      <Section icon={Tag} title="行動タグ管理">
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          <input value={newTagName} onChange={e=>setNewTagName(e.target.value)} placeholder="新しいタグ名" style={{ ...INPUT, flex:1 }} />
          <input type="color" value={newTagColor} onChange={e=>setNewTagColor(e.target.value)} style={{ width:36, height:36, borderRadius:6, border:'1px solid #1a2040', backgroundColor:'#0d1025', cursor:'pointer', padding:2 }} />
          <button onClick={addTag} style={BTN_PRIMARY}><Plus size={13} />追加</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {tags.map(tag => (
            <div key={tag.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', backgroundColor:'#0d1025', borderRadius:8, border:'1px solid #141828' }}>
              {editingTag?.id === tag.id ? (
                <div style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
                  <input value={editingTag.name} onChange={e=>setEditingTag({...editingTag,name:e.target.value})} style={{ ...INPUT, flex:1 }} />
                  <input type="color" value={editingTag.color||'#3b82f6'} onChange={e=>setEditingTag({...editingTag,color:e.target.value})} style={{ width:32, height:32, borderRadius:6, border:'1px solid #1a2040', backgroundColor:'#0d1025', cursor:'pointer', padding:2 }} />
                  <button onClick={()=>saveTag(editingTag)} style={BTN_PRIMARY}>保存</button>
                  <button onClick={()=>setEditingTag(null)} style={BTN_GHOST}>キャンセル</button>
                </div>
              ) : (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', backgroundColor:tag.color||'#3b82f6' }} />
                    <span style={{ fontSize:12, color:'#8892b0' }}>{tag.name}</span>
                  </div>
                  <div style={{ display:'flex', gap:4 }}>
                    <button onClick={()=>setEditingTag(tag)} style={{ ...BTN_GHOST, padding:'4px 8px' }}><Edit2 size={12} /></button>
                    <button onClick={()=>removeTag(tag.id)} style={{ ...BTN_GHOST, padding:'4px 8px', color:'#ef4444' }}><Trash2 size={12} /></button>
                  </div>
                </>
              )}
            </div>
          ))}
          {tags.length === 0 && <p style={{ fontSize:12, color:'#3d4560', textAlign:'center', padding:'20px 0' }}>タグがありません</p>}
        </div>
      </Section>

      {/* 通知設定 */}
      <Section icon={Bell} title="デイリーストーリー通知設定">
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <p style={{ fontSize:13, fontWeight:600, color:'#8892b0', margin:0 }}>通知を有効にする</p>
              <p style={{ fontSize:11, color:'#3d4560', margin:'3px 0 0' }}>毎日の行動ストーリーを通知します</p>
            </div>
            <button
              onClick={() => setNotifSettings({ ...notifSettings, enabled:!notifSettings.enabled })}
              style={{
                width:44, height:24, borderRadius:12, border:'none', cursor:'pointer', position:'relative',
                backgroundColor: notifSettings.enabled ? '#6d28d9' : '#1a2040', transition:'background 0.2s',
              }}
            >
              <span style={{
                position:'absolute', top:2, left: notifSettings.enabled ? 22 : 2,
                width:20, height:20, borderRadius:10, backgroundColor:'#fff',
                transition:'left 0.2s', display:'block',
              }} />
            </button>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <p style={{ fontSize:13, fontWeight:600, color:'#8892b0', margin:0 }}>通知時間</p>
              <p style={{ fontSize:11, color:'#3d4560', margin:'3px 0 0' }}>通知を送信する時間</p>
            </div>
            <input type="time" value={notifSettings.time||'09:00'} onChange={e=>setNotifSettings({...notifSettings,time:e.target.value})} disabled={!notifSettings.enabled} style={{ ...INPUT, width:120, opacity:notifSettings.enabled?1:0.4 }} />
          </div>
          <button onClick={()=>updateNotificationSettings({ enabled:notifSettings.enabled, time:notifSettings.time })} style={{ ...BTN_PRIMARY, alignSelf:'flex-start' }}>
            設定を保存
          </button>
        </div>
      </Section>

      {/* プライバシー設定 */}
      <Section icon={Shield} title="プライバシー設定">
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <p style={{ fontSize:13, fontWeight:600, color:'#8892b0', margin:0 }}>プライバシーモード</p>
              <p style={{ fontSize:11, color:'#3d4560', margin:'3px 0 0' }}>機密サービスをマスクする</p>
            </div>
            <button
              onClick={() => setPrivacy({ ...privacy, enabled:!privacy.enabled })}
              style={{
                width:44, height:24, borderRadius:12, border:'none', cursor:'pointer', position:'relative',
                backgroundColor: privacy.enabled ? '#6d28d9' : '#1a2040', transition:'background 0.2s',
              }}
            >
              <span style={{
                position:'absolute', top:2, left: privacy.enabled ? 22 : 2,
                width:20, height:20, borderRadius:10, backgroundColor:'#fff',
                transition:'left 0.2s', display:'block',
              }} />
            </button>
          </div>
          <div>
            <p style={{ fontSize:13, fontWeight:600, color:'#8892b0', marginBottom:6 }}>マスク対象サービス</p>
            <textarea
              value={privacy.masked_services.join('\n')}
              onChange={e=>setPrivacy({ ...privacy, masked_services:e.target.value.split('\n').filter(s=>s.trim()) })}
              placeholder="1行につき1つのサービス名"
              rows={4}
              style={{ ...INPUT, resize:'vertical' }}
            />
          </div>
          <button onClick={()=>updatePrivacy(privacy)} style={{ ...BTN_PRIMARY, alignSelf:'flex-start' }}>保存</button>
        </div>
      </Section>

      {/* データ保持設定 */}
      <Section icon={Clock} title="データ保持設定">
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <p style={{ fontSize:13, fontWeight:600, color:'#8892b0', marginBottom:6 }}>保存期間</p>
            <select
              value={retention.retention_days}
              onChange={e=>setRetention({ retention_days:parseInt(e.target.value) })}
              style={{ ...INPUT, cursor:'pointer' }}
            >
              <option value={30}>30日</option>
              <option value={60}>60日</option>
              <option value={90}>90日</option>
              <option value={180}>180日</option>
              <option value={365}>365日</option>
            </select>
          </div>
          <button onClick={()=>updateRetention(retention)} style={{ ...BTN_PRIMARY, alignSelf:'flex-start' }}>保存</button>
        </div>
      </Section>
    </div>
  );
}
