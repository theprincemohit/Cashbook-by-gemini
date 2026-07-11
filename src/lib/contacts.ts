import { supabase } from '@/lib/supabase';

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

/**
 * Fetch all contacts for the current user.
 */
export async function getContacts(): Promise<{
  data: Contact[] | null;
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Create a new contact.
 */
export async function createContact(
  name: string
): Promise<{ data: Contact | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('contacts')
    .insert({ name, user_id: user.id })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}
