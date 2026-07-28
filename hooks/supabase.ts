
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
  username?: string;
  phoneNumber?: string;
};

type SignInPayload = {
  email: string;
  password: string;
};

export const authService = {
  async signUp({
    email,
    password,
    fullName,
    username,
    phoneNumber,
  }: SignUpPayload) {
    const metadata: Record<string, string> = {};

    if (fullName) {
      metadata.full_name = fullName;
    }
    if (username) {
      metadata.username = username;
    }
    if (phoneNumber) {
      metadata.phone_number = phoneNumber;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: Object.keys(metadata).length > 0 ? metadata : undefined,
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

export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  phone_number: string | null;
  created_at: string;
  updated_at: string;
};

export const profileService = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from("users")
      .select(
        "id, email, full_name, username, phone_number, created_at, updated_at"
      )
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  },

  async updateProfile(
    userId: string,
    updates: {
      full_name?: string;
      username?: string;
      phone_number?: string;
    }
  ): Promise<UserProfile> {
    const { data, error } = await supabase
      .from("users")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select(
        "id, email, full_name, username, phone_number, created_at, updated_at"
      )
      .single();

    if (error) throw error;
    return data;
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
  category?: string | null;
  centroid?: any;
  created_at?: string;
  updated_at?: string;
}

export type LahanDetail = LahanWithInfo;

export interface LahanThumbnail {
  id: string;
  lahan_id: string;
  user_id: string | null;
  storage_path: string;
  public_url: string | null;
  description: string | null;
  captured_at: string | null;
  created_at: string;
  updated_at: string;
}

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
      category?: string | null;
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
          category: options?.category ?? null,
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
    const baseSelect =
      "id, name, geojson, area_ha, thumbnail_url, category, centroid, created_at, updated_at";

    const { data, error } = await supabase
      .from("lahan_with_info")
      .select(baseSelect)
      .eq("user_id", userId);

    if (!error) {
      return data;
    }

    if (error.code === "42703") {
      console.warn(
        "Kolom tidak ditemukan pada view lahan_with_info, menggunakan fallback tanpa kolom tersebut"
      );

      const fallbackSelect = baseSelect
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part !== "thumbnail_url" && part !== "category")
        .join(", ");

      const { data: fallbackData, error: fallbackError } = await supabase
        .from("lahan_with_info")
        .select(fallbackSelect)
        .eq("user_id", userId);

      if (fallbackError) {
        throw fallbackError;
      }

      if (!Array.isArray(fallbackData)) {
        return fallbackData;
      }

      return fallbackData.map((item) => {
        const base =
          item && typeof item === "object"
            ? (item as Record<string, unknown>)
            : {};
        return { ...base, thumbnail_url: null, category: null };
      });
    }

    throw error;
  },

  async getLahanDetail(id: string) {
    if (!id) {
      throw new Error("LAHAN_ID_REQUIRED");
    }

    const baseSelect =
      "id, name, geojson, area_ha, thumbnail_url, category, centroid, created_at, updated_at";

    const { data, error } = await supabase
      .from("lahan_with_info")
      .select(baseSelect)
      .eq("id", id)
      .maybeSingle();

    if (!error) {
      return data as LahanDetail | null;
    }

    if (error.code === "42703") {
      console.warn(
        "Kolom tidak ditemukan pada view lahan_with_info untuk detail, menggunakan fallback"
      );

      const fallbackSelect = baseSelect
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part !== "thumbnail_url" && part !== "category")
        .join(", ");

      const { data: fallbackData, error: fallbackError } = await supabase
        .from("lahan_with_info")
        .select(fallbackSelect)
        .eq("id", id)
        .maybeSingle();

      if (fallbackError) {
        throw fallbackError;
      }

      if (!fallbackData || typeof fallbackData !== "object") {
        return null;
      }

      return {
        ...(fallbackData as Record<string, unknown>),
        thumbnail_url: null,
        category: null,
      } as LahanDetail;
    }

    throw error;
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
  ): Promise<{ publicUrl: string | null; storagePath: string | null }> {
    if (!userId) {
      throw new Error("USER_ID_REQUIRED");
    }

    if (!fileUri) {
      return { publicUrl: null, storagePath: null };
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
      return {
        publicUrl: data?.publicUrl ?? null,
        storagePath: filePath,
      };
    } catch (error) {
      console.warn("Tidak dapat mengunggah thumbnail lahan:", error);
      return { publicUrl: null, storagePath: null };
    }
  },
};

export const lahanThumbnailService = {
  async createThumbnailRecord(params: {
    lahanId: string;
    userId: string;
    storagePath: string | null;
    publicUrl: string | null;
    description?: string | null;
    capturedAt?: Date | null;
  }) {
    const { lahanId, userId, storagePath, publicUrl, description, capturedAt } =
      params;

    if (!lahanId) {
      throw new Error("LAHAN_ID_REQUIRED");
    }
    if (!userId) {
      throw new Error("USER_ID_REQUIRED");
    }
    if (!storagePath && !publicUrl) {
      return null;
    }

    const payload = {
      lahan_id: lahanId,
      user_id: userId,
      storage_path: storagePath,
      public_url: publicUrl,
      description: description ?? null,
      captured_at: capturedAt ? capturedAt.toISOString() : null,
    };

    const { data, error } = await supabase
      .from("lahan_thumbnails")
      .insert([payload])
      .select()
      .maybeSingle();

    if (error) {
      console.warn("Gagal membuat metadata thumbnail lahan:", error);
      return null;
    }

    return data as LahanThumbnail | null;
  },

  async getThumbnailsByLahan(lahanId: string) {
    if (!lahanId) {
      throw new Error("LAHAN_ID_REQUIRED");
    }

    const { data, error } = await supabase
      .from("lahan_thumbnails")
      .select(
        "id, lahan_id, user_id, storage_path, public_url, description, captured_at, created_at, updated_at"
      )
      .eq("lahan_id", lahanId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []) as LahanThumbnail[];
  },
};
