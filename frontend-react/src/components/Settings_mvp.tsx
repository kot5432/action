import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../lib/api_mvp';

const CARD = { backgroundColor:'#131629', border:'1px solid #1a2040', borderRadius:12 };
const INPUT = {
  width:'100%', padding:'8px 12px',
  backgroundColor:'#0d1025', border:'1px solid #1a2040',
  borderRadius:8, color:'#8892b0', fontSize:12, outline:'none',
} as const;

export default function Settings() {
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newCategoryName.trim()) return;
    try {
      await createCategory(newCategoryName, newCategoryColor);
      setNewCategoryName('');
      setNewCategoryColor('#3b82f6');
      loadCategories();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleUpdate(id: number) {
    try {
      await updateCategory(id, editName, editColor);
      setEditingId(null);
      loadCategories();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteCategory(id);
      loadCategories();
    } catch (e) {
      console.error(e);
    }
  }

  function startEdit(category: any) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditColor(category.color);
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, color:'#3d4560', fontSize:13 }}>
      読み込み中...
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* ページヘッダー */}
      <div>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#e2e8f0', letterSpacing:'-0.03em' }}>設定</h1>
        <p style={{ fontSize:12, color:'#3d4560', marginTop:3 }}>カテゴリ管理</p>
      </div>

      {/* カテゴリ作成 />}
      <div style={{ ...CARD, padding:'18px 20px' }}>
        <h3 style={{ fontSize:13, fontWeight:700, color:'#e2e8f0', marginBottom:12 }}>新しいカテゴリ</h3>
        <div style={{ display:'flex', gap:12, alignItems:'flex-end' }}>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:11, color:'#5d6680', marginBottom:4, display:'block' }}>名前</label>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="カテゴリ名"
              style={INPUT}
            />
          </div>
          <div style={{ width:100 }}>
            <label style={{ fontSize:11, color:'#5d6680', marginBottom:4, display:'block' }}>色</label>
            <input
              type="color"
              value={newCategoryColor}
              onChange={(e) => setNewCategoryColor(e.target.value)}
              style={{ width:'100%', height:34, borderRadius:8, border:'1px solid #1a2040', cursor:'pointer' }}
            />
          </div>
          <button
            onClick={handleCreate}
            style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'8px 14px', borderRadius:8,
              backgroundColor:'#6d28d9', border:'none',
              color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer',
            }}
          >
            <Plus size={14} />
            追加
          </button>
        </div>
      </div>

      {/* カテゴリ一覧 */}
      <div style={{ ...CARD, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #1a2040' }}>
          <h3 style={{ fontSize:13, fontWeight:700, color:'#e2e8f0' }}>カテゴリ一覧</h3>
        </div>
        <div style={{ padding:'16px 20px' }}>
          {categories.length === 0 ? (
            <div style={{ textAlign:'center', color:'#3d4560', fontSize:12, padding:20 }}>
              カテゴリがありません
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'12px', backgroundColor:'#0d1025',
                    borderRadius:8, border:'1px solid #1a2040',
                  }}
                >
                  {editingId === cat.id ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{ ...INPUT, flex:1 }}
                      />
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        style={{ width:40, height:32, borderRadius:6, border:'1px solid #1a2040', cursor:'pointer' }}
                      />
                      <button
                        onClick={() => handleUpdate(cat.id)}
                        style={{ padding:'6px 12px', borderRadius:6, backgroundColor:'#10b981', border:'none', color:'#fff', fontSize:11, fontWeight:600, cursor:'pointer' }}
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{ padding:'6px 12px', borderRadius:6, backgroundColor:'#3d4560', border:'none', color:'#fff', fontSize:11, cursor:'pointer' }}
                      >
                        キャンセル
                      </button>
                    </>
                  ) : (
                    <>
                      <div
                        style={{
                          width:24, height:24, borderRadius:6,
                          backgroundColor:cat.color, flexShrink:0,
                        }}
                      />
                      <span style={{ flex:1, fontSize:13, color:'#8892b0', fontWeight:500 }}>{cat.name}</span>
                      <button
                        onClick={() => startEdit(cat)}
                        style={{ padding:'6px', borderRadius:6, backgroundColor:'transparent', border:'1px solid #1a2040', color:'#5d6680', cursor:'pointer' }}
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        style={{ padding:'6px', borderRadius:6, backgroundColor:'transparent', border:'1px solid #1a2040', color:'#ef4444', cursor:'pointer' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
