/**
 * MoodLens - Register Page
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Lock, Mail, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { authApi } from '../services/authApi';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToPrivacy) {
      toast.error('Please accept the privacy policy & camera consent terms');
      return;
    }

    setIsLoading(true);
    try {
      const data = await authApi.register({ username, email, password });
      setAuth(data.user, data.access_token);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <Link to="/" className="inline-flex items-center space-x-3 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
            <Activity className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-white">
            MoodLens
          </span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Create your account
        </h2>
        <p className="text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/90 py-8 px-6 sm:px-10 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="alex_smith"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars, 1 uppercase, 1 digit"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Privacy Checkbox */}
            <div className="flex items-start space-x-2.5 pt-2">
              <input
                id="consent-checkbox"
                type="checkbox"
                checked={agreedToPrivacy}
                onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
              />
              <label htmlFor="consent-checkbox" className="text-xs text-slate-400 leading-relaxed cursor-pointer">
                I understand that MoodLens processes camera frames on-device to classify visible facial expressions and never transmits raw video to cloud servers.
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
            >
              <span>{isLoading ? 'Creating Account...' : 'Get Started'}</span>
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
