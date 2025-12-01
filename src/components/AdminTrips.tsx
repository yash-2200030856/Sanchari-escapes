import { useEffect, useState } from 'react';
import { supabase, Destination } from '../lib/supabase';
import { Plus, Edit2, Trash2, MapPin } from 'lucide-react';
import styles from './AdminTrips.module.css';
import TopMessage from './TopMessage';

export default function AdminTrips() {
  const [trips, setTrips] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    description: '',
    image_url: '',
    price_per_person: '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .order('name');

    if (!error && data) {
      setTrips(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!formData.name || !formData.country || !formData.price_per_person) {
      setError('Please fill in all required fields');
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from('destinations')
        .update({
          name: formData.name,
          country: formData.country,
          description: formData.description,
          image_url: formData.image_url,
          price_per_person: parseFloat(formData.price_per_person),
        })
        .eq('id', editingId);

      if (error) {
        setError('Failed to update trip');
      } else {
        setMessage('Trip updated successfully');
        loadTrips();
        resetForm();
      }
    } else {
      const { error } = await supabase.from('destinations').insert({
        name: formData.name,
        country: formData.country,
        description: formData.description,
        image_url: formData.image_url,
        price_per_person: parseFloat(formData.price_per_person),
      });

      if (error) {
        setError('Failed to create trip');
      } else {
        setMessage('Trip created successfully');
        loadTrips();
        resetForm();
      }
    }
  };

  const handleEdit = (trip: Destination) => {
    setFormData({
      name: trip.name,
      country: trip.country,
      description: trip.description || '',
      image_url: trip.image_url || '',
      price_per_person: trip.price_per_person.toString(),
    });
    setEditingId(trip.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this trip?')) {
      const { error } = await supabase.from('destinations').delete().eq('id', id);

      if (error) {
        setError('Failed to delete trip');
      } else {
        setMessage('Trip deleted successfully');
        loadTrips();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      country: '',
      description: '',
      image_url: '',
      price_per_person: '',
    });
    setEditingId(null);
    setShowModal(false);
  };

  if (loading) {
    return <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div>
      <TopMessage message={message} type="success" onClose={() => setMessage('')} />
      <TopMessage message={error} type="error" onClose={() => setError('')} />

      <button
        onClick={() => {
          setEditingId(null);
          resetForm();
          setShowModal(true);
        }}
        className={styles.addButton}
      >
        <Plus className="w-5 h-5" />
        Add New Trip
      </button>

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalInner}>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                {editingId ? 'Edit Trip' : 'Add New Trip'}
              </h2>

              <form onSubmit={handleSubmit} className={styles.form}>
                <div>
                  <label className={styles.formLabel}>
                    Trip Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={styles.formInput}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={styles.textarea}
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className={styles.formInput}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price per Person (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.price_per_person}
                    onChange={(e) => setFormData({ ...formData, price_per_person: e.target.value })}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.actions}>
                  <button
                    type="submit"
                    className={styles.primaryBtn}
                  >
                    {editingId ? 'Update Trip' : 'Create Trip'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className={styles.secondaryBtn}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className={styles.tripsGrid}>
        {trips.map((trip) => (
          <div key={trip.id} className={styles.tripCard}>
            {trip.image_url && (
              <div className={styles.imgWrap}>
                <img
                  src={trip.image_url}
                  alt={trip.name}
                  className={styles.img}
                />
              </div>
            )}
            <div className={styles.meta}>
              <div className={styles.metaTop}>
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{trip.country}</span>
              </div>
              <h3 className={styles.title}>{trip.name}</h3>
              <p className={styles.desc}>{trip.description}</p>
              <div className={styles.priceArea}>
                <div className={styles.price}>₹{trip.price_per_person}</div>
              </div>
              <div className={styles.controls}>
                <button onClick={() => handleEdit(trip)} className={styles.editBtn}>
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button onClick={() => handleDelete(trip.id)} className={styles.deleteBtn}>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
