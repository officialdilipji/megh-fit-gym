
import React, { useState, useEffect } from 'react';

interface ClientPortalProps {
  onSelectEnroll: () => void;
  onSelectLink: () => void;
}

const ClientPortal: React.FC<ClientPortalProps> = ({ onSelectEnroll, onSelectLink }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[100%] h-[70%] bg-amber-500/10 blur-[120px] rounded-full animate-pulse"></div>
      
      <div className="z-10 w-full max-w-4xl text-center flex flex-col items-center">
        <header className="mb-8 animate-in fade-in slide-in-from-top-10 duration-1000">
          <div className="inline-block px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full mb-6">
             <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em]">Athlete Terminal Active</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase leading-none italic">
            MEGH FIT <span className="text-amber-500">GATEWAY</span>
          </h1>
        </header>

        {/* Big Aesthetic Clock */}
        <div className="mb-12 animate-in fade-in zoom-in duration-1000 delay-300">
          <p className="text-6xl md:text-8xl font-mono font-black text-white leading-none tracking-tighter tabular-nums drop-shadow-2xl">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
          </p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <div className="h-px w-8 bg-slate-800"></div>
            <p className="text-xs text-amber-500 font-black uppercase tracking-[0.1em] italic">
              {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
            <div className="h-px w-8 bg-slate-800"></div>
          </div>
        </div>

        <div className="w-full max-w-sm space-y-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
          <button 
            onClick={onSelectLink}
            className="w-full group relative overflow-hidden bg-slate-900/40 backdrop-blur-2xl border border-white/10 p-6 rounded-[2rem] text-left transition-all hover:border-amber-500/50 hover:bg-slate-800/50 shadow-2xl"
          >
            <p className="text-amber-500 text-[9px] font-black uppercase tracking-widest mb-1">Already Approved?</p>
            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Attendance Login</h3>
            <p className="text-slate-500 text-[8px] font-bold uppercase mt-2 tracking-widest">Link your phone to check-in/out.</p>
          </button>

          <button 
            onClick={onSelectEnroll}
            className="w-full group relative overflow-hidden bg-amber-500 p-6 rounded-[2rem] text-left transition-all hover:bg-amber-400 shadow-xl shadow-amber-500/10 active:scale-95"
          >
            <p className="text-slate-950 text-[9px] font-black uppercase tracking-widest mb-1">First Time Here?</p>
            <h3 className="text-xl font-black text-slate-950 uppercase italic tracking-tighter">New Athlete Entry</h3>
            <p className="text-slate-950/60 text-[8px] font-bold uppercase mt-2 tracking-widest">Start your admission process now.</p>
          </button>
        </div>
      </div>

      <footer className="absolute bottom-8 text-center opacity-40">
        <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em]">Megh Fit Terminal v4.6</p>
      </footer>
    </div>
  );
};

export default ClientPortal;
