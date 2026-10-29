export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      calculation_runs: {
        Row: {
          calc_type: string
          created_at: string
          created_by: string | null
          id: string
          inputs: Json
          link_id: string | null
          method_version: string
          notes: string | null
          outputs: Json
        }
        Insert: {
          calc_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          inputs: Json
          link_id?: string | null
          method_version: string
          notes?: string | null
          outputs: Json
        }
        Update: {
          calc_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          inputs?: Json
          link_id?: string | null
          method_version?: string
          notes?: string | null
          outputs?: Json
        }
        Relationships: [
          {
            foreignKeyName: "calculation_runs_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "drainage_links"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sources: {
        Row: {
          category: string | null
          coverage: string | null
          created_at: string
          created_by: string | null
          crs: string | null
          declared_accuracy: string | null
          id: string
          imported_at: string | null
          institution: string
          integration_status: string
          last_error: string | null
          license: string | null
          limitations: string | null
          name: string
          published_at: string | null
          scale_resolution: string | null
          unit: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          category?: string | null
          coverage?: string | null
          created_at?: string
          created_by?: string | null
          crs?: string | null
          declared_accuracy?: string | null
          id?: string
          imported_at?: string | null
          institution: string
          integration_status?: string
          last_error?: string | null
          license?: string | null
          limitations?: string | null
          name: string
          published_at?: string | null
          scale_resolution?: string | null
          unit?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          category?: string | null
          coverage?: string | null
          created_at?: string
          created_by?: string | null
          crs?: string | null
          declared_accuracy?: string | null
          id?: string
          imported_at?: string | null
          institution?: string
          integration_status?: string
          last_error?: string | null
          license?: string | null
          limitations?: string | null
          name?: string
          published_at?: string | null
          scale_resolution?: string | null
          unit?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      drainage_links: {
        Row: {
          code: string
          condition: string | null
          created_at: string
          created_by: string | null
          data_quality: Database["public"]["Enums"]["data_quality"]
          deleted_at: string | null
          diameter_mm: number | null
          downstream_invert_m: number | null
          elev_method: string | null
          from_node: string | null
          id: string
          inspected_at: string | null
          length_m: number | null
          length_method: string | null
          link_type: string
          manning_n: number | null
          material: string | null
          operational_status: string | null
          shape: string | null
          source: string | null
          to_node: string | null
          updated_at: string
          upstream_invert_m: number | null
          vertical_datum: string | null
        }
        Insert: {
          code: string
          condition?: string | null
          created_at?: string
          created_by?: string | null
          data_quality?: Database["public"]["Enums"]["data_quality"]
          deleted_at?: string | null
          diameter_mm?: number | null
          downstream_invert_m?: number | null
          elev_method?: string | null
          from_node?: string | null
          id?: string
          inspected_at?: string | null
          length_m?: number | null
          length_method?: string | null
          link_type?: string
          manning_n?: number | null
          material?: string | null
          operational_status?: string | null
          shape?: string | null
          source?: string | null
          to_node?: string | null
          updated_at?: string
          upstream_invert_m?: number | null
          vertical_datum?: string | null
        }
        Update: {
          code?: string
          condition?: string | null
          created_at?: string
          created_by?: string | null
          data_quality?: Database["public"]["Enums"]["data_quality"]
          deleted_at?: string | null
          diameter_mm?: number | null
          downstream_invert_m?: number | null
          elev_method?: string | null
          from_node?: string | null
          id?: string
          inspected_at?: string | null
          length_m?: number | null
          length_method?: string | null
          link_type?: string
          manning_n?: number | null
          material?: string | null
          operational_status?: string | null
          shape?: string | null
          source?: string | null
          to_node?: string | null
          updated_at?: string
          upstream_invert_m?: number | null
          vertical_datum?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drainage_links_from_node_fkey"
            columns: ["from_node"]
            isOneToOne: false
            referencedRelation: "drainage_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drainage_links_to_node_fkey"
            columns: ["to_node"]
            isOneToOne: false
            referencedRelation: "drainage_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      drainage_nodes: {
        Row: {
          code: string
          condition: string | null
          cover_elev_m: number | null
          created_at: string
          created_by: string | null
          data_quality: Database["public"]["Enums"]["data_quality"]
          deleted_at: string | null
          elev_method: string | null
          id: string
          invert_elev_m: number | null
          latitude: number | null
          longitude: number | null
          node_type: string
          source: string | null
          srid: number
          updated_at: string
          vertical_datum: string | null
        }
        Insert: {
          code: string
          condition?: string | null
          cover_elev_m?: number | null
          created_at?: string
          created_by?: string | null
          data_quality?: Database["public"]["Enums"]["data_quality"]
          deleted_at?: string | null
          elev_method?: string | null
          id?: string
          invert_elev_m?: number | null
          latitude?: number | null
          longitude?: number | null
          node_type: string
          source?: string | null
          srid?: number
          updated_at?: string
          vertical_datum?: string | null
        }
        Update: {
          code?: string
          condition?: string | null
          cover_elev_m?: number | null
          created_at?: string
          created_by?: string | null
          data_quality?: Database["public"]["Enums"]["data_quality"]
          deleted_at?: string | null
          elev_method?: string | null
          id?: string
          invert_elev_m?: number | null
          latitude?: number | null
          longitude?: number | null
          node_type?: string
          source?: string | null
          srid?: number
          updated_at?: string
          vertical_datum?: string | null
        }
        Relationships: []
      }
      flood_events: {
        Row: {
          address: string | null
          cause_confirmed: boolean
          cause_hypothesis: string | null
          code: string
          coord_method: string | null
          created_at: string
          created_by: string | null
          damages: string | null
          data_quality: Database["public"]["Enums"]["data_quality"]
          deleted_at: string | null
          diagnosis_status: string
          duration_min: number | null
          flooded_extent_m: number | null
          has_drainage_structures: string | null
          id: string
          latitude: number | null
          longitude: number | null
          needs_inspection: boolean
          neighborhood: string | null
          notes: string | null
          observed_rain_mm: number | null
          obstructions: string | null
          occurred_at: string | null
          reported_frequency: string | null
          river_condition: string | null
          srid: number
          traffic_impact: boolean | null
          updated_at: string
          water_depth_m: number | null
          weather_conditions: string | null
        }
        Insert: {
          address?: string | null
          cause_confirmed?: boolean
          cause_hypothesis?: string | null
          code: string
          coord_method?: string | null
          created_at?: string
          created_by?: string | null
          damages?: string | null
          data_quality?: Database["public"]["Enums"]["data_quality"]
          deleted_at?: string | null
          diagnosis_status?: string
          duration_min?: number | null
          flooded_extent_m?: number | null
          has_drainage_structures?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          needs_inspection?: boolean
          neighborhood?: string | null
          notes?: string | null
          observed_rain_mm?: number | null
          obstructions?: string | null
          occurred_at?: string | null
          reported_frequency?: string | null
          river_condition?: string | null
          srid?: number
          traffic_impact?: boolean | null
          updated_at?: string
          water_depth_m?: number | null
          weather_conditions?: string | null
        }
        Update: {
          address?: string | null
          cause_confirmed?: boolean
          cause_hypothesis?: string | null
          code?: string
          coord_method?: string | null
          created_at?: string
          created_by?: string | null
          damages?: string | null
          data_quality?: Database["public"]["Enums"]["data_quality"]
          deleted_at?: string | null
          diagnosis_status?: string
          duration_min?: number | null
          flooded_extent_m?: number | null
          has_drainage_structures?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          needs_inspection?: boolean
          neighborhood?: string | null
          notes?: string | null
          observed_rain_mm?: number | null
          obstructions?: string | null
          occurred_at?: string | null
          reported_frequency?: string | null
          river_condition?: string | null
          srid?: number
          traffic_impact?: boolean | null
          updated_at?: string
          water_depth_m?: number | null
          weather_conditions?: string | null
        }
        Relationships: []
      }
      neighborhoods: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          source: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          source?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          source?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          crea: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          organization: string | null
          updated_at: string
        }
        Insert: {
          crea?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          organization?: string | null
          updated_at?: string
        }
        Update: {
          crea?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          organization?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      simulation_runs: {
        Row: {
          assumptions: string | null
          boundary_conditions: string | null
          created_at: string
          created_by: string | null
          engine: string | null
          engine_version: string | null
          error_message: string | null
          id: string
          logs: string | null
          name: string
          objective: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assumptions?: string | null
          boundary_conditions?: string | null
          created_at?: string
          created_by?: string | null
          engine?: string | null
          engine_version?: string | null
          error_message?: string | null
          id?: string
          logs?: string | null
          name: string
          objective?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assumptions?: string | null
          boundary_conditions?: string | null
          created_at?: string
          created_by?: string | null
          engine?: string | null
          engine_version?: string | null
          error_message?: string | null
          id?: string
          logs?: string | null
          name?: string
          objective?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      technical_reviews: {
        Row: {
          comments: string | null
          created_at: string
          decided_at: string | null
          decision: string
          id: string
          requested_by: string | null
          reviewer: string | null
          reviewer_crea: string | null
          target_id: string
          target_table: string
          target_version: number
        }
        Insert: {
          comments?: string | null
          created_at?: string
          decided_at?: string | null
          decision?: string
          id?: string
          requested_by?: string | null
          reviewer?: string | null
          reviewer_crea?: string | null
          target_id: string
          target_table: string
          target_version?: number
        }
        Update: {
          comments?: string | null
          created_at?: string
          decided_at?: string | null
          decision?: string
          id?: string
          requested_by?: string | null
          reviewer?: string | null
          reviewer_crea?: string | null
          target_id?: string
          target_table?: string
          target_version?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weather_snapshots: {
        Row: {
          fetched_at: string
          id: string
          latitude: number | null
          longitude: number | null
          payload: Json
          source: string
          valid_until: string
        }
        Insert: {
          fetched_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          payload: Json
          source: string
          valid_until: string
        }
        Update: {
          fetched_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          payload?: Json
          source?: string
          valid_until?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit: { Args: { _user_id: string }; Returns: boolean }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "engineer" | "technician" | "gis_analyst" | "viewer"
      data_quality:
        | "confirmado_levantamento"
        | "fonte_oficial"
        | "estimado_modelo"
        | "informado_terceiro"
        | "pendente_validacao"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "engineer", "technician", "gis_analyst", "viewer"],
      data_quality: [
        "confirmado_levantamento",
        "fonte_oficial",
        "estimado_modelo",
        "informado_terceiro",
        "pendente_validacao",
      ],
    },
  },
} as const
