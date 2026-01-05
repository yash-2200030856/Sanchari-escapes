import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization || req.headers['Authorization'];
  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing Supabase config:', { SUPABASE_URL: !!SUPABASE_URL, SERVICE_ROLE_KEY: !!SERVICE_ROLE_KEY });
    return res.status(500).json({ error: 'Missing Supabase configuration' });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    // verify requester is admin
    const { data: tokenUserData, error: tokenUserError } = await supabase.auth.getUser(token as string);
    if (tokenUserError || !tokenUserData?.user) {
      console.error('Token verification failed:', tokenUserError);
      return res.status(401).json({ error: 'Invalid token' });
    }
    const requesterId = tokenUserData.user.id;

    const { data: requesterProfile } = await supabase.from('profiles').select('role').eq('id', requesterId).single();
    const isAdmin = requesterProfile?.role === 'admin';
    if (!isAdmin) {
      console.error('User is not admin:', { requesterId, role: requesterProfile?.role });
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { transaction_id, booking_id, user_id, amount } = req.body || {};
    console.log('Refund request:', { transaction_id, booking_id, user_id, amount });
    
    if (!transaction_id) return res.status(400).json({ error: 'transaction_id required' });

    // 1) mark original transaction as refunded
    const { error: uErr } = await supabase
      .from('transactions')
      .update({ 
        status: 'refunded',
        refund_status: 'processed'
      })
      .eq('id', transaction_id);
    if (uErr) {
      console.error('Error updating transaction:', uErr);
      return res.status(500).json({ error: 'Failed to mark transaction as refunded: ' + (uErr.message || String(uErr)) });
    }

    // 2) insert a refund transaction (negative amount)
    const refundPayload: any = {
      user_id: user_id || null,
      booking_id: booking_id || null,
      amount: -Math.abs(Number(amount) || 0),
      payment_method: 'refund',
      status: 'completed'
    };

    console.log('Inserting refund transaction:', refundPayload);
    
    const { error: iErr, data: inserted } = await supabase
      .from('transactions')
      .insert(refundPayload)
      .select('*');
    if (iErr) {
      console.error('Error inserting refund transaction:', iErr);
      return res.status(500).json({ error: 'Failed to insert refund transaction: ' + (iErr.message || String(iErr)) });
    }

    // 3) mark booking refund_processed
    if (booking_id) {
      const { error: bErr } = await supabase
        .from('bookings')
        .update({ refund_processed: true })
        .eq('id', booking_id);
      if (bErr) {
        console.error('Error updating booking:', bErr);
        // Don't fail if booking update fails - refund was already processed
      }
    }

    console.log('Refund processed successfully');
    return res.status(200).json({ success: true, refund: inserted?.[0] || null });
  } catch (err: any) {
    console.error('process-refund error', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
