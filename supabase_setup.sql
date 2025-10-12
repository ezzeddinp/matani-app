-- Setup PostGIS extension (jika belum aktif)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Buat tabel lahan untuk menyimpan polygon
CREATE TABLE IF NOT EXISTS lahan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  geom GEOMETRY(POLYGON, 4326), -- WGS84 coordinate system
  area_ha DECIMAL GENERATED ALWAYS AS (ST_Area(geom::geography) / 10000) STORED, -- Auto-calculate area in hectares
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Backfill column for existing deployments that predate thumbnail feature
ALTER TABLE IF EXISTS lahan
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Table metadata thumbnail lahan
CREATE TABLE IF NOT EXISTS public.lahan_thumbnails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lahan_id UUID REFERENCES public.lahan(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  description TEXT,
  captured_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.lahan_thumbnails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view thumbnails for their lahan" ON public.lahan_thumbnails
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.lahan l WHERE l.id = lahan_id AND l.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert thumbnails for their lahan" ON public.lahan_thumbnails
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND lahan_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.lahan l WHERE l.id = lahan_id AND l.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update thumbnails for their lahan" ON public.lahan_thumbnails
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.lahan l WHERE l.id = lahan_id AND l.user_id = auth.uid()
    )
  ) WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.lahan l WHERE l.id = lahan_id AND l.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete thumbnails for their lahan" ON public.lahan_thumbnails
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.lahan l WHERE l.id = lahan_id AND l.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_lahan_thumbnails_lahan_id ON public.lahan_thumbnails(lahan_id);
CREATE INDEX IF NOT EXISTS idx_lahan_thumbnails_user_id ON public.lahan_thumbnails(user_id);

CREATE TRIGGER update_lahan_thumbnails_updated_at
  BEFORE UPDATE ON public.lahan_thumbnails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lahan_thumbnails TO authenticated;

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
  thumbnail_url,
  ST_Centroid(geom::geography)::geometry as centroid,
  created_at,
  updated_at
FROM lahan;

-- Grant permissions
GRANT ALL ON lahan TO authenticated;
GRANT SELECT ON lahan_with_info TO authenticated;-- ...existing code...
CREATE EXTENSION IF NOT EXISTS postgis;

-- User profile table kept in sync with auth.users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  phone_number TEXT UNIQUE,
  full_name TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns if table already exists (for migration)
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS phone_number TEXT UNIQUE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON public.users(phone_number) WHERE phone_number IS NOT NULL;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Policy untuk insert (saat signup)
CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy untuk public profile view (optional - uncomment jika diperlukan)
-- CREATE POLICY "Public profiles are viewable by everyone" ON public.users
--   FOR SELECT USING (true);

GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
-- ...existing code...
CREATE TABLE IF NOT EXISTS lahan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  geom GEOMETRY(POLYGON, 4326),
  area_ha DECIMAL GENERATED ALWAYS AS (ST_Area(geom::geography) / 10000) STORED,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lahan_thumbnails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lahan_id UUID REFERENCES public.lahan(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  description TEXT,
  captured_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.lahan_thumbnails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view thumbnails for their lahan" ON public.lahan_thumbnails
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.lahan l WHERE l.id = lahan_id AND l.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert thumbnails for their lahan" ON public.lahan_thumbnails
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND lahan_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.lahan l WHERE l.id = lahan_id AND l.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update thumbnails for their lahan" ON public.lahan_thumbnails
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.lahan l WHERE l.id = lahan_id AND l.user_id = auth.uid()
    )
  ) WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.lahan l WHERE l.id = lahan_id AND l.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete thumbnails for their lahan" ON public.lahan_thumbnails
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.lahan l WHERE l.id = lahan_id AND l.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_lahan_thumbnails_lahan_id ON public.lahan_thumbnails(lahan_id);
CREATE INDEX IF NOT EXISTS idx_lahan_thumbnails_user_id ON public.lahan_thumbnails(user_id);

CREATE TRIGGER update_lahan_thumbnails_updated_at
  BEFORE UPDATE ON public.lahan_thumbnails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lahan_thumbnails TO authenticated;
-- ...existing code...
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
-- ...existing code...
CREATE TRIGGER update_lahan_updated_at 
  BEFORE UPDATE ON lahan 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ...existing code...
CREATE OR REPLACE VIEW lahan_with_info AS
SELECT 
  id,
  user_id,
  name,
  ST_AsGeoJSON(geom) as geojson,
  area_ha,
  thumbnail_url,
  ST_Centroid(geom::geography)::geometry as centroid,
  created_at,
  updated_at
FROM lahan;
-- ...existing code...
GRANT SELECT ON lahan_with_info TO authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, username, phone_number, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'username', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'phone_number', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(EXCLUDED.username, public.users.username),
    phone_number = COALESCE(EXCLUDED.phone_number, public.users.phone_number),
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- Tabel kesehatan lahan (NDVI history)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.lahan_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lahan_id UUID REFERENCES public.lahan(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ndvi_score NUMERIC,
  status TEXT,
  captured_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.lahan_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view health data for their lahan" ON public.lahan_health
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.lahan l WHERE l.id = lahan_id AND l.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert health data for their lahan" ON public.lahan_health
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.lahan l WHERE l.id = lahan_id AND l.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update health data for their lahan" ON public.lahan_health
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.lahan l WHERE l.id = lahan_id AND l.user_id = auth.uid()
    )
  ) WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.lahan l WHERE l.id = lahan_id AND l.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_lahan_health_lahan_id ON public.lahan_health(lahan_id);
CREATE INDEX IF NOT EXISTS idx_lahan_health_captured_at ON public.lahan_health(captured_at DESC NULLS LAST);

CREATE TRIGGER update_lahan_health_updated_at
  BEFORE UPDATE ON public.lahan_health
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

GRANT SELECT, INSERT, UPDATE ON public.lahan_health TO authenticated;

-- =====================================================================
-- Tabel catatan lahan
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.lahan_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lahan_id UUID REFERENCES public.lahan(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.lahan_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own lahan notes" ON public.lahan_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lahan notes" ON public.lahan_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lahan notes" ON public.lahan_notes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lahan notes" ON public.lahan_notes
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_lahan_notes_user_id ON public.lahan_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_lahan_notes_lahan_id ON public.lahan_notes(lahan_id);
CREATE INDEX IF NOT EXISTS idx_lahan_notes_created_at ON public.lahan_notes(created_at DESC);

CREATE TRIGGER update_lahan_notes_updated_at
  BEFORE UPDATE ON public.lahan_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lahan_notes TO authenticated;