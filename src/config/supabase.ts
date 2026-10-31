import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.js";

/**
 * Cliente de Supabase para servicios distintos a la base (p. ej. Storage para imágenes
 * y videos que llegan por Telegram). Las consultas a tablas se hacen con Prisma.
 * Devuelve null si SUPABASE_URL / SUPABASE_ANON_KEY no están configuradas.
 */
export const supabase: SupabaseClient | null =
  env.SUPABASE_URL && env.SUPABASE_ANON_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: { persistSession: false } })
    : null;
