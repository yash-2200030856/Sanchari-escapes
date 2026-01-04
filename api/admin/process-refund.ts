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
    // verify requester is admin
    const { data: tokenUserData, error: tokenUserError } = await supabase.auth.getUser(token as string);
    if (tokenUserError || !tokenUserData?.user) return res.status(401).json({ error: 'Invalid token' });
    const requesterId = tokenUserData.user.id;

    const { data: requesterProfile } = await supabase.from('profiles').select('role').eq('id', requesterId).single();
    const isAdmin = requesterProfile?.role === 'admin' || tokenUserData.user?.is_super_admin === true;
    if (!isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const { transaction_id, booking_id, user_id, amount } = req.body || {};
    if (!transaction_id) return res.status(400).json({ error: 'transaction_id required' });

    // 1) mark original transaction refund_status = 'processed'
    const { error: uErr } = await supabase.from('transactions').update({ refund_status: 'processed' }).eq('id', transaction_id);
    if (uErr) return res.status(500).json({ error: uErr.message || String(uErr) });

    // 2) insert a refund transaction (negative amount)
    const refundPayload: any = {
      user_id: user_id || null,
      booking_id: booking_id || null,
      amount: -Math.abs(Number(amount) || 0),
      payment_method: 'refund',
      status: 'completed'
    };

    const { error: iErr, data: inserted } = await supabase.from('transactions').insert(refundPayload).select('*');
    if (iErr) return res.status(500).json({ error: iErr.message || String(iErr) });

    // 3) mark booking refund_processed
    if (booking_id) {
      await supabase.from('bookings').update({ refund_processed: true }).eq('id', booking_id);
    }

    return res.status(200).json({ success: true, refund: inserted?.[0] || null });
  } catch (err: any) {
    console.error('process-refund error', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
