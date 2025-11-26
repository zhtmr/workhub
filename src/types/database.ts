export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          avatar_url: string | null;
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          avatar_url?: string | null;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          avatar_url?: string | null;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      ddl_history: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          ddl_content: string;
          db_type: string;
          table_count: number;
          column_count: number;
          parsed_result: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          ddl_content: string;
          db_type: string;
          table_count: number;
          column_count?: number;
          parsed_result?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          ddl_content?: string;
          db_type?: string;
          table_count?: number;
          column_count?: number;
          parsed_result?: Json | null;
          created_at?: string;
        };
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          theme: string;
          auto_convert: boolean;
          include_summary_sheet: boolean;
          notification_settings: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          theme?: string;
          auto_convert?: boolean;
          include_summary_sheet?: boolean;
          notification_settings?: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          theme?: string;
          auto_convert?: boolean;
          include_summary_sheet?: boolean;
          notification_settings?: Json;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Utility types for easier usage
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type DdlHistory = Database['public']['Tables']['ddl_history']['Row'];
export type UserSettings = Database['public']['Tables']['user_settings']['Row'];

export type InsertProfile = Database['public']['Tables']['profiles']['Insert'];
export type InsertDdlHistory = Database['public']['Tables']['ddl_history']['Insert'];
export type InsertUserSettings = Database['public']['Tables']['user_settings']['Insert'];
