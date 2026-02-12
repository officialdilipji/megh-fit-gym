
import React, { useState, useEffect } from 'react';

interface LandingViewProps {
  onUnlock: () => void;
}

const LandingView: React.FC<LandingViewProps> = ({ onUnlock }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[100%] h-[70%] bg-amber-500/10 blur-[120px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[100%] h-[70%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      
      <div className="z-10 w-full max-w-4xl text-center flex flex-col items-center">
        <header className="mb-8 md:mb-12 animate-in fade-in slide-in-from-top-10 duration-1000">
          <div className="inline-block px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full mb-6">
             <span className="text-[10px] md:text-xs font-black text-amber-500 uppercase tracking-[0.4em]">Establishment 2026</span>
          </div>
          <h1 className="text-4xl md:text-8xl font-black text-white tracking-tighter uppercase leading-none italic">
            MEGH FIT <span className="text-amber-500">CLUB</span>
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] md:tracking-[0.5em] text-[10px] md:text-base mt-4">
            Forging Legends • Achieving Excellence
          </p>
        </header>

        <div className="mb-10 md:mb-16 animate-in fade-in zoom-in duration-1000 delay-300">
          <p className="text-6xl md:text-[12rem] font-mono font-black text-white leading-none tracking-tighter tabular-nums drop-shadow-2xl">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="h-px w-8 md:w-16 bg-slate-800"></div>
            <p className="text-sm md:text-3xl text-amber-500 font-black uppercase tracking-[0.1em] italic">
              {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
            <div className="h-px w-8 md:w-16 bg-slate-800"></div>
          </div>
        </div>

        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
          <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-30"></div>
            
            <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-tighter mb-3 italic">Front Desk Console</h2>
            <p className="text-slate-400 text-[10px] md:text-sm font-medium leading-relaxed mb-8">
              Access the management terminal for check-ins, payments, and member enrollment.
            </p>

            <button 
              onClick={onUnlock}
              className="w-full py-5 md:py-6 bg-amber-500 text-slate-950 rounded-2xl font-black uppercase tracking-[0.15em] transition-all hover:bg-amber-400 shadow-xl shadow-amber-500/10 active:scale-95 text-[11px] md:text-xs flex items-center justify-center gap-3"
            >
              Enter Dashboard
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
          </div>
        </div>
      </div>

      <footer className="absolute bottom-8 left-0 right-0 text-center animate-in fade-in duration-1000 delay-700">
        <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-full">
           <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Main Terminal Active • v4.5</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingView;
