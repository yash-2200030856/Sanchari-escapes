import { useEffect, useState } from 'react';
import { supabase, Transaction } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Calendar, Users, CheckCircle, Star, AlertCircle } from 'lucide-react';
import ReviewModal from '../components/ReviewModal';
import TopMessage from '../components/TopMessage';

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
  reviews?: Array<{
    id: string;
    rating: number;
    comment: string;
  }>;
  transactions?: Transaction[];
};

export default function RecentTrips() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedTripName, setSelectedTripName] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');

  useEffect(() => {
    if (user) {
      loadRecentTrips();
    }
  }, [user]);

  const loadRecentTrips = async () => {
    // Show bookings that have completed (end_date < today) OR were cancelled
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('bookings')
      .select('*, destinations(*), reviews(*), transactions(*)')
      .eq('user_id', user!.id)
      .or(`end_date.lt.${today},status.eq.cancelled`)
      .order('end_date', { ascending: false });

    if (!error && data) {
      setTrips(data);
    }
    setLoading(false);
  };

  const handleReviewClick = (bookingId: string, tripName: string) => {
    setSelectedBookingId(bookingId);
    setSelectedTripName(tripName);
    setShowReviewModal(true);
    setReviewMessage('');
  };

  const handleSubmitReview = async (rating: number, comment: string) => {
    if (!selectedBookingId) return;

    const { error } = await supabase.from('reviews').insert({
      user_id: user!.id,
      booking_id: selectedBookingId,
      rating,
      comment,
    });

    if (error) {
      setReviewMessage('Failed to submit review');
      return;
    }

    setReviewMessage('Review submitted successfully');
    setShowReviewModal(false);
    loadRecentTrips();
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
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Recent Trips</h1>
          <p className="text-gray-600">Your completed travel adventures</p>
        </div>

        <TopMessage message={reviewMessage} type="success" onClose={() => setReviewMessage('')} />

        {trips.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Recent Trips</h3>
            <p className="text-gray-600">
              You haven't completed any trips yet. Start planning your next adventure!
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trips.map((trip) => {
              const existingReview = trip.reviews && trip.reviews.length > 0;
                const paid = trip.transactions?.some((t: Transaction) => t.status === 'completed');
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
                          className={`w-full h-full object-cover ${
                            trip.status === 'cancelled' ? 'opacity-50 grayscale' : ''
                          }`}
                        />
                        <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 ${
                          trip.status === 'cancelled'
                            ? 'bg-red-500 text-white'
                            : 'bg-green-500 text-white'
                        }`}>
                          {trip.status === 'cancelled' ? (
                            <>
                              <AlertCircle className="w-4 h-4" />
                              Cancelled
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Completed
                            </>
                          )}
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
                              {trip.travelers_count}{' '}
                              {trip.travelers_count === 1 ? 'Traveler' : 'Travelers'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-blue-600 font-bold">
                            <span className="text-lg">₹{trip.total_amount}</span>
                          </div>
                          {trip.transactions && trip.transactions.length > 0 && (
                            <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${paid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {paid ? 'Paid' : 'Payment pending'}
                            </div>
                          )}
                        </div>

                        {trip.status === 'cancelled' ? (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-600 font-medium">This trip was cancelled</p>
                          </div>
                        ) : existingReview ? (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < (trip.reviews?.[0].rating || 0)
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <p className="text-sm text-gray-600">
                              {trip.reviews?.[0].comment || 'No comment provided'}
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              handleReviewClick(trip.id, trip.destinations?.name ?? '')
                            }
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-semibold flex items-center justify-center gap-2"
                          >
                            <Star className="w-4 h-4" />
                            Leave a Review
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showReviewModal && (
        <ReviewModal
          tripName={selectedTripName}
          onClose={() => setShowReviewModal(false)}
          onSubmit={handleSubmitReview}
        />
      )}
    </div>
  );
}
