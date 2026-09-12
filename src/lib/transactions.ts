import { supabase } from '@/lib/supabase';

export interface Transaction {
  id: string;
  passbook_id: string;
  user_id: string;
  type: 'credit' | 'debit';
  amount: number;
  remark: string;
  date: string;
  receipt_url: string | null;
  contact_id: string | null;
  created_at: string;
  // Joined fields
  contact?: { id: string; name: string } | null;
}

/**
 * Fetch transactions for a given passbook with pagination.
 */
export async function getTransactions(
  passbookId: string,
  page: number = 0,
  limit: number = 20
): Promise<{ data: Transaction[] | null; error: string | null }> {
  const from = page * limit;
  const to = from + limit - 1;

  const { data, error } = await supabase
    .from('transactions')
    .select('*, contact:contacts(id, name)')
    .eq('passbook_id', passbookId)
    .order('date', { ascending: false })
    .range(from, to);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as Transaction[], error: null };
}

/**
 * Fetch total credit and debit for a given passbook.
 */
export async function getTransactionTotals(
  passbookId: string
): Promise<{ data: { total_credit: number; total_debit: number } | null; error: string | null }> {
  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('passbook_id', passbookId);

  if (error) {
    return { data: null, error: error.message };
  }

  let total_credit = 0;
  let total_debit = 0;

  if (data) {
    for (const txn of data) {
      if (txn.type === 'credit') {
        total_credit += txn.amount;
      } else if (txn.type === 'debit') {
        total_debit += txn.amount;
      }
    }
  }


  return { data: { total_credit, total_debit }, error: null };
}

/**
 * Fetch total credit, total debit, and net balance for a list of passbook IDs.
 */
export async function getPassbookBalances(
  passbookIds: string[]
): Promise<{
  data: Record<string, { total_credit: number; total_debit: number; balance: number }> | null;
  error: string | null;
}> {
  if (!passbookIds || passbookIds.length === 0) {
    return { data: {}, error: null };
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('passbook_id, type, amount')
    .in('passbook_id', passbookIds);

  if (error) {
    return { data: null, error: error.message };
  }

  const result: Record<string, { total_credit: number; total_debit: number; balance: number }> = {};

  for (const id of passbookIds) {
    result[id] = { total_credit: 0, total_debit: 0, balance: 0 };
  }

  if (data) {
    for (const txn of data) {
      if (!result[txn.passbook_id]) {
        result[txn.passbook_id] = { total_credit: 0, total_debit: 0, balance: 0 };
      }
      const amt = Number(txn.amount) || 0;
      if (txn.type === 'credit') {
        result[txn.passbook_id].total_credit += amt;
      } else if (txn.type === 'debit') {
        result[txn.passbook_id].total_debit += amt;
      }
    }

    for (const id in result) {
      result[id].balance = result[id].total_credit - result[id].total_debit;
    }
  }

  return { data: result, error: null };
}

/**
 * Create a new transaction.
 */
export async function createTransaction(payload: {
  passbook_id: string;
  type: 'credit' | 'debit';
  amount: number;
  remark: string;
  date: string;
  receipt_url?: string | null;
  contact_id?: string | null;
}): Promise<{ data: Transaction | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...payload, user_id: user.id })
    .select('*, contact:contacts(id, name)')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as Transaction, error: null };
}

/**
 * Update an existing transaction.
 */
export async function updateTransaction(
  id: string,
  payload: {
    type?: 'credit' | 'debit';
    amount?: number;
    remark?: string;
    date?: string;
    receipt_url?: string | null;
    contact_id?: string | null;
  }
): Promise<{ data: Transaction | null; error: string | null }> {
  const { data, error } = await supabase
    .from('transactions')
    .update(payload)
    .eq('id', id)
    .select('*, contact:contacts(id, name)')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as Transaction, error: null };
}

/**
 * Delete a transaction.
 */
export async function deleteTransaction(
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Upload a receipt image to Supabase Storage.
 * Returns the public URL of the uploaded image.
 */
export async function uploadReceipt(
  uri: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const { readAsStringAsync } = await import('expo-file-system/legacy');
    const { decode } = await import('base64-arraybuffer');

    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `receipts/${fileName}`;

    const base64 = await readAsStringAsync(uri, {
      encoding: 'base64',
    });

    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(filePath, decode(base64), {
        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
      });

    if (error) {
      return { url: null, error: error.message };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('receipts').getPublicUrl(data.path);

    return { url: publicUrl, error: null };
  } catch (err) {
    return {
      url: null,
      error: err instanceof Error ? err.message : 'Failed to upload receipt',
    };
  }
}
