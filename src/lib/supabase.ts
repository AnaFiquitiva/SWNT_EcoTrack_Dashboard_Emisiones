import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { EmissionRow } from '../types/emission';

/** Tipado mínimo del esquema para que las consultas queden fuertemente tipadas. */
export interface Database {
  public: {
    Tables: {
      emissions: {
        Row: EmissionRow;
        Insert: Omit<EmissionRow, 'id' | 'created_at'>;
        Update: Partial<Omit<EmissionRow, 'id'>>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/**
 * Cliente único de Supabase. Es `null` cuando no hay credenciales configuradas,
 * en cuyo caso la app usa el repositorio simulado (modo demo).
 */
export const supabase: SupabaseClient<Database> | null =
  url && anonKey ? createClient<Database>(url, anonKey) : null;
