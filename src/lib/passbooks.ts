import { supabase } from '@/lib/supabase';

export interface Passbook {
  id: string;
  business_id: string;
  user_id: string;
  name: string;
  created_at: string;
}

/**
 * Fetch all passbooks for a given business.
 */
export async function getPassbooks(
  businessId: string
): Promise<{ data: Passbook[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('passbooks')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Create a new passbook under a business.
 */
export async function createPassbook(
  businessId: string,
  name: string
): Promise<{ data: Passbook | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('passbooks')
    .insert({ business_id: businessId, user_id: user.id, name })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Update the name of a passbook.
 */
export async function updatePassbook(
  passbookId: string,
  name: string
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('passbooks')
    .update({ name })
    .eq('id', passbookId)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Delete a passbook by ID.
 */
export async function deletePassbook(
  passbookId: string
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('passbooks')
    .delete()
    .eq('id', passbookId)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
