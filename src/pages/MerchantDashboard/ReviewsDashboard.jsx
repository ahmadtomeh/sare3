import { useEffect } from 'react'
import { useReviewsStore } from '../../stores/useReviewsStore'
import { useStoreConfig } from '../../stores/useStoreConfig'
import { Star, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const formatPrice = (val) => {
  const num = Number(val)
  if (isNaN(num)) return '0'
  return num % 1 === 0 ? num.toString() : num.toFixed(2).replace(/\.?0+$/, '')
}

function StarDisplay({ rating, size = 14 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{ fontSize: size, color: s <= rating ? '#f59e0b' : 'var(--clr-border)' }}>★</span>
      ))}
    </span>
  )
}

export default function ReviewsDashboard() {
  const { store } = useStoreConfig()
  const { storeReviews, loading, fetchStoreReviews, deleteReview } = useReviewsStore()

  useEffect(() => {
    if (store?.id) fetchStoreReviews(store.id)
  }, [store?.id])

  const handleDelete = async (reviewId) => {
    if (!confirm('هل تريد حذف هذا التقييم؟')) return
    try {
      await deleteReview(reviewId)
      toast.success('تم حذف التقييم')
    } catch {
      toast.error('فشل الحذف')
    }
  }

  const avgRating = storeReviews.length > 0
    ? storeReviews.reduce((s, r) => s + r.rating, 0) / storeReviews.length
    : 0

  const ratingDist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: storeReviews.filter(r => r.rating === star).length,
    pct: storeReviews.length > 0
      ? Math.round(storeReviews.filter(r => r.rating === star).length / storeReviews.length * 100)
      : 0,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-xl)' }}>
      {/* Header */}
      <div>
        <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 800 }}>التقييمات ⭐</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--clr-text-3)', fontSize: 'var(--text-sm)' }}>
          آراء الزبائن حول منتجاتك
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--clr-text-3)' }}>جاري التحميل...</div>
      ) : storeReviews.length === 0 ? (
        <div className="glass" style={{ textAlign: 'center', padding: 48, borderRadius: 'var(--radius-xl)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>⭐</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>لا توجد تقييمات بعد</div>
          <div style={{ fontSize: 13, color: 'var(--clr-text-3)' }}>
            ستظهر تقييمات زبائنك هنا بعد أول طلب
          </div>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--sp-lg)', alignItems: 'center' }}>
            <div className="glass" style={{ padding: 'var(--sp-xl)', borderRadius: 'var(--radius-xl)', textAlign: 'center', minWidth: 130 }}>
              <div style={{ fontSize: 48, fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>
                {avgRating.toFixed(1)}
              </div>
              <StarDisplay rating={Math.round(avgRating)} size={18} />
              <div style={{ fontSize: 12, color: 'var(--clr-text-3)', marginTop: 6 }}>
                {storeReviews.length} تقييم
              </div>
            </div>
            <div className="glass" style={{ padding: 'var(--sp-lg)', borderRadius: 'var(--radius-xl)' }}>
              {ratingDist.map(({ star, count, pct }) => (
                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, width: 16, textAlign: 'center', color: '#f59e0b', fontWeight: 700 }}>{star}</span>
                  <span style={{ fontSize: 12, color: '#f59e0b' }}>★</span>
                  <div style={{ flex: 1, height: 8, background: 'var(--glass-bg-2)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: 4, transition: 'width 0.6s' }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--clr-text-3)', minWidth: 30 }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {storeReviews.map(review => (
              <div key={review.id} className="glass" style={{ borderRadius: 'var(--radius-md)', padding: 'var(--sp-md)', display: 'flex', gap: 12 }}>
                {/* Product Image */}
                {review.products?.image_url && (
                  <img
                    src={review.products.image_url}
                    alt={review.products?.name}
                    style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{review.customer_name}</div>
                      {review.products?.name && (
                        <div style={{ fontSize: 11, color: 'var(--clr-text-3)' }}>🛍 {review.products.name}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <StarDisplay rating={review.rating} />
                      <span style={{ fontSize: 10, color: 'var(--clr-text-3)' }}>
                        {new Date(review.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                      </span>
                      <button
                        onClick={() => handleDelete(review.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--clr-danger)', cursor: 'pointer', padding: 2 }}
                        title="حذف التقييم"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {review.comment && (
                    <div style={{ fontSize: 12, color: 'var(--clr-text-2)', marginTop: 6, lineHeight: 1.5 }}>
                      "{review.comment}"
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
