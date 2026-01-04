import { useEffect, useState } from 'react';
import { supabase, Destination } from '../lib/supabase';
import { MapPin, Users, ArrowRight, Globe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import styles from './Home.module.css';
import BookingModal from '../components/BookingModal';
import TopMessage from '../components/TopMessage';

export default function Home({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { user } = useAuth();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    loadDestinations();
  }, []);

  const loadDestinations = async () => {
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .order('name');

    if (!error && data) {
      setDestinations(data);
    }
    setLoading(false);
  };

  const handleBookClick = (destination: Destination) => {
    if (!user) {
      onNavigate('signup');
      return;
    }
    setSelectedDestination(destination);
    setShowBookingModal(true);
    setBookingError('');
  };

  const handleBooking = async (startDate: string, endDate: string, travelers: number) => {
    if (!user || !selectedDestination || isBooking) return;

    setIsBooking(true);
    setBookingError('');

    try {
      const paymentMethod = 'Cash';
      const totalAmount = selectedDestination.price_per_person * travelers;

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          trip_id: selectedDestination.id,
          start_date: startDate,
          end_date: endDate,
          travelers_count: travelers,
          total_amount: totalAmount,
          status: 'upcoming',
        })
        .select()
        .single();

      if (bookingError) {
        setBookingError('Failed to create booking');
        return;
      }

      const { error: transactionError } = await supabase.from('transactions').insert({
        user_id: user.id,
        booking_id: booking.id,
        amount: totalAmount,
        payment_method: paymentMethod,
        status: 'pending',
      });

      if (transactionError) {
        setBookingError('Booking created but payment failed');
        return;
      }

      setShowBookingModal(false);
      setSelectedDestination(null);
      setBookingSuccess(`Your trip to ${selectedDestination.name} has been booked — payment marked as pending (pay by cash). You will be redirected shortly.`);

      setTimeout(() => {
        setBookingSuccess('');
        onNavigate('upcoming-trips');
      }, 2000);
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className={styles.page}>
      <TopMessage message={bookingSuccess} type="success" onClose={() => setBookingSuccess('')} />
      <TopMessage message={bookingError} type="error" onClose={() => setBookingError('')} />

      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.center}>
            <h1 className={styles.heroTitle}>
              Explore the World
            </h1>
            <p className={styles.heroLead}>
              Discover amazing destinations and create unforgettable memories
            </p>
            {!user && (
              <button
                onClick={() => onNavigate('signup')}
                className={styles.ctaBtn}
              >
                Start Your Journey
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Why Choose Us</h2>
            <p className="text-xl text-gray-600">Your perfect travel companion</p>
          </div>

          <div className={styles.cardGrid}>
            <div className={styles.card}>
              <div className={`${styles.iconCircle} ${styles.iconBlue}`}>
                <Globe className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Best Destinations</h3>
              <p className="text-gray-600">
                Handpicked locations around the world for an unforgettable experience
              </p>
            </div>

            <div className={styles.card}>
              <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <span className="text-teal-600 text-2xl font-bold">₹</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Best Prices</h3>
              <p className="text-gray-600">
                Competitive pricing with transparent billing and no hidden fees
              </p>
            </div>

            <div className={styles.card}>
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">24/7 Support</h3>
              <p className="text-gray-600">
                Our dedicated team is always here to help you plan your perfect trip
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} bg-white`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Popular Destinations</h2>
            <p className="text-xl text-gray-600">Discover where your next adventure awaits</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className={styles.destinationGrid}>
              {destinations.map((destination) => (
                <div
                  key={destination.id}
                  className={styles.destCard}
                >
                  <div className={styles.destImageWrap}>
                    <img
                      src={destination.image_url}
                      alt={destination.name}
                      className={styles.destImage}
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{destination.country}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">
                      {destination.name}
                    </h3>
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {destination.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-600 font-bold text-xl">
                        <span className="text-lg">₹{destination.price_per_person}</span>
                      </div>
                      <button
                        onClick={() => handleBookClick(destination)}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className={styles.footerSection}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Start Your Adventure?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of travelers who trust us with their journeys
          </p>
          {!user && (
              <button
              onClick={() => onNavigate('signup')}
                className={styles.ctaBtn}
            >
              Create Your Account
            </button>
          )}
        </div>
      </section>

      {showBookingModal && selectedDestination && (
        <BookingModal
          destination={selectedDestination}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedDestination(null);
          }}
          onBook={handleBooking}
        />
      )}
    </div>
  );
}
