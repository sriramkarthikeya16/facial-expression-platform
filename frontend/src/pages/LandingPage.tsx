/**
 * MoodLens - Landing Page
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ShieldCheck, Sparkles, Cpu, Lock, ArrowRight, Eye } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="h-20 border-b border-slate-800/80 px-6 sm:px-12 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Activity className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            MoodLens
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <Link
            to="/login"
            className="text-sm font-semibold text-slate-300 hover:text-white px-4 py-2 transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all"
          >
            Get Started Free
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center max-w-4xl mx-auto space-y-8">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Generation On-Device Emotional Intelligence</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
          See what your face is saying.{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Without sacrificing privacy.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
          MoodLens runs high-performance deep learning models directly in your browser.
          Track your visible expression patterns, get gentle contextual suggestions, and keep 100% of your camera data on your device.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 group"
          >
            <span>Launch Live Detection</span>
            <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-base transition-colors"
          >
            Sign In to Dashboard
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 w-full text-left">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-950 flex items-center justify-center text-indigo-400">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Edge-First AI</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              MobileNetV3 ONNX model runs locally via WebAssembly. Low latency, zero cloud frame processing.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-950 flex items-center justify-center text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Radical Privacy</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Granular consent management. No raw biometric video or image storage anywhere on our servers.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-950 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Safe Suggestions</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Rule engine with hysteresis & EMA smoothing prevents false triggers. All high-stakes actions require confirmation.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-16 border-t border-slate-800/80 px-6 flex items-center justify-between text-xs text-slate-500 max-w-7xl mx-auto w-full">
        <span>© 2026 MoodLens Platform. All rights reserved.</span>
        <div className="flex space-x-6">
          <span>Expression ≠ Clinical Mental State</span>
          <span>GDPR / CCPA Compliant</span>
        </div>
      </footer>
    </div>
  );
};
