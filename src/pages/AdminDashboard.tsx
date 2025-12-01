import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plane, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminTrips from '../components/AdminTrips';
import AdminUsers from '../components/AdminUsers';
import AdminTransactions from '../components/AdminTransactions';

export default function AdminDashboard() {
  const { profile, user, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'trips' | 'users' | 'transactions'>('trips');
  const isAdminByEmail = user?.email === 'admin@sanchariescapes.com';

  if (profile?.role !== 'admin' && !isAdminByEmail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  const [promoteMessage, setPromoteMessage] = useState('');
  const promoteToAdmin = async () => {
    if (!user) return;
    setPromoteMessage('');
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', user.id);

    if (error) {
      setPromoteMessage('Failed to promote account to admin.');
    } else {
      await refreshProfile();
      setPromoteMessage('Account promoted to admin — reloading admin panel.');
      setActiveTab('users');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage trips and users</p>
        </div>

        {isAdminByEmail && profile?.role !== 'admin' && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between gap-4">
              <div>
                <strong className="text-yellow-900">Admin account detected</strong>
                <div className="text-sm text-yellow-700">Your account email matches the seeded admin user but your profile role is not set. You can promote this account to admin so the admin UI is fully enabled.</div>
                {promoteMessage && <div className="mt-2 text-sm text-yellow-800">{promoteMessage}</div>}
              </div>
              <div>
                <button onClick={promoteToAdmin} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">Make me admin</button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8 flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('trips')}
            className={`flex items-center gap-2 px-6 py-4 font-semibold transition ${
              activeTab === 'trips'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Plane className="w-5 h-5" />
            Trips Management
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-6 py-4 font-semibold transition ${
              activeTab === 'users'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Users className="w-5 h-5" />
            User Management
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-2 px-6 py-4 font-semibold transition ${
              activeTab === 'transactions'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            Transactions
          </button>
        </div>

        {activeTab === 'trips' && <AdminTrips />}
        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'transactions' && <AdminTransactions />}
      </div>
    </div>
  );
}
