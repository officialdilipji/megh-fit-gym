
import React, { useState } from 'react';
import { PricingConfig, AdminConfig } from '../types';

interface AdminSettingsProps {
  membershipPrices: PricingConfig;
  ptPrices: PricingConfig;
  adminConfig: AdminConfig;
  onSave: (upiId: string, membershipPrices: PricingConfig, ptPrices: PricingConfig) => void;
  onClose: () => void;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ 
  membershipPrices, 
  ptPrices, 
  adminConfig, 
  onSave, 
  onClose 
}) => {
  const [localUpi, setLocalUpi] = useState(adminConfig.upiId);
  const [localMembership, setLocalMembership] = useState<PricingConfig>({ ...membershipPrices });
  const [localPt, setLocalPt] = useState<PricingConfig>({ ...ptPrices });

  const handlePriceChange = (type: 'membership' | 'pt', months: number, value: string) => {
    const numValue = parseInt(value) || 0;
    if (type === 'membership') {
      setLocalMembership(prev => ({ ...prev, [months]: numValue }));
    } else {
      setLocalPt(prev => ({ ...prev, [months]: numValue }));
    }
  };

  const handleSave = () => {
    onSave(localUpi, localMembership, localPt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <header className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">System Configuration</h2>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Adjust pricing & payment gateways</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          {/* Payment Section */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] flex items-center gap-3">
              <span className="h-px flex-1 bg-amber-500/20"></span>
              Financial Identity
              <span className="h-px flex-1 bg-amber-500/20"></span>
            </h3>
            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-2">
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">Master UPI ID (For Payment QRs)</label>
              <input 
                type="text" 
                value={localUpi} 
                onChange={(e) => setLocalUpi(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-3.5 text-white font-mono text-sm outline-none focus:border-amber-500 transition-all"
                placeholder="gym@upi"
              />
            </div>
          </section>

          {/* Membership Pricing */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-3">
              <span className="h-px flex-1 bg-blue-500/20"></span>
              Standard Memberships
              <span className="h-px flex-1 bg-blue-500/20"></span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 3, 6, 12].map(months => (
                <div key={`m-${months}`} className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <label className="block text-[8px] font-black text-slate-500 uppercase mb-2">{months} Month Plan</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600">₹</span>
                    <input 
                      type="number" 
                      value={localMembership[months]} 
                      onChange={(e) => handlePriceChange('membership', months, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-6 pr-3 py-2 text-white font-bold text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* PT Pricing */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] flex items-center gap-3">
              <span className="h-px flex-1 bg-emerald-500/20"></span>
              Personal Training Add-ons
              <span className="h-px flex-1 bg-emerald-500/20"></span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 3, 6, 12].map(months => (
                <div key={`pt-${months}`} className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <label className="block text-[8px] font-black text-slate-500 uppercase mb-2">{months}M PT Sub</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600">₹</span>
                    <input 
                      type="number" 
                      value={localPt[months]} 
                      onChange={(e) => handlePriceChange('pt', months, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-6 pr-3 py-2 text-white font-bold text-xs outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer className="px-8 py-6 border-t border-slate-800 bg-slate-900/50 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all"
          >
            Discard
          </button>
          <button 
            onClick={handleSave}
            className="flex-[2] py-4 bg-amber-500 text-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-amber-500/10 active:scale-95 transition-all"
          >
            Apply Changes
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AdminSettings;
