import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { CreditCard, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function TransactionHistory() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user]);

  const loadTransactions = async () => {
    try {
      // First try to fetch just transactions
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (txError) {
        console.error('Error loading transactions:', txError);
        setTransactions([]);
      } else if (txData && txData.length > 0) {
        console.log('Loaded transactions:', txData);
        
        // Now fetch bookings and trips separately for each transaction
        const enrichedData = await Promise.all(
          txData.map(async (tx: any) => {
            let bookingWithDestination = null;
            if (tx.booking_id) {
              try {
                // First get the booking
                const { data: bookingData, error: bookingError } = await supabase
                  .from('bookings')
                  .select('*')
                  .eq('id', tx.booking_id)
                  .single();

                if (!bookingError && bookingData && bookingData.trip_id) {
                  // booking.trip_id actually points to destinations.id
                  const { data: destinationData, error: destError } = await supabase
                    .from('destinations')
                    .select('*')
                    .eq('id', bookingData.trip_id)
                    .single();

                  if (!destError && destinationData) {
                    bookingWithDestination = {
                      ...bookingData,
                      destinations: destinationData
                    };
                  } else {
                    bookingWithDestination = bookingData; // fallback without destination
                  }
                }
              } catch (e) {
                console.error('Error fetching booking/destination for tx', tx.id, e);
              }
            }
            return {
              ...tx,
              bookings: bookingWithDestination
            };
          })
        );

        console.log('Enriched transactions with destinations:', enrichedData);
        setTransactions(enrichedData);
      } else {
        console.log('No transactions found for user');
        setTransactions([]);
      }
    } catch (err) {
      console.error('Exception loading transactions:', err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-gray-500" />;
      case 'refunded':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'refunded':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Transaction History</h1>
          <p className="text-gray-600">View all your payment transactions</p>
        </div>

        {transactions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <CreditCard className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Transactions</h3>
            <p className="text-gray-600">
              You don't have any transactions yet. Book your first trip to get started!
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Transaction ID
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Destination
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Payment Method
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-gray-600">
                          {transaction.id.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-800">
                          {(transaction as any).bookings?.destinations?.name || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(transaction as any).bookings?.destinations?.country || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-blue-600">
                          ₹{transaction.amount}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {transaction.payment_method || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(
                            transaction.status
                          )}`}
                        >
                          {getStatusIcon(transaction.status)}
                          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
