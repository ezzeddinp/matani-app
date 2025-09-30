import { createClient } from '@supabase/supabase-js';

export type LatLngInput = {
  latitude: number;
  longitude: number;
};

const calculatePolygonAreaHa = (coordinates: LatLngInput[]): number => {
  if (!Array.isArray(coordinates) || coordinates.length < 3) {
    return 0;
  }

  let area = 0;
  for (let i = 0; i < coordinates.length; i++) {
    const j = (i + 1) % coordinates.length;
    area += coordinates[i].longitude * coordinates[j].latitude;
    area -= coordinates[j].longitude * coordinates[i].latitude;
  }

  area = Math.abs(area) / 2;
  return area * 10000;
};

const calculateAreaFromGeoJSON = (geom: any): number => {
  const ring: number[][] | undefined = geom?.coordinates?.[0];
  if (!Array.isArray(ring)) {
    return 0;
  }

  const latLngRing: LatLngInput[] = ring
    .map(([lng, lat]) => ({ latitude: lat, longitude: lng }))
    .slice(0, ring.length > 1 ? -1 : ring.length);

  return calculatePolygonAreaHa(latLngRing);
};

// Fallback untuk development - ganti dengan credentials asli Anda
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project-id.supabase.co';
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'your-publishable-key-here';

// Temporary mock client untuk development
const createMockSupabase = () => ({
  from: (table: string) => ({
    insert: (values: any[]) => ({
      select: () => {
        const enriched = Array.isArray(values)
          ? values.map((value, index) => ({
              id: value?.id ?? `mock-${Date.now()}-${index}`,
              ...value,
              area_ha:
                typeof value?.area_ha === 'number'
                  ? value.area_ha
                  : calculateAreaFromGeoJSON(value?.geom),
            }))
          : [];
        return Promise.resolve({ data: enriched, error: null });
      },
    }),
    select: () => ({
      eq: () => Promise.resolve({ data: table === 'lahan_with_info' ? [] : [], error: null }),
    }),
    update: () => ({
      eq: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
    delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
  }),
  auth: {
    getUser: async () => ({
      data: { user: { id: 'mock-user-id' } },
      error: null,
    }),
  },
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

export interface LahanWithInfo {
  id: string;
  name: string;
  geojson: any;
  area_ha: number | null;
}

// Helper functions untuk database operations
export const lahanService = {
  // Simpan polygon lahan baru
  async saveLahan(
    name: string,
    coordinates: LatLngInput[],
    userId: string,
    areaHa?: number
  ) {
    if (!userId) {
      throw new Error('USER_ID_REQUIRED');
    }

    const ring = coordinates.map(coord => [coord.longitude, coord.latitude]);
    if (ring.length < 3) {
      throw new Error('POLYGON_NEEDS_AT_LEAST_THREE_POINTS');
    }

    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push([...first]);
    }

    const geoJson = {
      type: 'Polygon',
      coordinates: [ring],
    };

    const areaToPersist = typeof areaHa === 'number' ? areaHa : calculatePolygonAreaHa(coordinates);

    const { data, error } = await supabase
      .from('lahan')
      .insert([
        {
          user_id: userId,
          name: name,
          geom: geoJson,
          area_ha: areaToPersist,
        }
      ])
      .select();

    if (error) throw error;
    return data?.[0];
  },

  // Ambil semua lahan user
  async getLahanByUser(userId: string) {
    const { data, error } = await supabase
      .from('lahan_with_info')
      .select('id, name, geojson, area_ha')
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  },

  // Update polygon lahan
  async updateLahan(id: string, coordinates: LatLngInput[]) {
    const ring = coordinates.map(coord => [coord.longitude, coord.latitude]);
    if (ring.length < 3) {
      throw new Error('POLYGON_NEEDS_AT_LEAST_THREE_POINTS');
    }

    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push([...first]);
    }

    const geoJson = {
      type: 'Polygon',
      coordinates: [ring],
    };

    const areaToPersist = calculatePolygonAreaHa(coordinates);

    const { data, error } = await supabase
      .from('lahan')
      .update({ geom: geoJson, area_ha: areaToPersist })
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