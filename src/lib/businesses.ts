import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';

export interface Business {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  is_synced?: number;
}

const db = SQLite.openDatabaseSync('cashdiary.db');

/**
 * Fetch all businesses for the current authenticated user from local SQLite.
 */
export async function getBusinesses(): Promise<{
  data: Business[] | null;
  error: string | null;
}> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  try {
    const data = await db.getAllAsync<Business>(
      'SELECT * FROM businesses WHERE user_id = ? ORDER BY created_at DESC',
      [user.id]
    );

    // Background sync: Fetch from Supabase and update local SQLite silently
    supabase
      .from('businesses')
      .select('*')
      .eq('user_id', user.id)
      .then(async ({ data: remoteData, error }) => {
        if (!error && remoteData) {
          for (const business of remoteData) {
            await db.runAsync(
              'INSERT OR REPLACE INTO businesses (id, user_id, name, created_at, is_synced) VALUES (?, ?, ?, ?, 1)',
              [business.id, business.user_id, business.name, business.created_at]
            );
          }
        }
      });

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

/**
 * Create a new business for the current authenticated user locally and push to Supabase.
 */
export async function createBusiness(
  name: string
): Promise<{ data: Business | null; error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Generate a random ID for local creation
  const tempId = Crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const localBusiness: Business = {
    id: tempId,
    user_id: user.id,
    name,
    created_at: createdAt,
    is_synced: 0
  };

  try {
    await db.runAsync(
      'INSERT INTO businesses (id, user_id, name, created_at, is_synced) VALUES (?, ?, ?, ?, 0)',
      [localBusiness.id, localBusiness.user_id, localBusiness.name, localBusiness.created_at]
    );

    // Sync to Supabase in the background
    supabase
      .from('businesses')
      .insert({ name, user_id: user.id })
      .select()
      .single()
      .then(async ({ data, error }) => {
        if (!error && data) {
          await db.runAsync('DELETE FROM businesses WHERE id = ?', [localBusiness.id]);
          await db.runAsync(
            'INSERT INTO businesses (id, user_id, name, created_at, is_synced) VALUES (?, ?, ?, ?, 1)',
            [data.id, data.user_id, data.name, data.created_at]
          );
        }
      });

    return { data: localBusiness, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

/**
 * Update the name of a business locally and on Supabase.
 */
export async function updateBusiness(
  businessId: string,
  name: string
): Promise<{ error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    await db.runAsync(
      'UPDATE businesses SET name = ?, is_synced = 0 WHERE id = ? AND user_id = ?',
      [name, businessId, user.id]
    );

    supabase
      .from('businesses')
      .update({ name })
      .eq('id', businessId)
      .eq('user_id', user.id)
      .then(async ({ error }) => {
        if (!error) {
          await db.runAsync('UPDATE businesses SET is_synced = 1 WHERE id = ?', [businessId]);
        }
      });

    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Delete a business by ID locally and on Supabase.
 */
export async function deleteBusiness(
  businessId: string
): Promise<{ error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    await db.runAsync(
      'DELETE FROM businesses WHERE id = ? AND user_id = ?',
      [businessId, user.id]
    );

    supabase
      .from('businesses')
      .delete()
      .eq('id', businessId)
      .eq('user_id', user.id)
      .then(() => { });

    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
}
