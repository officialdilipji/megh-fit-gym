
import React, { useState, useEffect } from 'react';

interface LandingViewProps {
  onUnlock: () => void;
}

const LandingView: React.FC<LandingViewProps> = ({ onUnlock }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === 'meghfit@2026') {
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-amber-500/10 blur-[160px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[160px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      
      <div className="z-10 w-full max-w-4xl text-center space-y-12 animate-in fade-in zoom-in duration-1000">
        <header className="space-y-4">
          <div className="inline-block px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full mb-4">
             <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em]">Establishment 2026</span>
          </div>
          <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter uppercase leading-none">
            MEGH FIT <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">GYM CLUB</span>
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.6em] text-[10px] md:text-sm">
            The Pinnacle of Physical Excellence
          </p>
        </header>

        <div className="relative group">
          <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full scale-75 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          <p className="relative text-8xl md:text-[12rem] font-mono font-black text-white leading-none tracking-tighter tabular-nums drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
          </p>
          <div className="flex items-center justify-center gap-4 mt-6">
            <div className="h-px w-12 bg-slate-800"></div>
            <p className="text-lg md:text-3xl text-amber-500 font-black uppercase tracking-[0.3em] italic">
              {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <div className="h-px w-12 bg-slate-800"></div>
          </div>
        </div>

        <div className="max-w-lg mx-auto bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>
          
          {!showPin ? (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="space-y-3">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                  Welcome Back, Athlete
                </h2>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                  "Excellence is not an act, but a habit. Redefine your limits today at Megh Fit."
                </p>
              </div>

              <button 
                onClick={() => setShowPin(true)}
                className="group relative w-full overflow-hidden px-8 py-5 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-[0.2em] transition-all hover:bg-amber-500 hover:text-slate-950 shadow-[0_20px_50px_rgba(0,0,0,0.3)] active:scale-95 text-xs flex items-center justify-center gap-3"
              >
                <span className="relative z-10">Access Front Desk Console</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 group-hover:translate-x-1 transition-transform"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
          ) : (
            <form onSubmit={handlePinSubmit} className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
              <div className="space-y-2">
                <h3 className="text-amber-500 text-[10px] font-black uppercase tracking-[0.4em]">Security Verification</h3>
                <p className="text-white text-xl font-black uppercase tracking-tighter">Enter Station PIN</p>
              </div>

              <div className="relative max-w-xs mx-auto">
                <input 
                  autoFocus
                  type="password"
                  placeholder="••••••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className={`w-full bg-slate-950 border-2 ${error ? 'border-red-500 animate-shake' : 'border-slate-800 focus:border-amber-500'} rounded-2xl px-6 py-5 text-center text-amber-500 text-2xl font-mono tracking-[0.8em] outline-none transition-all placeholder:text-slate-800 shadow-inner`}
                />
                {error && (
                  <p className="text-red-500 text-[9px] font-black uppercase tracking-widest mt-4 animate-bounce">
                    Authentication Failed. Try Again.
                  </p>
                )}
              </div>
              
              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => {setShowPin(false); setPin(''); setError(false);}} 
                  className="flex-1 py-4 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors bg-slate-900/50 rounded-xl border border-slate-800"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] py-4 bg-amber-500 text-slate-950 rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-white transition-all shadow-xl shadow-amber-500/10"
                >
                  Confirm Unlock
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <footer className="absolute bottom-10 left-0 right-0 text-center animate-in slide-in-from-bottom-8 duration-1000">
        <div className="inline-flex items-center gap-4 px-6 py-3 bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-full shadow-2xl">
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></span>
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Main Hub Terminal</span>
          </div>
          <div className="w-px h-4 bg-slate-800"></div>
          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">Encrypted Connection v4.2.0</span>
        </div>
      </footer>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.2s cubic-bezier(.36,.07,.19,.97) both; }
        
        input::placeholder {
          letter-spacing: normal;
          font-family: sans-serif;
        }
      `}</style>
    </div>
  );
};

export default LandingView;
