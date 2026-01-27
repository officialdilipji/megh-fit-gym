
import React from 'react';
import { Member, SortOrder, MemberStatus, MembershipTier, TierSettings } from '../types';
import { TrashIcon } from './Icons';

interface MemberListProps {
  members: Member[];
  onDelete: (id: string) => void;
  onSelect: (member: Member) => void;
  onApprove?: (member: Member) => void;
  searchTerm: string;
  sortOrder: SortOrder;
  tierSettings: TierSettings;
}

const MemberList: React.FC<MemberListProps> = ({ members, onDelete, onSelect, onApprove, searchTerm, sortOrder, tierSettings }) => {
  const now = Date.now();
  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.phone.includes(searchTerm) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    if (sortOrder === 'newest') {
      return b.timestamp - a.timestamp;
    } else {
      return a.timestamp - b.timestamp;
    }
  });

  const getExpiryStatus = (member: Member) => {
    if (member.status === MemberStatus.PENDING) {
      return { label: 'Awaiting Payment', color: 'text-amber-500', isCritical: true };
    }
    
    const diff = member.expiryTimestamp - now;
    const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (diff < 0) return { label: 'Expired', color: 'text-red-500', isCritical: true };
    if (daysLeft <= 7) return { label: `Expires in ${daysLeft}d`, color: 'text-orange-500', isCritical: true };
    return { label: `Valid until ${new Date(member.expiryTimestamp).toLocaleDateString()}`, color: 'text-slate-400', isCritical: false };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {sortedMembers.length > 0 ? (
        sortedMembers.map(member => {
          const badgeClass = member.tier === MembershipTier.PREMIUM ? 'bg-amber-500' : member.tier === MembershipTier.STANDARD ? 'bg-blue-500' : 'bg-slate-600';
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(member.id)}&color=f8fafc&bgcolor=1e293b`;
          const status = getExpiryStatus(member);
          const isPending = member.status === MemberStatus.PENDING;
          
          return (
            <div key={member.id} className={`bg-slate-800/40 border ${isPending ? 'border-amber-500/50 ring-1 ring-amber-500/20' : status.isCritical ? 'border-orange-500/50 shadow-lg shadow-orange-500/10' : 'border-slate-700'} rounded-2xl overflow-hidden hover:border-amber-500/50 transition duration-300 group flex flex-col`}>
              {isPending ? (
                <div className="bg-amber-500 py-1 px-4 text-center">
                   <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">PENDING APPROVAL</p>
                </div>
              ) : status.isCritical && (
                <div className="bg-orange-500 py-1 px-4 text-center">
                   <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{status.label}</p>
                </div>
              )}
              
              <div className="p-5 flex gap-4">
                <div className="relative h-20 w-20 flex-shrink-0">
                  <img 
                    src={member.photo} 
                    alt={member.name} 
                    className="h-full w-full object-cover rounded-xl border border-slate-600"
                  />
                  <div className={`absolute -bottom-1 -right-1 text-[10px] font-bold px-1.5 py-0.5 rounded text-white shadow ${badgeClass}`}>
                    {member.tier}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-slate-100 truncate pr-2">{member.name}</h3>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(member.id); }}
                      className="text-slate-500 hover:text-red-500 transition p-1"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                  <p className="text-xs text-amber-500 font-mono font-semibold">{member.id}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                      <span className="opacity-50">📧</span> {member.email}
                    </p>
                    <p className={`text-xs ${status.color} flex items-center gap-1.5`}>
                      <span className="opacity-50">⌛</span> {status.label}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:block opacity-60 group-hover:opacity-100 transition duration-300">
                  <div className="bg-slate-800 p-1.5 rounded-lg border border-slate-700 cursor-pointer" onClick={() => onSelect(member)}>
                    <img src={qrUrl} alt="QR" className="w-10 h-10" />
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 pt-0 flex-1 flex flex-col">
                {member.status === MemberStatus.ACTIVE ? (
                  <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50 flex-1">
                    <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mb-1">AI Trainer Insight</p>
                    <p className="text-xs text-slate-300 italic leading-relaxed line-clamp-2">
                      "{member.aiInsights || 'Goal: ' + member.fitnessGoals}"
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-500/5 rounded-xl p-3 border border-amber-500/20 flex-1">
                    <div className="flex justify-between items-start mb-1">
                       <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Registration Info</p>
                       <span className="text-[9px] bg-amber-500/20 text-amber-500 px-1 rounded font-bold uppercase">{member.paymentMethod}</span>
                    </div>
                    {member.paymentMethod === 'UPI' && (
                      <p className="text-xs text-white font-mono font-bold mb-1">TXN: {member.transactionId}</p>
                    )}
                    <p className="text-xs text-slate-300 italic leading-relaxed line-clamp-2">
                      Goal: {member.fitnessGoals}
                    </p>
                  </div>
                )}
                
                <div className="mt-4 flex justify-between items-center text-xs">
                  <div className="flex gap-2">
                     <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded">₹{member.amountPaid}</span>
                  </div>
                  {isPending ? (
                    <button 
                      onClick={() => onApprove?.(member)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                    >
                      Approve & Active
                    </button>
                  ) : (
                    <button 
                      onClick={() => onSelect(member)}
                      className="text-amber-500 font-bold hover:underline group-hover:translate-x-1 transition duration-200"
                    >
                      View Card →
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="col-span-full py-20 text-center">
          <div className="text-slate-600 text-6xl mb-4">🏋️‍♂️</div>
          <h3 className="text-xl font-bold text-slate-400">No members found</h3>
          <p className="text-slate-500 mt-1">Start by adding your first athlete to the system.</p>
        </div>
      )}
    </div>
  );
};

export default MemberList;
