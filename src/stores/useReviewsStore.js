import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useReviewsStore = create((set, get) => ({
  reviews: [], // reviews for a specific product
  storeReviews: [], // all reviews for the store (merchant view)
  loading: false,

  // Fetch reviews for a single product
  fetchProductReviews: async (productId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
    if (!error) set({ reviews: data || [] })
    set({ loading: false })
  },

  // Fetch all reviews for a store (merchant dashboard)
  fetchStoreReviews: async (storeId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('reviews')
      .select('*, products(name, image_url)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
    if (!error) set({ storeReviews: data || [] })
    set({ loading: false })
  },

  // Submit a review
  submitReview: async ({ storeId, productId, customerName, rating, comment }) => {
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        store_id: storeId,
        product_id: productId,
        customer_name: customerName,
        rating,
        comment,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Delete a review (merchant only)
  deleteReview: async (reviewId) => {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)
    if (error) throw error
    set(s => ({
      storeReviews: s.storeReviews.filter(r => r.id !== reviewId),
      reviews: s.reviews.filter(r => r.id !== reviewId),
    }))
  },

  // Get average rating for a product from cached storeReviews or reviews
  getProductRating: (productId) => {
    const reviews = get().storeReviews.filter(r => r.product_id === productId)
    if (!reviews.length) return null
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    return { avg: Math.round(avg * 10) / 10, count: reviews.length }
  },
}))
