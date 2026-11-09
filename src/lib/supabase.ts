import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Null means demo mode: data lives in this browser and sign-in is a role picker. */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;
export const isLive = supabase !== null;
