import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Calendar, Users, Clock, X } from 'lucide-react';
import TopMessage from '../components/TopMessage';
import { Transaction } from '../lib/supabase';

type Booking = {
  id: string;
  user_id: string;
  trip_id: string;
  start_date: string;
  end_date: string;
  travelers_count: number;
  total_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  destinations?: {
    id: string;
    name: string;
    country: string;
    image_url: string;
  };
  transactions?: Transaction[];
};

export default function UpcomingTrips() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelMessage, setCancelMessage] = useState('');
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadUpcomingTrips();
    }
  }, [user]);

  const loadUpcomingTrips = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, destinations(*), transactions(*)')
      .eq('user_id', user!.id)
      .gte('end_date', new Date().toISOString().split('T')[0])
      .eq('status', 'upcoming')
      .order('start_date', { ascending: true });

    if (!error && data) {
      setTrips(data);
    }
    setLoading(false);
  };

  const getDaysUntil = (startDate: string) => {
    const today = new Date();
    const tripDate = new Date(startDate);
    const diffTime = tripDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleCancelTrip = async (bookingId: string, tripName: string) => {
    if (!window.confirm(`Are you sure you want to cancel this trip to ${tripName}?`)) {
      return;
    }

    setCancelingId(bookingId);
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    if (error) {
      setCancelMessage('Failed to cancel trip');
      setCancelingId(null);
      setTimeout(() => setCancelMessage(''), 3000);
      return;
    }

    try {
      const { data: txs } = await supabase
        .from('transactions')
        .select('*')
        .eq('booking_id', bookingId);

      if (txs && txs.length > 0) {
        await supabase
          .from('transactions')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('booking_id', bookingId);

        const refundable = txs.filter((t: any) => {
          const m = (t.payment_method || '').toLowerCase();
          return t.status === 'completed' && (m === 'card' || m === 'credit_card' || m === 'cash' || m === 'card_payment');
        });

        if (refundable.length > 0) {
          await supabase.from('bookings').update({ refund_requested: true }).eq('id', bookingId);
        }
      }
    } catch (e) {
      console.error('error updating transaction status', e);
    }

    setCancelMessage('Trip cancelled successfully');
    loadUpcomingTrips();
    setCancelingId(null);

    setTimeout(() => setCancelMessage(''), 3000);
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
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Upcoming Trips</h1>
          <p className="text-gray-600">Your scheduled adventures await</p>
        </div>

        <TopMessage
          message={cancelMessage}
          type={cancelMessage.includes('successfully') ? 'success' : 'error'}
          onClose={() => setCancelMessage('')}
        />

        {trips.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Upcoming Trips</h3>
            <p className="text-gray-600">
              You don't have any trips scheduled. Start planning your next adventure!
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => {
              const daysUntil = getDaysUntil(trip.start_date);
              return (
                <div
                  key={trip.id}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition"
                >
                  {trip.destinations && (
                    <>
                        <div className="relative h-48 overflow-hidden">
                        <img
                          src={trip.destinations.image_url}
                          alt={trip.destinations.name}
                          className="w-full h-full object-cover"
                        />
                            <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1"
                              style={{ background: trip.transactions?.some(t => t.status === 'completed') ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)', color: trip.transactions?.some(t => t.status === 'completed') ? '#10B981' : '#2563eb' }}>
                          <Clock className="w-4 h-4" />
                          {daysUntil > 0 ? `${daysUntil} days` : 'Today'}
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm">{trip.destinations.country}</span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-4">
                          {trip.destinations.name}
                        </h3>
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span className="text-sm">
                              {new Date(trip.start_date).toLocaleDateString()} -{' '}
                              {new Date(trip.end_date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Users className="w-4 h-4" />
                            <span className="text-sm">
                              {trip.travelers_count} {trip.travelers_count === 1 ? 'Traveler' : 'Travelers'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-blue-600 font-bold">
                            <span className="text-lg">₹{trip.total_amount}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 items-center">
                          {trip.transactions && trip.transactions.length > 0 && (
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${trip.transactions.some(t => t.status === 'completed') ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {trip.transactions.some(t => t.status === 'completed') ? 'Paid' : 'Payment pending'}
                            </div>
                          )}
                          {daysUntil > 0 && daysUntil <= 7 && (
                            <div className="flex-1 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg text-sm font-medium text-center">
                              Trip starting soon!
                            </div>
                          )}
                          <button
                            onClick={() =>
                              handleCancelTrip(trip.id, trip.destinations?.name ?? '')
                            }
                            disabled={cancelingId === trip.id}
                            className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-600 px-4 py-2 rounded-lg transition font-semibold disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
