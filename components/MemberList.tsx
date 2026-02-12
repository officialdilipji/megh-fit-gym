
import React from 'react';
import { Member, SortOrder, MemberStatus, MembershipTier } from '../types';
import { TrashIcon } from './Icons';

interface MemberListProps {
  members: Member[];
  onDelete: (id: string) => void;
  onSelect: (member: Member) => void;
  onApprove?: (member: Member) => Promise<void>;
  searchTerm: string;
  sortOrder: SortOrder;
}

const MemberList: React.FC<MemberListProps> = ({ members, onDelete, onSelect, onApprove, searchTerm, sortOrder }) => {
  const now = Date.now();
  
  const filteredMembers = members.filter(m => {
    const s = searchTerm.toLowerCase();
    return m.name.toLowerCase().includes(s) || m.id.toLowerCase().includes(s) || m.phone.includes(s);
  });

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    return sortOrder === 'newest' ? (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0) : (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0);
  });

  const getExpiryStatus = (member: Member) => {
    const statusStr = String(member.status).toUpperCase();
    if (!member.status || statusStr === MemberStatus.PENDING.toUpperCase()) return { label: 'Pending', color: 'text-amber-500' };
    const diff = Number(member.expiryTimestamp) - now;
    if (diff < 0) return { label: 'Expired', color: 'text-red-500' };
    return { label: 'Active', color: 'text-emerald-500' };
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(id);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {sortedMembers.map(member => {
        const status = getExpiryStatus(member);
        const hasPhoto = member.photo && !member.photo.startsWith('data:image/svg+xml');
        const balance = Math.round(((Number(member.totalPayable) || 0) - (Number(member.amountPaid) || 0)) * 100) / 100;
        
        // Correctly append +PT tag if Personal Training is active
        const displayTier = member.hasPersonalTraining ? `${member.tier}+PT` : member.tier;
        
        return (
          <div key={member.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-amber-500/50 transition flex flex-col group relative">
            <div className="p-5 flex gap-4">
              <div className="h-14 w-14 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 flex-shrink-0">
                {hasPhoto ? <img src={member.photo} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-white font-black uppercase">{member.name[0]}</div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-black text-white truncate uppercase tracking-tighter">{member.name}</h3>
                    <p className="text-[9px] text-amber-500 font-mono">{member.id}</p>
                  </div>
                  <button 
                    onClick={(e) => handleDelete(e, member.id)} 
                    className="p-2 -mr-1 rounded-xl text-slate-600 hover:text-red-500 hover:bg-red-500/10 transition-all z-20 relative active:scale-90"
                    title="Delete Athlete"
                  >
                    <TrashIcon />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[9px] font-black uppercase ${status.color}`}>{status.label}</span>
                  {balance > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-600 text-white text-[7px] font-black rounded-sm uppercase shadow-sm">DUE: ₹{balance}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 flex-1 flex flex-col justify-between">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mb-4">
                <p className="text-[8px] text-slate-500 font-black uppercase">Active Plan</p>
                <p className="text-[10px] text-slate-300 font-bold uppercase">{displayTier} ({member.membershipDuration}M)</p>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">PAID: ₹{member.amountPaid}</div>
                {(String(member.status).toUpperCase() === MemberStatus.PENDING.toUpperCase() || !member.status) && onApprove ? (
                   <button 
                     onClick={() => onApprove(member)} 
                     className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition shadow-lg shadow-amber-500/10 active:scale-95"
                   >
                     Approve
                   </button>
                ) : (
                   <button onClick={() => onSelect(member)} className="text-amber-500 text-[9px] font-black uppercase hover:underline transition-all">View Card →</button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MemberList;
