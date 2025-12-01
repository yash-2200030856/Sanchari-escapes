import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import RecentTrips from './pages/RecentTrips';
import TransactionHistory from './pages/TransactionHistory';
import UpcomingTrips from './pages/UpcomingTrips';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user && (currentPage === 'login' || currentPage === 'signup')) {
    if (currentPage === 'login') {
      return <Login onNavigate={handleNavigate} />;
    }
    return <Signup onNavigate={handleNavigate} />;
  }

  if (!user && currentPage !== 'home') {
    setCurrentPage('home');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onNavigate={handleNavigate} currentPage={currentPage} />
      {currentPage === 'home' && <Home onNavigate={handleNavigate} />}
      {currentPage === 'recent-trips' && user && <RecentTrips />}
      {currentPage === 'transaction-history' && user && <TransactionHistory />}
      {currentPage === 'upcoming-trips' && user && <UpcomingTrips />}
      {currentPage === 'profile' && user && <Profile />}
      {currentPage === 'admin' && user && <AdminDashboard />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
