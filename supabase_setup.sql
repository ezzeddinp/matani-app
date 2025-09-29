-- Setup PostGIS extension (jika belum aktif)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Buat tabel lahan untuk menyimpan polygon
CREATE TABLE IF NOT EXISTS lahan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  geom GEOMETRY(POLYGON, 4326), -- WGS84 coordinate system
  area_ha DECIMAL GENERATED ALWAYS AS (ST_Area(geom::geography) / 10000) STORED, -- Auto-calculate area in hectares
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index untuk performa query geospasial
CREATE INDEX IF NOT EXISTS idx_lahan_geom ON lahan USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_lahan_user_id ON lahan (user_id);

-- RLS (Row Level Security) policies
ALTER TABLE lahan ENABLE ROW LEVEL SECURITY;

-- Policy: User hanya bisa akses data milik mereka sendiri
CREATE POLICY "Users can only access their own lahan" ON lahan
  FOR ALL USING (auth.uid() = user_id);

-- Policy: User bisa insert data untuk diri mereka sendiri
CREATE POLICY "Users can insert their own lahan" ON lahan
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger untuk update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lahan_updated_at 
  BEFORE UPDATE ON lahan 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View untuk query dengan informasi tambahan
CREATE OR REPLACE VIEW lahan_with_info AS
SELECT 
  id,
  user_id,
  name,
  ST_AsGeoJSON(geom) as geojson,
  area_ha,
  ST_Centroid(geom::geography)::geometry as centroid,
  created_at,
  updated_at
FROM lahan;

-- Grant permissions
GRANT ALL ON lahan TO authenticated;
GRANT SELECT ON lahan_with_info TO authenticated;