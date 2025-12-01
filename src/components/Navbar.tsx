import { Plane, LogIn, UserPlus, User, History, MapPin, Calendar, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type NavbarProps = {
  onNavigate: (page: string) => void;
  currentPage: string;
};

export default function Navbar({ onNavigate, currentPage }: NavbarProps) {
  const { user, profile, signOut } = useAuth();

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2 text-blue-600 font-bold text-xl hover:text-blue-700 transition"
            >
              <Plane className="w-7 h-7" />
              SanchariEscapes
            </button>

            {user && (
              <div className="hidden md:flex items-center gap-1">
                {profile?.role === 'admin' ? (
                  <button
                    onClick={() => onNavigate('admin')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                      currentPage === 'admin'
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    Admin
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => onNavigate('recent-trips')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        currentPage === 'recent-trips'
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <History className="w-4 h-4" />
                      Recent Trips
                    </button>
                    <button
                      onClick={() => onNavigate('transaction-history')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        currentPage === 'transaction-history'
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <MapPin className="w-4 h-4" />
                      Transactions
                    </button>
                    <button
                      onClick={() => onNavigate('upcoming-trips')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        currentPage === 'upcoming-trips'
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                      Upcoming Trips
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative group">
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <User className="w-5 h-5" />
                  <span className="hidden sm:inline">{profile?.full_name || 'Profile'}</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <button
                    onClick={() => onNavigate('profile')}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 transition rounded-t-lg"
                  >
                    My Profile
                  </button>
                  <button
                    onClick={signOut}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 transition text-red-600 rounded-b-lg"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onNavigate('login')}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <LogIn className="w-5 h-5" />
                  <span className="hidden sm:inline">Login</span>
                </button>
                <button
                  onClick={() => onNavigate('signup')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <UserPlus className="w-5 h-5" />
                  <span className="hidden sm:inline">Sign Up</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
