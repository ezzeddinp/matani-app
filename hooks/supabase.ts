import { createClient } from '@supabase/supabase-js';

// Fallback untuk development - ganti dengan credentials asli Anda
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project-id.supabase.co';
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'your-publishable-key-here';

// Temporary mock client untuk development
const createMockSupabase = () => ({
  from: () => ({
    insert: () => ({ select: () => Promise.resolve({ data: [{ id: 'mock-id' }], error: null }) }),
    select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
    update: () => ({ eq: () => ({ select: () => Promise.resolve({ data: [{ id: 'mock-id' }], error: null }) }) }),
    delete: () => ({ eq: () => Promise.resolve({ error: null }) })
  })
});

export const supabase = supabaseUrl.includes('your-project-id') 
  ? createMockSupabase() 
  : createClient(supabaseUrl, supabasePublishableKey);

// Database types
export interface Lahan {
  id: string;
  user_id: string;
  name: string;
  geom: any; // GeoJSON geometry
  area_ha: number;
  created_at: string;
}

// Helper functions untuk database operations
export const lahanService = {
  // Simpan polygon lahan baru
  async saveLahan(name: string, coordinates: number[], userId: string) {
    const geoJson = {
      type: 'Polygon',
      coordinates: [coordinates]
    };

    const { data, error } = await supabase
      .from('lahan')
      .insert([
        {
          user_id: userId,
          name: name,
          geom: geoJson
        }
      ])
      .select();

    if (error) throw error;
    return data[0];
  },

  // Ambil semua lahan user
  async getLahanByUser(userId: string) {
    const { data, error } = await supabase
      .from('lahan')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  },

  // Update polygon lahan
  async updateLahan(id: string, coordinates: number[]) {
    const geoJson = {
      type: 'Polygon',
      coordinates: [coordinates]
    };

    const { data, error } = await supabase
      .from('lahan')
      .update({ geom: geoJson })
      .eq('id', id)
      .select();

    if (error) throw error;
    return data[0];
  },

  // Hapus lahan
  async deleteLahan(id: string) {
    const { error } = await supabase
      .from('lahan')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};