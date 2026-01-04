import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization || req.headers['Authorization'];
  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return res.status(500).json({ error: 'Missing Supabase configuration' });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    // verify requester is admin
    const { data: tokenUserData, error: tokenUserError } = await supabase.auth.getUser(token as string);
    if (tokenUserError || !tokenUserData?.user) return res.status(401).json({ error: 'Invalid token' });
    const requesterId = tokenUserData.user.id;

    const { data: requesterProfile } = await supabase.from('profiles').select('role').eq('id', requesterId).single();
    const isAdmin = requesterProfile?.role === 'admin' || tokenUserData.user?.is_super_admin === true;
    if (!isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*, bookings(*), profiles:user_id(*)')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message || String(error) });

    return res.status(200).json({ data: transactions || [] });
  } catch (err: any) {
    console.error('list-transactions error', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
