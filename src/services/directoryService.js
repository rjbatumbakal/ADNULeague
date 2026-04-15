import { supabase } from './supabaseClient'

export async function getDirectoryEntries() {
  const { data, error } = await supabase
    .from('directory')
    .select('*')
    .order('department', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  return data
}
