import { createClient } from "@supabase/supabase-js";

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

// Credentials Supabase harus tersedia
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Supabase belum dikonfigurasi. Pastikan EXPO_PUBLIC_SUPABASE_URL dan EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY tersedia."
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);

const LAHAN_THUMBNAIL_BUCKET =
  process.env.EXPO_PUBLIC_SUPABASE_LAHAN_THUMBNAIL_BUCKET || "lahan-thumbnails";

type SignUpPayload = {
  email: string;
  password: string;
  fullName?: string;
};

type SignInPayload = {
  email: string;
  password: string;
};

export const authService = {
  async signUp({ email, password, fullName }: SignUpPayload) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: fullName ? { full_name: fullName } : undefined,
        emailRedirectTo: process.env.EXPO_PUBLIC_SUPABASE_REDIRECT_URL,
      },
    });

    if (error) throw error;
    return data;
  },

  async signIn({ email, password }: SignInPayload) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      const message = error.message ?? "";
      if (message.includes("Auth session missing")) {
        return { user: null } as typeof data;
      }
      throw error;
    }
    return data;
  },
};

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export const profileService = {
  async getProfile(userId: string) {
    if (!userId) {
      throw new Error("USER_ID_REQUIRED");
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, email, full_name, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return data as UserProfile | null;
  },

  async updateProfile(
    userId: string,
    payload: Partial<Pick<UserProfile, "full_name">>
  ) {
    if (!userId) {
      throw new Error("USER_ID_REQUIRED");
    }

    const { data, error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", userId)
      .select("id, email, full_name, created_at, updated_at")
      .maybeSingle();

    if (error) throw error;
    return data as UserProfile | null;
  },
};
const coordinatesToWkt = (coordinates: LatLngInput[]): string => {
  const ring = coordinates.map((coord) => [coord.longitude, coord.latitude]);
  if (ring.length < 3) {
    throw new Error("POLYGON_NEEDS_AT_LEAST_THREE_POINTS");
  }

  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([...first]);
  }

  const wktCoordinates = ring.map(([lon, lat]) => `${lon} ${lat}`).join(", ");
  return `SRID=4326;POLYGON((${wktCoordinates}))`;
};

// Database types
export interface Lahan {
  id: string;
  user_id: string;
  name: string;
  geom: any; // GeoJSON geometry
  area_ha: number;
  thumbnail_url: string | null;
  created_at: string;
}

export interface LahanWithInfo {
  id: string;
  name: string;
  geojson: any;
  area_ha: number | null;
  thumbnail_url: string | null;
  centroid?: any;
  created_at?: string;
  updated_at?: string;
}

export type LahanDetail = LahanWithInfo;

// Helper functions untuk database operations
export const lahanService = {
  // Simpan polygon lahan baru
  async saveLahan(
    name: string,
    coordinates: LatLngInput[],
    userId: string,
    areaHa?: number,
    options?: {
      thumbnailUrl?: string | null;
    }
  ) {
    if (!userId) {
      throw new Error("USER_ID_REQUIRED");
    }

    const polygonWkt = coordinatesToWkt(coordinates);

    const fallbackArea =
      typeof areaHa === "number" ? areaHa : calculatePolygonAreaHa(coordinates);

    const { data, error } = await supabase
      .from("lahan")
      .insert([
        {
          user_id: userId,
          name: name,
          geom: polygonWkt,
          thumbnail_url: options?.thumbnailUrl ?? null,
        },
      ])
      .select();

    if (error) throw error;
    const persisted = data?.[0];
    if (persisted) {
      return {
        ...persisted,
        area_ha: persisted.area_ha ?? fallbackArea,
        thumbnail_url: persisted.thumbnail_url ?? options?.thumbnailUrl ?? null,
      };
    }
    return undefined;
  },

  // Ambil semua lahan user
  async getLahanByUser(userId: string) {
    const { data, error } = await supabase
      .from("lahan_with_info")
      .select(
        "id, name, geojson, area_ha, thumbnail_url, centroid, created_at, updated_at"
      )
      .eq("user_id", userId);

    if (error) throw error;
    return data;
  },

  async getLahanDetail(id: string) {
    if (!id) {
      throw new Error("LAHAN_ID_REQUIRED");
    }

    const { data, error } = await supabase
      .from("lahan_with_info")
      .select(
        "id, name, geojson, area_ha, thumbnail_url, centroid, created_at, updated_at"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data as LahanDetail | null;
  },

  // Update polygon lahan
  async updateLahan(id: string, coordinates: LatLngInput[]) {
    const polygonWkt = coordinatesToWkt(coordinates);

    const { data, error } = await supabase
      .from("lahan")
      .update({ geom: polygonWkt })
      .eq("id", id)
      .select();

    if (error) throw error;
    return data[0];
  },

  // Hapus lahan
  async deleteLahan(id: string) {
    const { error } = await supabase.from("lahan").delete().eq("id", id);

    if (error) throw error;
  },

  async uploadThumbnailFromFile(
    userId: string,
    fileUri: string | null | undefined
  ) {
    if (!userId) {
      throw new Error("USER_ID_REQUIRED");
    }

    if (!fileUri) {
      return null;
    }

    try {
      const response = await fetch(fileUri);
      if (!response.ok) {
        throw new Error(`Failed to read thumbnail file (${response.status})`);
      }
      const arrayBuffer = await response.arrayBuffer();

      const filePath = `thumbnails/${userId}/${Date.now()}-${Math.round(
        Math.random() * 1_000_000
      )}.png`;
      const { error: uploadError } = await supabase.storage
        .from(LAHAN_THUMBNAIL_BUCKET)
        .upload(filePath, arrayBuffer, {
          contentType: "image/png",
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from(LAHAN_THUMBNAIL_BUCKET)
        .getPublicUrl(filePath);
      return data?.publicUrl ?? null;
    } catch (error) {
      console.warn("Tidak dapat mengunggah thumbnail lahan:", error);
      return null;
    }
  },
};
