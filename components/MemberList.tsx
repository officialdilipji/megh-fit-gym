
import React from 'react';
import { Member, SortOrder, MemberStatus } from '../types';
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
    const s = searchTerm.toLowerCase().trim();
    if (!s) return true;
    return (
      m.name.toLowerCase().includes(s) || 
      m.id.toLowerCase().includes(s) || 
      m.phone.includes(s)
    );
  });

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    return sortOrder === 'newest' ? (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0) : (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0);
  });

  const getExpiryStatus = (member: Member) => {
    const statusStr = String(member.status || '').toUpperCase();
    if (statusStr === MemberStatus.PENDING.toUpperCase()) return { label: 'Pending', color: 'text-amber-500' };
    const diff = (Number(member.expiryTimestamp) || 0) - now;
    if (diff < 0) return { label: 'Expired', color: 'text-red-500' };
    return { label: 'Active', color: 'text-emerald-500' };
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-2">
      {sortedMembers.map(member => {
        const status = getExpiryStatus(member);
        const hasPhoto = member.photo && !member.photo.startsWith('data:image/svg+xml');
        const balance = Math.round(((Number(member.totalPayable) || 0) - (Number(member.amountPaid) || 0)) * 100) / 100;
        const displayTier = member.hasPersonalTraining ? `${member.tier}+PT` : member.tier;
        
        return (
          <div key={member.id} className="relative group/card">
            {/* 
                NORMALIZED DELETE BUTTON: 
                Reduced size and positioned carefully to be a standard tool icon.
            */}
            <div className="absolute top-4 right-4 z-[40]">
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(member.id);
                }} 
                className="w-8 h-8 rounded-lg bg-slate-950/80 text-slate-500 hover:bg-red-600 hover:text-white transition-all border border-slate-800 shadow-xl flex items-center justify-center backdrop-blur-sm"
                title="Delete Athlete Record"
              >
                <div className="scale-75">
                  <TrashIcon />
                </div>
              </button>
            </div>

            {/* CARD CONTENT */}
            <div 
              onClick={() => onSelect(member)}
              className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden hover:border-amber-500/50 transition-all flex flex-col cursor-pointer active:scale-[0.98] h-full shadow-lg relative z-10"
            >
              <div className="p-5 flex gap-4">
                <div className="h-14 w-14 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex-shrink-0 shadow-inner">
                  {hasPhoto ? (
                    <img src={member.photo} className="h-full w-full object-cover" alt={member.name} />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-white font-black uppercase text-xl bg-slate-700">
                      {member.name[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 pr-10">
                  <h3 className="text-sm font-black text-white truncate uppercase tracking-tighter">{member.name}</h3>
                  <p className="text-[9px] text-amber-500 font-mono mt-0.5">{member.id}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[9px] font-black uppercase ${status.color}`}>{status.label}</span>
                    {balance > 0 && (
                      <span className="px-1.5 py-0.5 bg-red-600 text-white text-[7px] font-black rounded-sm uppercase shadow-sm">DUE: ₹{balance}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 flex-1 flex flex-col justify-between">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mb-4 shadow-inner">
                  <p className="text-[8px] text-slate-500 font-black uppercase mb-1">Active Plan</p>
                  <p className="text-[10px] text-slate-300 font-bold uppercase">{displayTier} ({member.membershipDuration}M)</p>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-800/50">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">PAID: <span className="text-white">₹{member.amountPaid}</span></div>
                  {(String(member.status || '').toUpperCase() === MemberStatus.PENDING.toUpperCase()) && onApprove ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onApprove(member); }} 
                      className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition shadow-lg shadow-amber-500/10 active:scale-95"
                    >
                      Approve
                    </button>
                  ) : (
                    <span className="text-amber-500 text-[9px] font-black uppercase group-hover:translate-x-1 transition-all">Details →</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {sortedMembers.length === 0 && (
        <div className="col-span-full py-20 text-center">
          <p className="text-slate-600 font-black uppercase tracking-widest text-xs italic">No matching athletes in registry</p>
        </div>
      )}
    </div>
  );
};

export default MemberList;
