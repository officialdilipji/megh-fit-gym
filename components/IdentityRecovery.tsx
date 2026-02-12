
import React, { useState } from 'react';
import { Member } from '../types';

interface IdentityRecoveryProps {
  members: Member[];
  onLink: (id: string) => void;
  onCancel: () => void;
}

const IdentityRecovery: React.FC<IdentityRecoveryProps> = ({ members, onLink, onCancel }) => {
  const [phone, setPhone] = useState('');
  const [results, setResults] = useState<Member[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    
    const matched = members.filter(m => m.phone.includes(phone) || m.id.toLowerCase().includes(phone.toLowerCase()));
    setResults(matched);
    setHasSearched(true);
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 animate-in fade-in slide-in-from-bottom-10 duration-500">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[3rem] p-8 shadow-2xl space-y-8">
        <header className="text-center">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Link Your Device</h2>
          <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-2">Enter your registered details</p>
        </header>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Registered Phone / ID</label>
            <div className="relative">
              <input 
                type="tel" 
                value={phone} 
                onChange={e => setPhone(e.target.value)}
                placeholder="98765 43210"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-5 text-white font-mono text-sm outline-none focus:border-amber-500 transition-all shadow-inner"
              />
              <button 
                type="submit"
                className="absolute right-2 top-2 bottom-2 bg-amber-500 text-slate-950 px-4 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg"
              >
                Search
              </button>
            </div>
          </div>
        </form>

        <div className="space-y-3">
          {results.length > 0 ? (
            <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Match Found</p>
              {results.map(member => (
                <button 
                  key={member.id}
                  onClick={() => onLink(member.id)}
                  className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between hover:border-amber-500/50 transition-all group"
                >
                  <div className="text-left">
                    <p className="text-xs font-black text-white uppercase tracking-tight">{member.name}</p>
                    <p className="text-[8px] text-slate-500 font-mono mt-0.5">ID: {member.id}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-slate-900 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                  </div>
                </button>
              ))}
            </div>
          ) : hasSearched ? (
            <div className="bg-slate-950/50 border border-slate-800 p-6 rounded-2xl text-center">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">No Athlete Found</p>
              <p className="text-[7px] text-slate-600 uppercase mt-1">Check the number or see the front desk.</p>
            </div>
          ) : null}
        </div>

        <button 
          onClick={onCancel}
          className="w-full py-4 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
        >
          Back to Gateway
        </button>
      </div>
    </div>
  );
};

export default IdentityRecovery;
