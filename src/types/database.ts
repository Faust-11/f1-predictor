/**
 * Supabase database types — mirror of schema in Architecture.md §3.
 * After `supabase gen types typescript`, compare and merge with domain types in ./index.ts.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type RaceStatusDb = "upcoming" | "live" | "completed";

export type PredictionTypeDb =
  | "qualifying_podium"
  | "qualifying_top10"
  | "race_podium"
  | "race_top10"
  | "race_dnf";

export type SyncSourceDb = "openf1" | "jolpica";
export type SyncStatusDb = "success" | "error";

export interface Database {
  public: {
    Tables: {
      seasons: {
        Row: {
          id: number;
          label: string;
          is_active: boolean;
        };
        Insert: {
          id: number;
          label: string;
          is_active?: boolean;
        };
        Update: {
          id?: number;
          label?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          season_id: number;
          name: string;
          logo_url: string | null;
          color_hex: string | null;
          api_team_id: string | null;
        };
        Insert: {
          id?: string;
          season_id: number;
          name: string;
          logo_url?: string | null;
          color_hex?: string | null;
          api_team_id?: string | null;
        };
        Update: {
          id?: string;
          season_id?: number;
          name?: string;
          logo_url?: string | null;
          color_hex?: string | null;
          api_team_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "teams_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      drivers: {
        Row: {
          id: string;
          season_id: number;
          team_id: string;
          first_name: string;
          last_name: string;
          code: string;
          number: number | null;
          photo_url: string | null;
          country: string | null;
          api_driver_id: string | null;
        };
        Insert: {
          id?: string;
          season_id: number;
          team_id: string;
          first_name: string;
          last_name: string;
          code: string;
          number?: number | null;
          photo_url?: string | null;
          country?: string | null;
          api_driver_id?: string | null;
        };
        Update: {
          id?: string;
          season_id?: number;
          team_id?: string;
          first_name?: string;
          last_name?: string;
          code?: string;
          number?: number | null;
          photo_url?: string | null;
          country?: string | null;
          api_driver_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "drivers_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "drivers_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      races: {
        Row: {
          id: string;
          season_id: number;
          round: number;
          name: string;
          country: string | null;
          circuit: string | null;
          qualifying_at_utc: string | null;
          race_at_utc: string | null;
          status: RaceStatusDb;
          api_meeting_id: string | null;
          highlight_video_id: string | null;
        };
        Insert: {
          id?: string;
          season_id: number;
          round: number;
          name: string;
          country?: string | null;
          circuit?: string | null;
          qualifying_at_utc?: string | null;
          race_at_utc?: string | null;
          status?: RaceStatusDb;
          api_meeting_id?: string | null;
          highlight_video_id?: string | null;
        };
        Update: {
          id?: string;
          season_id?: number;
          round?: number;
          name?: string;
          country?: string | null;
          circuit?: string | null;
          qualifying_at_utc?: string | null;
          race_at_utc?: string | null;
          status?: RaceStatusDb;
          api_meeting_id?: string | null;
          highlight_video_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "races_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      qualifying_results: {
        Row: {
          race_id: string;
          driver_id: string;
          position: number;
        };
        Insert: {
          race_id: string;
          driver_id: string;
          position: number;
        };
        Update: {
          race_id?: string;
          driver_id?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "qualifying_results_race_id_fkey";
            columns: ["race_id"];
            isOneToOne: false;
            referencedRelation: "races";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "qualifying_results_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "drivers";
            referencedColumns: ["id"];
          },
        ];
      };
      race_results: {
        Row: {
          race_id: string;
          driver_id: string;
          position: number | null;
          dnf: boolean;
        };
        Insert: {
          race_id: string;
          driver_id: string;
          position?: number | null;
          dnf?: boolean;
        };
        Update: {
          race_id?: string;
          driver_id?: string;
          position?: number | null;
          dnf?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "race_results_race_id_fkey";
            columns: ["race_id"];
            isOneToOne: false;
            referencedRelation: "races";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "race_results_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "drivers";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      predictions: {
        Row: {
          id: string;
          user_id: string;
          race_id: string;
          type: PredictionTypeDb;
          payload: Json;
          points: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          race_id: string;
          type: PredictionTypeDb;
          payload: Json;
          points?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          race_id?: string;
          type?: PredictionTypeDb;
          payload?: Json;
          points?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "predictions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "predictions_race_id_fkey";
            columns: ["race_id"];
            isOneToOne: false;
            referencedRelation: "races";
            referencedColumns: ["id"];
          },
        ];
      };
      sync_logs: {
        Row: {
          id: string;
          source: SyncSourceDb;
          endpoint: string | null;
          status: SyncStatusDb;
          message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          source: SyncSourceDb;
          endpoint?: string | null;
          status: SyncStatusDb;
          message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          source?: SyncSourceDb;
          endpoint?: string | null;
          status?: SyncStatusDb;
          message?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      request_user_id: { Args: Record<string, never>; Returns: string | null };
      is_prediction_before_deadline: {
        Args: { p_race_id: string; p_type: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
