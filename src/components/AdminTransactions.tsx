import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction } from '../types';
import { Check, Clock } from 'lucide-react';
import TopMessage from './TopMessage';

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      // Query Supabase directly - RLS policies handle admin permission
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*, bookings(*), profiles:user_id(*)')
        .order('created_at', { ascending: false });

      if (error) {
        setMessage(error.message || 'Failed to load transactions');
        setLoading(false);
        return;
      }

      // Filter out refund transactions (payment_method = 'refund') - show only actual payments
      const filteredTransactions = (transactions || []).filter((t: any) => t.payment_method !== 'refund');
      setTransactions(filteredTransactions);
    } catch (e: any) {
      setMessage(e.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const approve = async (id: string) => {
    setMessage('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = (session as any)?.access_token;

      const resp = await fetch('/api/admin/update-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ transaction_id: id, action: 'approve' })
      });

      const contentType = (resp.headers.get('content-type') || '').toLowerCase();

      if (!resp.ok) {
        if (contentType.includes('application/json')) {
          const err = await resp.json().catch(() => ({}));
          setMessage(err.error || 'Failed to approve transaction');
        } else {
          const text = await resp.text().catch(() => '');
          setMessage(text || `Failed to approve transaction (status ${resp.status})`);
        }
        return;
      }

      setMessage('Transaction approved');
      loadTransactions();
    } catch (e: any) {
      setMessage(e.message || 'Failed to approve transaction');
    }
  };

  const rejectTransaction = async (id: string) => {
    setMessage('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = (session as any)?.access_token;

      const resp = await fetch('/api/admin/update-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ transaction_id: id, action: 'reject' })
      });

      const contentType = (resp.headers.get('content-type') || '').toLowerCase();

      if (!resp.ok) {
        if (contentType.includes('application/json')) {
          const err = await resp.json().catch(() => ({}));
          setMessage(err.error || 'Failed to reject transaction');
        } else {
          const text = await resp.text().catch(() => '');
          setMessage(text || `Failed to reject transaction (status ${resp.status})`);
        }
        return;
      }

      setMessage('Transaction rejected');
      loadTransactions();
    } catch (e: any) {
      setMessage(e.message || 'Failed to reject transaction');
    }
  };

  const processRefund = async (id: string, amount: number, booking_id?: string, user_id?: string) => {
    // Prevent duplicate refunds
    if (processingId === id) return;
    
    setMessage('');
    setProcessingId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = (session as any)?.access_token;

      const resp = await fetch('/api/admin/process-refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ transaction_id: id, booking_id, user_id, amount })
      });

      const contentType = (resp.headers.get('content-type') || '').toLowerCase();

      if (!resp.ok) {
        if (contentType.includes('application/json')) {
          const err = await resp.json().catch(() => ({}));
          setMessage(err.error || 'Failed to process refund');
        } else {
          const text = await resp.text().catch(() => '');
          setMessage(text || `Failed to process refund (status ${resp.status})`);
        }
        setProcessingId(null);
        return;
      }

      if (contentType.includes('application/json')) {
        const json = await resp.json().catch(() => ({}));
        if (json.success) {
          setMessage('Refund processed');
          setProcessingId(null);
          loadTransactions();
        } else {
          setMessage(json.error || 'Failed to process refund');
          setProcessingId(null);
        }
      } else {
        const text = await resp.text().catch(() => '');
        setMessage(`Unexpected non-JSON response from refund endpoint: ${text.slice(0,200)}`);
        setProcessingId(null);
      }
    } catch (e) {
      setMessage('Failed to process refund');
      setProcessingId(null);
    }
  };

  if (loading) return <div className="p-6">Loading transactions...</div>;

  return (
    <div>
      <TopMessage message={message} type="success" onClose={() => setMessage('')} />

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">User</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Booking</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Method</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm font-mono text-gray-600">{t.id.slice(0,8)}...</td>
                  <td className="px-6 py-4 text-sm text-gray-800">{(t as any).profiles?.full_name || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-800">{(t as any).bookings?.id?.slice?.(0,8) ?? 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-800">₹{t.amount}</td>
                  <td className="px-6 py-4 text-sm text-gray-800">{t.payment_method}</td>
                  <td className="px-6 py-4 text-sm text-gray-800">
                    {t.status === 'completed' ? (
                      <div className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium"><Check className="w-4 h-4"/> Completed</div>
                    ) : t.status === 'refunded' ? (
                      <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"><Check className="w-4 h-4"/> Refunded</div>
                    ) : t.status === 'cancelled' ? (
                      <div className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">Cancelled</div>
                    ) : (
                      <div className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium"><Clock className="w-4 h-4"/> {t.status}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      {t.status === 'pending' && (
                        <>
                          <button onClick={() => approve(t.id)} className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Approve</button>
                          <button onClick={() => rejectTransaction(t.id)} className="px-3 py-1 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400">Reject</button>
                        </>
                      )}
                      {t.status === 'completed' && t.refund_status !== 'processed' && (((t as any).bookings?.refund_requested === true) || t.refund_status === 'pending') && (
                        <button 
                          onClick={() => processRefund(t.id, t.amount, (t as any).booking_id, t.user_id)} 
                          disabled={processingId === t.id}
                          className={`px-3 py-1 rounded-lg text-white ${
                            processingId === t.id 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : 'bg-red-600 hover:bg-red-700'
                          }`}
                        >
                          {processingId === t.id ? 'Processing...' : 'Refund'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
