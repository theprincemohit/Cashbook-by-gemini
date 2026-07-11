import { supabase } from '@/lib/supabase';

export interface Business {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

/**
 * Fetch all businesses for the current authenticated user.
 */
export async function getBusinesses(): Promise<{
  data: Business[] | null;
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Create a new business for the current authenticated user.
 */
export async function createBusiness(
  name: string
): Promise<{ data: Business | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('businesses')
    .insert({ name, user_id: user.id })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Update the name of a business.
 */
export async function updateBusiness(
  businessId: string,
  name: string
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }
  const { error } = await supabase
    .from('businesses')
    .update({ name })
    .eq('id', businessId)
    .eq('user_id', user.id);
  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Delete a business by ID.
 */
export async function deleteBusiness(
  businessId: string
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('businesses')
    .delete()
    .eq('id', businessId)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
