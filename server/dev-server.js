import express from 'express';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.DEV_SERVER_PORT || 3333;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing required Supabase environment variables. Please add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env');
  console.error('Current values:', { SUPABASE_URL: !!SUPABASE_URL, SERVICE_ROLE_KEY: !!SERVICE_ROLE_KEY });
  // Do not continue - fail fast so developer notices
  process.exit(1);
}

let supabase;
let supabaseAuth; // Client for auth verification with anon key
try {
  supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  supabaseAuth = createClient(SUPABASE_URL, ANON_KEY || SERVICE_ROLE_KEY);
  console.log('Supabase clients initialized successfully');
  console.log('Using ANON_KEY:', !!ANON_KEY ? 'Yes' : 'No (fallback to SERVICE_ROLE_KEY)');
} catch (err) {
  console.error('Failed to create Supabase client', err);
  process.exit(1);
}

async function verifyAdminFromToken(token) {
  if (!token) return { ok: false, status: 401, error: 'Unauthorized' };
  try {
    // Use supabaseAuth (with ANON_KEY) to verify the user token
    const { data: tokenUserData, error: tokenUserError } = await supabaseAuth.auth.getUser(token);
    if (tokenUserError || !tokenUserData?.user) {
      console.error('Token verification failed:', tokenUserError);
      return { ok: false, status: 401, error: 'Invalid token' };
    }
    const requesterId = tokenUserData.user.id;
    
    // Use service role client to fetch profile (bypasses RLS)
    const { data: requesterProfile, error: rpErr } = await supabase.from('profiles').select('role').eq('id', requesterId).single();
    if (rpErr) {
      console.error('Error fetching requester profile', rpErr);
      return { ok: false, status: 500, error: 'Failed to verify requester profile' };
    }
    const isAdmin = requesterProfile?.role === 'admin' || tokenUserData.user?.is_super_admin === true;
    if (!isAdmin) return { ok: false, status: 403, error: 'Forbidden' };
    return { ok: true, user: tokenUserData.user };
  } catch (err) {
    console.error('verifyAdminFromToken error', err);
    return { ok: false, status: 500, error: String(err) };
  }
}

// List transactions for admin
app.get('/api/admin/list-transactions', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const v = await verifyAdminFromToken(token);
    if (!v.ok) return res.status(v.status).json({ error: v.error });

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*, bookings(*), profiles:user_id(*)')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message || String(error) });
    return res.json({ data: transactions || [] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
});

// Debug endpoint to validate Authorization token easily during local development
app.get('/api/admin/debug-token', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    // don't log full token; just presence and length
    console.log('debug-token check: token present=', !!token, 'length=', token ? token.length : 0);
    const v = await verifyAdminFromToken(token);
    return res.json({ debug: v });
  } catch (err) {
    console.error('debug-token error', err);
    return res.status(500).json({ error: String(err) });
  }
});

// Verbose debug endpoint (local-only): returns decoded JWT payload, auth.getUser result, and profiles row
// Accepts token in Authorization header or JSON body { token: '...' }
app.post('/api/admin/debug-token-verbose', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token && req.body && typeof req.body.token === 'string') token = req.body.token;
    console.log('debug-token-verbose: token present=', !!token, 'length=', token ? token.length : 0);

    if (!token) return res.status(400).json({ error: 'token required in Authorization header or { token } body' });

    function parseJwt(t) {
      try {
        const base64Url = t.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          Buffer.from(base64, 'base64').toString('binary').split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join('')
        );
        return JSON.parse(jsonPayload);
      } catch (e) {
        return null;
      }
    }

    const decoded = parseJwt(token);

    // Try to get user via supabase admin client
    let userResult = null;
    try {
      const { data: tokenUserData, error: tokenUserError } = await supabase.auth.getUser(token);
      userResult = { user: tokenUserData?.user || null, error: tokenUserError || null };
    } catch (e) {
      userResult = { user: null, error: String(e) };
    }

    // If we have a user id, try to fetch profile
    let profile = null;
    try {
      const userId = userResult?.user?.id || (decoded && decoded.sub) || null;
      if (userId) {
        const { data: p, error: pErr } = await supabase.from('profiles').select('*').eq('id', userId).single();
        profile = { profile: p || null, error: pErr || null };
      }
    } catch (e) {
      profile = { profile: null, error: String(e) };
    }

    return res.json({ token: !!token, decoded, userResult, profile });
  } catch (err) {
    console.error('debug-token-verbose error', err);
    return res.status(500).json({ error: String(err) });
  }
});

// Update transaction (approve/reject)
app.post('/api/admin/update-transaction', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const v = await verifyAdminFromToken(token);
    if (!v.ok) return res.status(v.status).json({ error: v.error });

    const { transaction_id, action } = req.body || {};
    if (!transaction_id) return res.status(400).json({ error: 'transaction_id required' });
    if (!action || !['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'action must be approve or reject' });

    const newStatus = action === 'approve' ? 'completed' : 'failed';
    const { error } = await supabase.from('transactions').update({ status: newStatus }).eq('id', transaction_id);
    if (error) return res.status(500).json({ error: error.message || String(error) });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
});

// Process refund
app.post('/api/admin/process-refund', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const v = await verifyAdminFromToken(token);
    if (!v.ok) return res.status(v.status).json({ error: v.error });

    const { transaction_id, booking_id, user_id, amount } = req.body || {};
    if (!transaction_id) return res.status(400).json({ error: 'transaction_id required' });

    // Check if already refunded to prevent duplicate refunds
    const { data: existingTx } = await supabase.from('transactions').select('status, refund_status').eq('id', transaction_id).single();
    if (existingTx?.status === 'refunded' || existingTx?.refund_status === 'processed') {
      return res.status(400).json({ error: 'Transaction already refunded' });
    }

    // Update original transaction to mark as refunded and processed
    const { error: uErr } = await supabase.from('transactions').update({ 
      status: 'refunded',
      refund_status: 'processed'
    }).eq('id', transaction_id);
    if (uErr) return res.status(500).json({ error: uErr.message || String(uErr) });

    const refundPayload = {
      user_id: user_id || null,
      booking_id: booking_id || null,
      amount: -Math.abs(Number(amount) || 0),
      payment_method: 'refund',
      status: 'completed'
    };

    const { error: iErr, data: inserted } = await supabase.from('transactions').insert(refundPayload).select('*');
    if (iErr) return res.status(500).json({ error: iErr.message || String(iErr) });

    if (booking_id) {
      await supabase.from('bookings').update({ refund_processed: true }).eq('id', booking_id);
    }

    return res.json({ success: true, refund: inserted?.[0] || null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Dev API server listening on http://localhost:${PORT}`);
});
