const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://aewutaqpjigaqpdnfrwu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFld3V0YXFwamlnYXFwZG5mcnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MDk2MjYsImV4cCI6MjEwMDQ4NTYyNn0.Nc8stbQBls4fFC7gXtSZDYoj6ByrQ87EvWQrMwEk_G0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from('stores')
    .select('id, name, slug, primary_color, accent_color')
    .eq('slug', 'mudawra')
    .single();

  if (error) {
    console.error('Error fetching store:', error.message);
  } else {
    console.log('\n📊 Database Row Colors for mudawra:');
    console.log(data);
  }
}

run();
