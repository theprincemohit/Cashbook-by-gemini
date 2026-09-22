import { supabase } from '@/lib/supabase';

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  phone?: string | null;
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
  name: string,
  phone?: string
): Promise<{ data: Contact | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  const payload: { name: string; user_id: string; phone?: string } = {
    name,
    user_id: user.id,
  };
  if (phone) {
    payload.phone = phone;
  }

  const { data, error } = await supabase
    .from('contacts')
    .insert(payload)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Update an existing contact.
 */
export async function updateContact(
  id: string,
  name: string,
  phone?: string
): Promise<{ data: Contact | null; error: string | null }> {
  const payload: { name: string; phone?: string | null } = { name };
  if (phone !== undefined) {
    payload.phone = phone || null;
  }
  console.log("payload", payload, id);
  const { data, error } = await supabase
    .from('contacts')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as Contact, error: null };
}

/**
 * Delete a contact.
 */
export async function deleteContact(
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('contacts').delete().eq('id', id);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
