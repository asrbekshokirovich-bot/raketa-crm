import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Lock, User, AlertCircle } from 'lucide-react';

const Login = () => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const triggerError = (msg: string) => {
    setError(msg);
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      triggerError("Iltimos, loginingizni kiriting!");
      return;
    }
    if (!password) {
      triggerError("Iltimos, parolingizni kiriting!");
      return;
    }

    const computedEmail = `${cleanEmail}@raketa.uz`;

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: computedEmail,
      password: password,
    });

    if (authError) {
      triggerError("Noto'g'ri login yoki parol!");
    }
  };

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-sidebarDark flex items-center justify-center p-4 relative overflow-hidden">

      {/* Floating Alert Toast */}
      {error && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-white text-red-600 px-5 py-3 rounded-2xl shadow-2xl shadow-red-500/10 border border-red-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-10 duration-300">
          <AlertCircle size={20} className="text-red-500" />
          <span className="font-bold text-sm">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-xl w-full max-w-[420px] relative overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-500 border border-slate-100/50">

        <div className="p-8 sm:p-10">

          <div className="text-center mb-8 relative">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-28 h-28 bg-yellow-400/20 rounded-full blur-xl opacity-80 pointer-events-none"></div>
            <img src="/roketa-icon.png" alt="Raketa CRM" className="w-20 h-20 mx-auto object-contain relative z-10 drop-shadow-sm" />
            <h1 className="text-2xl font-black tracking-tight mt-6 text-slate-800">RAKETA CRM</h1>
            <p className="text-slate-500 mt-1.5 text-sm font-medium">Tizimga kirish uchun malumotlarni kiriting</p>
          </div>

          <form onSubmit={handleLogin} noValidate className="space-y-4">

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Login (username)</label>
              <div className="relative flex items-center group">
                <div className="absolute left-4 text-slate-400 group-focus-within:text-yellow-500 transition-colors">
                  <User size={18} strokeWidth={2.5} />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  className="w-full pl-11 pr-[85px] py-3.5 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10 transition-all font-bold text-slate-600 shadow-sm"
                  placeholder="Login"
                />
                <span className="absolute right-3.5 text-[11px] font-bold text-slate-400 select-none">@raketa.uz</span>
              </div>
            </div>

            <div className="space-y-1.5 mt-5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Parol</label>
              <div className="relative flex items-center group">
                <div className="absolute left-4 text-slate-400 group-focus-within:text-yellow-500 transition-colors">
                  <Lock size={18} strokeWidth={2.5} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3.5 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10 transition-all font-bold tracking-widest text-slate-700 placeholder:tracking-normal placeholder:font-medium shadow-sm"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF9800] hover:bg-[#F57C00] text-white font-bold text-base py-3.5 rounded-xl transition-all shadow-lg shadow-orange-500/30 active:scale-[0.98] flex justify-center items-center mt-8 group"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              ) : (
                <span className="flex items-center gap-2">
                  Tizimga kirish
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </span>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default Login;
