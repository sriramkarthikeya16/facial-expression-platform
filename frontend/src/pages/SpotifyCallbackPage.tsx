/**
 * MoodLens - Spotify OAuth 2.0 PKCE Callback Page (Spec Sections 27, 28, 30)
 * Exchanges authorization code and code_verifier with Spotify API for access/refresh tokens.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Music, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { INTEGRATION_CONFIG } from '../../../shared/configuration/integrations.config';
import toast from 'react-hot-toast';

export const SpotifyCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const exchangeCodeForToken = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setStatus('error');
        setErrorMessage(`Spotify authorization error: ${errorParam}`);
        return;
      }

      if (!code) {
        setStatus('error');
        setErrorMessage('No authorization code found in URL query parameters.');
        return;
      }

      const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
      if (!codeVerifier) {
        setStatus('error');
        setErrorMessage('PKCE Code Verifier not found in session storage.');
        return;
      }

      try {
        const body = new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: `${window.location.origin}/callback/spotify`,
          client_id: INTEGRATION_CONFIG.SPOTIFY.CLIENT_ID,
          code_verifier: codeVerifier,
        });

        const response = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error_description || `HTTP error ${response.status}`);
        }

        const data = await response.json();
        const expiresIn = data.expires_in || 3600;
        const expiresAt = Date.now() + expiresIn * 1000;

        localStorage.setItem('spotify_access_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('spotify_refresh_token', data.refresh_token);
        }
        localStorage.setItem('spotify_token_expires_at', expiresAt.toString());

        // Cleanup PKCE verifier
        sessionStorage.removeItem('spotify_code_verifier');

        setStatus('success');
        toast.success('Successfully connected to Spotify!');

        setTimeout(() => {
          navigate('/settings');
        }, 1500);
      } catch (err: any) {
        console.error('Spotify token exchange failed:', err);
        setStatus('error');
        setErrorMessage(err.message || 'Failed to complete Spotify authorization token exchange.');
      }
    };

    exchangeCodeForToken();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 p-8 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
          <Music className="w-8 h-8" />
        </div>

        {status === 'loading' && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Connecting your Spotify account...</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verifying PKCE credentials and completing token handshake.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-5 h-5" />
              <span>Spotify Connected!</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Redirecting you back to Settings...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
              <AlertCircle className="w-5 h-5" />
              <span>Spotify Authorization</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {errorMessage || 'Direct Spotify Web playback is available.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <button
                onClick={() => {
                  localStorage.setItem('spotify_access_token', 'connected_web_session');
                  window.open('https://open.spotify.com/', '_blank', 'noopener,noreferrer');
                  navigate('/settings');
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Music className="w-4 h-4" />
                <span>Open Spotify Web Directly</span>
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-transform active:scale-95"
              >
                Return to Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
