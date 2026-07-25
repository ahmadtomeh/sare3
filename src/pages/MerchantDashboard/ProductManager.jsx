import { useState, useEffect, useRef } from 'react'
import { Plus, Edit2, Trash2, Package, FolderPlus, X, Upload } from 'lucide-react'
import { useProductsStore } from '../../stores/useProductsStore'
import { useStoreConfig } from '../../stores/useStoreConfig'
import { Modal } from '../../components/ui/Modal'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

const EMOJIS = ['📦', '👔', '👗', '👠', '💄', '🧴', '☕', '🍕', '🥗', '📱', '💻', '🎁', '🌿', '🍰', '🥤', '🧃', '🍔', '🎮', '🏠', '🔧']

export default function ProductManager() {
  const { categories, products, fetchAll, addCategory, updateCategory, deleteCategory, addProduct, updateProduct, deleteProduct, toggleAvailability } = useProductsStore()
  const { store } = useStoreConfig()
  const [activeCat, setActiveCat] = useState('all')
  const [productModal, setProductModal] = useState(null)  // null | 'add' | product object
  const [catModal, setCatModal] = useState(false)
  const [editCat, setEditCat] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (store?.id) fetchAll(store.id)
  }, [store?.id])

  const filteredProducts = products.filter((p) => {
    const inCat = activeCat === 'all' || p.category_id === activeCat
    const inSearch = !search || p.name.includes(search) || p.description?.includes(search)
    return inCat && inSearch
  })

  const handleDeleteProduct = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return
    await deleteProduct(id)
    toast.success('تم حذف المنتج')
  }

  const handleDeleteCategory = async (id) => {
    if (!confirm('سيتم إلغاء ربط المنتجات بهذه الفئة. هل أنت متأكد؟')) return
    await deleteCategory(id)
    toast.success('تم حذف الفئة')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-xl)' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">إدارة المنتجات 🛍️</h1>
          <p className="page-subtitle">{products.length} منتج • {categories.length} فئة</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-sm)', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setCatModal(true)} id="add-category-btn">
            <FolderPlus size={16} />
            فئة جديدة
          </button>
          <button className="btn btn-primary" onClick={() => setProductModal('add')} id="add-product-btn">
            <Plus size={18} />
            إضافة منتج
          </button>
        </div>
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 'var(--sp-md)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <span className="search-bar-icon">🔍</span>
          <input
            className="input"
            placeholder="ابحث عن منتج..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="product-search"
          />
        </div>
        <div className="category-chips" style={{ flexWrap: 'nowrap' }}>
          <button
            className={`category-chip ${activeCat === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCat('all')}
          >
            الكل ({products.length})
          </button>
          {categories.map((cat) => (
            <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button
                className={`category-chip ${activeCat === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCat(cat.id)}
              >
                {cat.emoji} {cat.name} ({products.filter(p => p.category_id === cat.id).length})
              </button>
              <button
                style={{ fontSize: 12, color: 'var(--clr-text-3)', padding: '2px 4px', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => { setEditCat(cat); setCatModal(true) }}
                title="تعديل الفئة"
              >✏️</button>
            </div>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="glass empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">{search ? 'لا نتائج للبحث' : 'لا توجد منتجات بعد'}</div>
          <div className="empty-state-desc">أضف منتجك الأول لتبدأ استقبال الطلبات</div>
          {!search && <button className="btn btn-primary" onClick={() => setProductModal('add')}>
            <Plus size={16} /> إضافة منتج أول
          </button>}
        </div>
      ) : (
        <div className="products-grid">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              category={categories.find((c) => c.id === product.category_id)}
              currency={store?.currency || '₪'}
              onEdit={() => setProductModal(product)}
              onDelete={() => handleDeleteProduct(product.id)}
              onToggle={() => toggleAvailability(product.id)}
            />
          ))}
        </div>
      )}

      {/* Product Modal */}
      {productModal && (
        <ProductFormModal
          product={productModal === 'add' ? null : productModal}
          categories={categories}
          storeId={store?.id}
          currency={store?.currency || '₪'}
          onClose={() => setProductModal(null)}
          onSave={async (data) => {
            setLoading(true)
            try {
              if (productModal === 'add') {
                await addProduct(store?.id, data)
                toast.success('✅ تم إضافة المنتج')
              } else {
                await updateProduct(productModal.id, data)
                toast.success('✅ تم تحديث المنتج')
              }
              setProductModal(null)
            } catch (e) {
              toast.error('حدث خطأ: ' + e.message)
            } finally {
              setLoading(false)
            }
          }}
          loading={loading}
        />
      )}

      {/* Category Modal */}
      {catModal && (
        <CategoryFormModal
          cat={editCat}
          storeId={store?.id}
          onClose={() => { setCatModal(false); setEditCat(null) }}
          onSave={async (data) => {
            try {
              if (editCat) {
                await updateCategory(editCat.id, data)
                toast.success('تم تعديل الفئة')
              } else {
                await addCategory(store?.id, data)
                toast.success('تم إضافة الفئة')
              }
              setCatModal(false)
              setEditCat(null)
            } catch (e) {
              toast.error(e.message)
            }
          }}
          onDelete={editCat ? () => { handleDeleteCategory(editCat.id); setCatModal(false); setEditCat(null) } : null}
        />
      )}
    </div>
  )
}

function ProductCard({ product, category, currency, onEdit, onDelete, onToggle }) {
  return (
    <div className={`glass product-card ${!product.is_available ? 'product-card-unavailable' : ''}`}>
      {product.image_url ? (
        <img src={product.image_url} alt={product.name} className="product-card-img" loading="lazy" />
      ) : (
        <div className="product-card-img-placeholder">
          {category?.emoji || '📦'}
        </div>
      )}
      <div className="product-card-body">
        <div style={{ display: 'flex', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
          <span className={`badge ${product.is_available ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 10 }}>
            {product.is_available ? '🟢 متوفر' : '🔴 غير متوفر'}
          </span>
          {category && <span className="badge badge-ghost" style={{ fontSize: 10 }}>{category.emoji} {category.name}</span>}
        </div>
        <div className="product-card-name">{product.name}</div>
        <div className="product-card-price">{parseFloat(product.price).toFixed(2)} {currency}</div>
      </div>
      <div className="product-card-actions" style={{ display: 'flex', gap: 6 }}>
        <button
          className="btn btn-ghost btn-sm"
          style={{ flex: 1, fontSize: 12 }}
          onClick={onToggle}
          id={`toggle-${product.id}`}
          title={product.is_available ? 'تعليق التوفر' : 'تفعيل التوفر'}
        >
          {product.is_available ? '🔴 إيقاف' : '🟢 تفعيل'}
        </button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onEdit} id={`edit-${product.id}`} title="تعديل">
          <Edit2 size={14} />
        </button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onDelete} style={{ color: 'var(--clr-danger)' }} id={`delete-${product.id}`} title="حذف">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

function ProductFormModal({ product, categories, storeId, currency, onClose, onSave, loading }) {
  // Options can be stored as plain string array ['S','M'] OR as [{label, values}]
  // Normalize to always work with [{label, values}] internally
  const normalizeOptions = (opts) => {
    if (!opts || !Array.isArray(opts)) return []
    if (opts.length === 0) return []
    if (typeof opts[0] === 'string') {
      // old format: flat string array — convert to single group
      return [{ label: 'الخيارات', values: opts }]
    }
    // already {label, values} format
    return opts.map(o => ({ label: o.label || '', values: Array.isArray(o.values) ? o.values : [] }))
  }

  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    category_id: product?.category_id || '',
    image_url: product?.image_url || '',
    is_available: product?.is_available ?? true,
    options: normalizeOptions(product?.options),
  })
  const [imagePreview, setImagePreview] = useState(product?.image_url || '')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleImageUpload = async (file) => {
    if (!file) return
    const preview = URL.createObjectURL(file)
    setImagePreview(preview)

    // Upload to Supabase Storage if configured
    try {
      setUploading(true)
      const ext = file.name.split('.').pop()
      const path = `products/${storeId}/${Date.now()}.${ext}`
      const { data, error } = await supabase.storage.from('store-assets').upload(path, file)
      if (!error) {
        const { data: urlData } = supabase.storage.from('store-assets').getPublicUrl(path)
        set('image_url', urlData.publicUrl)
      } else {
        // Fallback: use object URL (won't persist across sessions)
        set('image_url', preview)
      }
    } catch {
      set('image_url', preview)
    } finally {
      setUploading(false)
    }
  }

  const addOption = () => set('options', [...form.options, { label: '', values: [] }])
  const removeOption = (i) => set('options', form.options.filter((_, idx) => idx !== i))
  const updateOption = (i, k, v) => set('options', form.options.map((o, idx) => idx === i ? { ...o, [k]: v } : o))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.price) { toast.error('يرجى تعبئة الاسم والسعر'); return }
    onSave({ ...form, price: parseFloat(form.price) })
  }

  return (
    <Modal title={product ? 'تعديل المنتج' : 'إضافة منتج جديد'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
        {/* Image Upload */}
        <div>
          <label className="input-label" style={{ marginBottom: 8, display: 'block' }}>صورة المنتج</label>
          <div
            className="upload-area"
            onClick={() => fileRef.current?.click()}
            style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
          >
            {imagePreview ? (
              <img src={imagePreview} style={{ maxHeight: 160, objectFit: 'contain', margin: 'auto', borderRadius: 8 }} />
            ) : (
              <div style={{ color: 'var(--clr-text-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Upload size={28} />
                <span style={{ fontSize: 'var(--text-sm)' }}>انقر لرفع صورة المنتج</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)' }}>JPG, PNG, WEBP — حتى 5MB</span>
              </div>
            )}
            {uploading && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'inherit' }}>
                <span className="animate-spin" style={{ width: 28, height: 28, border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid #fff', borderRadius: '50%', display: 'inline-block' }} />
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleImageUpload(e.target.files[0])}
          />
          {imagePreview && (
            <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => { setImagePreview(''); set('image_url', '') }}>
              <X size={14} /> إزالة الصورة
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-md)' }}>
          <div className="input-group" style={{ gridColumn: '1 / -1' }}>
            <label className="input-label">اسم المنتج *</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="مثال: قميص كاجوال أنيق" id="product-name-input" />
          </div>

          <div className="input-group">
            <label className="input-label">السعر ({currency}) *</label>
            <input className="input" type="number" min="0" step="0.01" value={form.price} onChange={(e) => set('price', e.target.value)} required placeholder="89" id="product-price-input" />
          </div>

          <div className="input-group">
            <label className="input-label">الفئة</label>
            <select className="input" value={form.category_id} onChange={(e) => set('category_id', e.target.value)} id="product-category-select">
              <option value="">— بدون فئة —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </select>
          </div>

          <div className="input-group" style={{ gridColumn: '1 / -1' }}>
            <label className="input-label">وصف المنتج</label>
            <textarea className="input" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="وصف مختصر للمنتج..." rows={2} id="product-desc-input" />
          </div>
        </div>

        {/* Availability */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--sp-md)', background: 'var(--glass-bg-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--clr-border)' }}>
          <div>
            <div style={{ fontWeight: 600 }}>حالة التوفر</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)' }}>
              {form.is_available ? '🟢 متوفر في المخزون' : '🔴 غير متوفر حالياً'}
            </div>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={form.is_available}
              onChange={(e) => set('is_available', e.target.checked)}
              id="product-available-toggle"
            />
            <span className="toggle-track" />
            <span className="toggle-thumb" />
          </label>
        </div>

        {/* Options */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-sm)' }}>
            <label className="input-label">الخيارات (مقاسات، ألوان...)</label>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addOption} id="add-option-btn">
              <Plus size={14} /> إضافة خيار
            </button>
          </div>
          {form.options.map((opt, i) => (
            <div key={i} className="glass-2" style={{ padding: 'var(--sp-sm)', marginBottom: 'var(--sp-sm)', display: 'flex', gap: 'var(--sp-sm)', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input className="input" style={{ fontSize: 'var(--text-sm)' }} value={opt.label} onChange={(e) => updateOption(i, 'label', e.target.value)} placeholder="اسم الخيار (مثال: المقاس)" />
                <input className="input" style={{ fontSize: 'var(--text-sm)' }} value={opt.values.join(', ')} onChange={(e) => updateOption(i, 'values', e.target.value.split(',').map(v => v.trim()).filter(Boolean))} placeholder="القيم مفصولة بفاصلة (S, M, L)" />
              </div>
              <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => removeOption(i)} style={{ color: 'var(--clr-danger)' }}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--sp-sm)', justifyContent: 'flex-end', marginTop: 'var(--sp-sm)' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} id="product-modal-cancel">إلغاء</button>
          <button type="submit" className="btn btn-primary" disabled={loading} id="product-modal-save">
            {loading ? '⏳ جاري الحفظ...' : product ? '💾 حفظ التعديلات' : '✅ إضافة المنتج'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function CategoryFormModal({ cat, storeId, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({ name: cat?.name || '', emoji: cat?.emoji || '📦' })

  return (
    <Modal title={cat ? 'تعديل الفئة' : 'فئة جديدة'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
        <div className="input-group">
          <label className="input-label">اسم الفئة *</label>
          <input className="input" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: ملابس رجالية" id="cat-name-input" />
        </div>
        <div className="input-group">
          <label className="input-label">رمز الفئة (Emoji)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                style={{
                  fontSize: '1.5rem', padding: 6, borderRadius: 8, border: '2px solid',
                  borderColor: form.emoji === e ? 'var(--clr-primary)' : 'transparent',
                  background: form.emoji === e ? 'var(--clr-primary-glow)' : 'var(--glass-bg-2)',
                  cursor: 'pointer',
                }}
                onClick={() => setForm(f => ({ ...f, emoji: e }))}
              >{e}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-sm)', justifyContent: 'space-between', marginTop: 8 }}>
          {onDelete && <button className="btn btn-danger btn-sm" onClick={onDelete} id="delete-cat-btn">حذف الفئة</button>}
          <div style={{ display: 'flex', gap: 'var(--sp-sm)', marginRight: 'auto' }}>
            <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
            <button className="btn btn-primary" onClick={() => form.name && onSave(form)} id="save-cat-btn">
              {cat ? 'حفظ' : 'إضافة'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
