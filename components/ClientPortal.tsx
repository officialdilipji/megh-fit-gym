
import React, { useState } from 'react';
import { Member } from '../types';

interface ClientPortalProps {
  onSelectEnroll: () => void;
  onSelectLink: () => void;
}

const ClientPortal: React.FC<ClientPortalProps> = ({ onSelectEnroll, onSelectLink }) => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in zoom-in duration-700">
      <div className="text-center space-y-4">
        <div className="inline-block px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
           <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em]">Welcome to Megh Fit</span>
        </div>
        <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-tight">
          Athlete <span className="text-amber-500">Gateway</span>
        </h1>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest max-w-xs mx-auto">
          Choose your path to excellence
        </p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <button 
          onClick={onSelectLink}
          className="w-full group relative overflow-hidden bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] text-left transition-all hover:border-amber-500/50 hover:bg-slate-800/50 shadow-2xl"
        >
          <div className="absolute top-0 right-0 p-4 text-slate-800 group-hover:text-amber-500/20 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>
          </div>
          <p className="text-amber-500 text-[10px] font-black uppercase tracking-widest mb-1">Returning Member</p>
          <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Attendance Terminal</h3>
          <p className="text-slate-500 text-[9px] font-bold uppercase mt-2 tracking-widest">Already approved? Link your phone & check-in.</p>
        </button>

        <button 
          onClick={onSelectEnroll}
          className="w-full group relative overflow-hidden bg-amber-500 p-8 rounded-[2.5rem] text-left transition-all hover:bg-amber-400 shadow-xl shadow-amber-500/10"
        >
          <div className="absolute top-0 right-0 p-4 text-slate-950/10 group-hover:text-slate-950/20 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>
          </div>
          <p className="text-slate-950 text-[10px] font-black uppercase tracking-widest mb-1">New Member</p>
          <h3 className="text-xl font-black text-slate-950 uppercase italic tracking-tighter">Enrollment Form</h3>
          <p className="text-slate-950/60 text-[9px] font-bold uppercase mt-2 tracking-widest">New to the tribe? Start your admission.</p>
        </button>
      </div>

      <footer className="pt-8 opacity-40">
        <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em]">Proprietary Admission Engine • Megh Fit</p>
      </footer>
    </div>
  );
};

export default ClientPortal;
