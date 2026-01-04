import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization || req.headers['Authorization'];
  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return res.status(500).json({ error: 'Missing Supabase configuration' });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const { data: tokenUserData, error: tokenUserError } = await supabase.auth.getUser(token as string);
    if (tokenUserError || !tokenUserData?.user) return res.status(401).json({ error: 'Invalid token' });
    const requesterId = tokenUserData.user.id;

    const { data: requesterProfile } = await supabase.from('profiles').select('role').eq('id', requesterId).single();
    const isAdmin = requesterProfile?.role === 'admin';
    if (!isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const { transaction_id, action } = req.body || {};
    if (!transaction_id) return res.status(400).json({ error: 'transaction_id required' });
    if (!action || !['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'action must be approve or reject' });

    const newStatus = action === 'approve' ? 'completed' : 'failed';
    const { error } = await supabase.from('transactions').update({ status: newStatus }).eq('id', transaction_id);
    if (error) return res.status(500).json({ error: error.message || String(error) });

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('update-transaction error', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
