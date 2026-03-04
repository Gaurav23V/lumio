export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      folders: {
        Row: {
          folder_id: string;
          user_id: string;
          name: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          folder_id: string;
          user_id: string;
          name: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
          deleted_at?: string | null;
        };
        Update: Partial<{
          folder_id: string;
          user_id: string;
          name: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        }>;
      };
      books: {
        Row: {
          book_id: string;
          user_id: string;
          folder_id: string | null;
          title: string;
          author: string | null;
          original_filename: string;
          file_type: "PDF" | "EPUB";
          file_size_bytes: number;
          content_hash: string;
          cover_ref: string | null;
          drive_file_id: string;
          drive_md5: string | null;
          sync_status: "LOCAL_ONLY" | "UPLOADING" | "SYNCED" | "ERROR";
          cache_status: "NOT_CACHED" | "CACHING" | "CACHED";
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          book_id: string;
          user_id: string;
          folder_id: string | null;
          title: string;
          author: string | null;
          original_filename: string;
          file_type: "PDF" | "EPUB";
          file_size_bytes: number;
          content_hash: string;
          cover_ref: string | null;
          drive_file_id: string;
          drive_md5: string | null;
          sync_status: "LOCAL_ONLY" | "UPLOADING" | "SYNCED" | "ERROR";
          cache_status: "NOT_CACHED" | "CACHING" | "CACHED";
          created_at: string;
          updated_at: string;
          deleted_at?: string | null;
        };
        Update: Partial<{
          folder_id: string | null;
          title: string;
          author: string | null;
          original_filename: string;
          file_type: "PDF" | "EPUB";
          file_size_bytes: number;
          content_hash: string;
          cover_ref: string | null;
          drive_file_id: string;
          drive_md5: string | null;
          sync_status: "LOCAL_ONLY" | "UPLOADING" | "SYNCED" | "ERROR";
          cache_status: "NOT_CACHED" | "CACHING" | "CACHED";
          updated_at: string;
          deleted_at: string | null;
        }>;
      };
      progress: {
        Row: {
          book_id: string;
          user_id: string;
          progress_type: "PDF" | "EPUB";
          payload_json: Json;
          version: number;
          last_read_at: string;
          device_id: string | null;
          updated_at: string;
        };
        Insert: {
          book_id: string;
          user_id: string;
          progress_type: "PDF" | "EPUB";
          payload_json: Json;
          version: number;
          last_read_at: string;
          device_id: string | null;
          updated_at: string;
        };
        Update: Partial<{
          progress_type: "PDF" | "EPUB";
          payload_json: Json;
          version: number;
          last_read_at: string;
          device_id: string | null;
          updated_at: string;
        }>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
