
import React, { useState } from 'react';
import { AdminConfig } from '../types';

interface AdminLoginProps {
  onLogin: () => void;
  adminConfig: AdminConfig;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, adminConfig }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === adminConfig.username && password === adminConfig.password) {
      onLogin();
    } else {
      setError('Invalid credentials. Access denied.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">
            MEGH FIT <span className="text-amber-500">ADMIN</span>
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Management Terminal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500 outline-none transition"
              placeholder="Enter username"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500 outline-none transition"
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

          <button
            type="submit"
            className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            Authenticate
          </button>
        </form>
        
        <p className="mt-8 text-center text-slate-600 text-[10px] font-medium leading-relaxed">
          Authorized personnel only. All access attempts are logged for security purposes.
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
