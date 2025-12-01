import { useEffect, useState } from 'react';
import { supabase, Transaction } from '../lib/supabase';
import { Check, Clock } from 'lucide-react';
import TopMessage from './TopMessage';

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*, bookings(*), profiles:user_id(*)')
      .order('created_at', { ascending: false });

    if (!error && data) setTransactions(data as any);
    setLoading(false);
  };

  const approve = async (id: string) => {
    setMessage('');
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'completed' })
      .eq('id', id);

    if (error) setMessage('Failed to update transaction');
    else {
      setMessage('Transaction approved');
      loadTransactions();
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
                    ) : (
                      <div className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium"><Clock className="w-4 h-4"/> {t.status}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {t.status !== 'completed' && (
                      <button onClick={() => approve(t.id)} className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Approve</button>
                    )}
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
