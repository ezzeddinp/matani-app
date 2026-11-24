export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      lahan: {
        Row: {
          area_ha: number | null
          category: string | null
          created_at: string
          geom: unknown
          id: string
          legacy_category: string | null
          name: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area_ha?: number | null
          category?: string | null
          created_at?: string
          geom: unknown
          id?: string
          legacy_category?: string | null
          name: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area_ha?: number | null
          category?: string | null
          created_at?: string
          geom?: unknown
          id?: string
          legacy_category?: string | null
          name?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lahan_health: {
        Row: {
          captured_at: string | null
          created_at: string
          id: string
          lahan_id: string
          ndmi_score: number | null
          ndvi_score: number | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          captured_at?: string | null
          created_at?: string
          id?: string
          lahan_id: string
          ndmi_score?: number | null
          ndvi_score?: number | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          captured_at?: string | null
          created_at?: string
          id?: string
          lahan_id?: string
          ndmi_score?: number | null
          ndvi_score?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lahan_health_lahan_id_fkey"
            columns: ["lahan_id"]
            isOneToOne: false
            referencedRelation: "lahan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lahan_health_lahan_id_fkey"
            columns: ["lahan_id"]
            isOneToOne: false
            referencedRelation: "lahan_with_info"
            referencedColumns: ["id"]
          },
        ]
      }
      lahan_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          lahan_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lahan_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lahan_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lahan_notes_lahan_id_fkey"
            columns: ["lahan_id"]
            isOneToOne: false
            referencedRelation: "lahan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lahan_notes_lahan_id_fkey"
            columns: ["lahan_id"]
            isOneToOne: false
            referencedRelation: "lahan_with_info"
            referencedColumns: ["id"]
          },
        ]
      }
      lahan_thumbnails: {
        Row: {
          captured_at: string | null
          created_at: string
          description: string | null
          id: string
          lahan_id: string
          public_url: string | null
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          captured_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lahan_id: string
          public_url?: string | null
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          captured_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lahan_id?: string
          public_url?: string | null
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lahan_thumbnails_lahan_id_fkey"
            columns: ["lahan_id"]
            isOneToOne: false
            referencedRelation: "lahan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lahan_thumbnails_lahan_id_fkey"
            columns: ["lahan_id"]
            isOneToOne: false
            referencedRelation: "lahan_with_info"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_index_stats: {
        Row: {
          derived_coverage_pixel_count: number | null
          index_name: string
          maximum: number | null
          mean: number | null
          measurement_id: string
          minimum: number | null
          output_resolution_m: number
          provider_geometry_pixel_count: number | null
          resampling_method: string
          sample_count: number
          source_pixel_count: number
          standard_deviation: number | null
          valid_pixel_count: number
          valid_pixel_fraction: number
        }
        Insert: {
          derived_coverage_pixel_count?: number | null
          index_name: string
          maximum?: number | null
          mean?: number | null
          measurement_id: string
          minimum?: number | null
          output_resolution_m: number
          provider_geometry_pixel_count?: number | null
          resampling_method: string
          sample_count: number
          source_pixel_count: number
          standard_deviation?: number | null
          valid_pixel_count: number
          valid_pixel_fraction: number
        }
        Update: {
          derived_coverage_pixel_count?: number | null
          index_name?: string
          maximum?: number | null
          mean?: number | null
          measurement_id?: string
          minimum?: number | null
          output_resolution_m?: number
          provider_geometry_pixel_count?: number | null
          resampling_method?: string
          sample_count?: number
          source_pixel_count?: number
          standard_deviation?: number | null
          valid_pixel_count?: number
          valid_pixel_fraction?: number
        }
        Relationships: [
          {
            foreignKeyName: "measurement_index_stats_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "measurement_observations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_index_stats_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "measurements"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_jobs: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          idempotency_key: string
          lahan_id: string
          max_attempts: number
          request_window_end: string
          request_window_start: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          idempotency_key: string
          lahan_id: string
          max_attempts?: number
          request_window_end: string
          request_window_start: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string
          lahan_id?: string
          max_attempts?: number
          request_window_end?: string
          request_window_start?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_jobs_lahan_id_fkey"
            columns: ["lahan_id"]
            isOneToOne: false
            referencedRelation: "lahan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_jobs_lahan_id_fkey"
            columns: ["lahan_id"]
            isOneToOne: false
            referencedRelation: "lahan_with_info"
            referencedColumns: ["id"]
          },
        ]
      }
      measurements: {
        Row: {
          acquisition_end: string | null
          acquisition_start: string | null
          algorithm_version: string
          collection: string
          created_at: string
          crs: string
          evalscript_version: string
          geometry_hash: string
          id: string
          job_id: string
          lahan_id: string
          masking_config_version: string
          mission: string
          platform: string | null
          polygon_cloud_shadow_fraction: number | null
          processing_at: string
          processing_level: string
          provider: string
          provider_provenance: Json
          quality_output_resolution_m: number
          quality_resampling_method: string
          quality_status: string
          rejection_reason: string | null
          request_window_end: string
          request_window_start: string
          source_product_ids: string[]
          tile_cloud_metadata: Json | null
          user_id: string
        }
        Insert: {
          acquisition_end?: string | null
          acquisition_start?: string | null
          algorithm_version: string
          collection: string
          created_at?: string
          crs: string
          evalscript_version: string
          geometry_hash: string
          id?: string
          job_id: string
          lahan_id: string
          masking_config_version: string
          mission: string
          platform?: string | null
          polygon_cloud_shadow_fraction?: number | null
          processing_at?: string
          processing_level: string
          provider: string
          provider_provenance?: Json
          quality_output_resolution_m: number
          quality_resampling_method: string
          quality_status: string
          rejection_reason?: string | null
          request_window_end: string
          request_window_start: string
          source_product_ids?: string[]
          tile_cloud_metadata?: Json | null
          user_id: string
        }
        Update: {
          acquisition_end?: string | null
          acquisition_start?: string | null
          algorithm_version?: string
          collection?: string
          created_at?: string
          crs?: string
          evalscript_version?: string
          geometry_hash?: string
          id?: string
          job_id?: string
          lahan_id?: string
          masking_config_version?: string
          mission?: string
          platform?: string | null
          polygon_cloud_shadow_fraction?: number | null
          processing_at?: string
          processing_level?: string
          provider?: string
          provider_provenance?: Json
          quality_output_resolution_m?: number
          quality_resampling_method?: string
          quality_status?: string
          rejection_reason?: string | null
          request_window_end?: string
          request_window_start?: string
          source_product_ids?: string[]
          tile_cloud_metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurements_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "measurement_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurements_lahan_id_fkey"
            columns: ["lahan_id"]
            isOneToOne: false
            referencedRelation: "lahan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurements_lahan_id_fkey"
            columns: ["lahan_id"]
            isOneToOne: false
            referencedRelation: "lahan_with_info"
            referencedColumns: ["id"]
          },
        ]
      }
      ndvi_estimates: {
        Row: {
          created_at: string
          dataset_version: string
          evaluation_role: string
          feature_set: string
          id: string
          lahan_id: string
          model_name: string
          model_test_mae: number | null
          model_version: string
          ndvi_estimate: number | null
          offset_days: number | null
          orbit_direction: string | null
          provenance: Json
          radar_acquired_at: string | null
          radar_product_ids: string[]
          reference_ndvi: number | null
          run_id: string
          status: string
          target_date: string
          unavailable_reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          dataset_version: string
          evaluation_role: string
          feature_set: string
          id?: string
          lahan_id: string
          model_name: string
          model_test_mae?: number | null
          model_version: string
          ndvi_estimate?: number | null
          offset_days?: number | null
          orbit_direction?: string | null
          provenance?: Json
          radar_acquired_at?: string | null
          radar_product_ids?: string[]
          reference_ndvi?: number | null
          run_id: string
          status: string
          target_date: string
          unavailable_reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          dataset_version?: string
          evaluation_role?: string
          feature_set?: string
          id?: string
          lahan_id?: string
          model_name?: string
          model_test_mae?: number | null
          model_version?: string
          ndvi_estimate?: number | null
          offset_days?: number | null
          orbit_direction?: string | null
          provenance?: Json
          radar_acquired_at?: string | null
          radar_product_ids?: string[]
          reference_ndvi?: number | null
          run_id?: string
          status?: string
          target_date?: string
          unavailable_reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ndvi_estimates_lahan_id_fkey"
            columns: ["lahan_id"]
            isOneToOne: false
            referencedRelation: "lahan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ndvi_estimates_lahan_id_fkey"
            columns: ["lahan_id"]
            isOneToOne: false
            referencedRelation: "lahan_with_info"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone_number: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          id: string
          phone_number?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone_number?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      lahan_with_info: {
        Row: {
          area_ha: number | null
          category: string | null
          centroid: Json | null
          created_at: string | null
          geojson: Json | null
          id: string | null
          name: string | null
          thumbnail_url: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          area_ha?: number | null
          category?: string | null
          centroid?: never
          created_at?: string | null
          geojson?: never
          id?: string | null
          name?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          area_ha?: number | null
          category?: string | null
          centroid?: never
          created_at?: string | null
          geojson?: never
          id?: string | null
          name?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      measurement_observations: {
        Row: {
          algorithm_version: string | null
          captured_at: string | null
          created_at: string | null
          data_state: string | null
          evalscript_version: string | null
          id: string | null
          lahan_id: string | null
          masking_config_version: string | null
          ndmi_score: number | null
          ndmi_valid_pixel_count: number | null
          ndvi_score: number | null
          ndvi_valid_pixel_count: number | null
          rejection_reason: string | null
          source_product_ids: string[] | null
          status: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "measurements_lahan_id_fkey"
            columns: ["lahan_id"]
            isOneToOne: false
            referencedRelation: "lahan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurements_lahan_id_fkey"
            columns: ["lahan_id"]
            isOneToOne: false
            referencedRelation: "lahan_with_info"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      claim_measurement_job: {
        Args: { p_job_id: string; p_user_id: string }
        Returns: Json
      }
      complete_measurement_job: {
        Args: { p_job_id: string; p_result: Json }
        Returns: string
      }
      enqueue_measurement_job: {
        Args: {
          p_idempotency_key: string
          p_lahan_id: string
          p_request_window_end: string
          p_request_window_start: string
          p_user_id: string
        }
        Returns: {
          attempts: number
          completed_at: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          idempotency_key: string
          lahan_id: string
          max_attempts: number
          request_window_end: string
          request_window_start: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "measurement_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fail_measurement_job: {
        Args: {
          p_error_code: string
          p_error_message: string
          p_job_id: string
        }
        Returns: undefined
      }
      import_ndvi_estimates: {
        Args: { p_lahan_id: string; p_rows: Json }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
