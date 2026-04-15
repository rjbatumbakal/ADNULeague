import { isSupabaseConfigured, supabase } from "./supabaseClient";

export async function getBrackets() {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase
    .from("brackets")
    .select("*")
    .order("sport", { ascending: true })
    .order("round", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}
