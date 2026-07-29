import { createClient } from '@supabase/supabase-js'

// ⚠️ IMPORTANT: Always use the primary project - aewutaqpjigaqpdnfrwu
// Do NOT use VITE_SUPABASE_URL env var as Vercel integration may set wrong project
const SUPABASE_URL = 'https://aewutaqpjigaqpdnfrwu.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFld3V0YXFwamlnYXFwZG5mcnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MDk2MjYsImV4cCI6MjEwMDQ4NTYyNn0.Nc8stbQBls4fFC7gXtSZDYoj6ByrQ87EvWQrMwEk_G0'

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)

export const isConfigured = true
