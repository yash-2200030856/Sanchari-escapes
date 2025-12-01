import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserPlus, Plane } from 'lucide-react';
import TopMessage from '../components/TopMessage';

export default function Signup({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // 🔥 Password must contain at least ONE special character
  const passwordRegex =
    /^(?=.*[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>/?]).{6,}$/;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // 🔐 Password special character validation check
    if (!passwordRegex.test(password)) {
      setError('Password must contain at least one special character');
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await (supabase.auth as any).signUp(
      {
        email,
        password,
      },
      {
        data: {
          full_name: fullName,
          phone: phone || null,
        },
      }
    );

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Try to upsert the profile with small retry/backoff to handle RLS/session race
      const upsertProfileWithRetry = async (attempts = 3, initialDelayMs = 800) => {
        let delay = initialDelayMs;
        for (let i = 0; i < attempts; i++) {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: data.user!.id,
            full_name: fullName,
            email: email,
            phone: phone || null,
          });

          if (!profileError) return null; // success

          // If this was the last attempt, return the error
          if (i === attempts - 1) return profileError;

          // Wait and retry (exponential backoff)
          await new Promise((res) => setTimeout(res, delay));
          delay *= 2;
        }
        return null;
      };

      const profileError = await upsertProfileWithRetry(4, 500);

      if (profileError) {
        // If upsert still fails, show a helpful non-blocking message — server trigger may still create the profile
        console.warn('Profile upsert failed after retries:', profileError.message);
        setInfo('Account created — profile setup is in progress. If you do not see your profile shortly, contact support.');
      } else {
        setInfo('Account created successfully');
      }

      setError('');
      setLoading(false);
      setTimeout(() => onNavigate('home'), 800);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center justify-center mb-8">
          <div className="bg-teal-600 p-3 rounded-full">
            <Plane className="w-8 h-8 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Create Account</h1>
        <p className="text-center text-gray-600 mb-8">Start your journey with us</p>

        <form onSubmit={handleSignup} className="space-y-5">
          <TopMessage message={info} type="success" onClose={() => setInfo('')} />
          <TopMessage message={error} type="error" onClose={() => setError('')} />

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number (Optional)
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              'Creating account...'
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                Sign Up
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <button
              onClick={() => onNavigate('login')}
              className="text-teal-600 font-semibold hover:text-teal-700 transition"
            >
              Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
