/**
 * Supabase Database Types
 * 
 * These types match the database schema in Supabase
 */

export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          platform: string;
          region: string;
          condition_type: string;
          grading_company: string | null;
          grade: number | null;
          seal_rating: string | null;
          purchase_price: number;
          current_value: number;
          purchase_date: string;
          source: string;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          platform: string;
          region?: string;
          condition_type?: string;
          grading_company?: string | null;
          grade?: number | null;
          seal_rating?: string | null;
          purchase_price: number;
          current_value: number;
          purchase_date?: string;
          source: string;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          platform?: string;
          region?: string;
          condition_type?: string;
          grading_company?: string | null;
          grade?: number | null;
          seal_rating?: string | null;
          purchase_price?: number;
          current_value?: number;
          purchase_date?: string;
          source?: string;
          image_url?: string | null;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
        };
      };
    };
  };
}

// Helper type for game rows
export type GameRow = Database['public']['Tables']['games']['Row'];
export type GameInsert = Database['public']['Tables']['games']['Insert'];
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
