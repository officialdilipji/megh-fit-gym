
import React, { useState } from 'react';
import { Member, MemberStatus, MembershipTier, AttendanceLog } from '../types';
import { normalizeTimeStr } from '../services/googleSheetService';
import { jsPDF } from 'jspdf';

interface MemberProfileViewProps {
  member: Member;
  attendance: AttendanceLog[];
  onClose: () => void;
  onUpdateMember?: (updatedMember: Member) => void;
}

const displayTime = (time24: string) => {
  if (!time24) return '';
  try {
    const norm = normalizeTimeStr(time24);
    const [h24, m] = norm.split(':');
    let hNum = parseInt(h24);
    if (isNaN(hNum)) return time24;
    const p = hNum >= 12 ? 'PM' : 'AM';
    const h12 = (hNum % 12 || 12).toString().padStart(2, '0');
    return `${h12}:${m} ${p}`;
  } catch {
    return time24;
  }
};

const MemberProfileView: React.FC<MemberProfileViewProps> = ({ member, attendance, onClose, onUpdateMember }) => {
  const [activeTab, setActiveTab] = useState<'pass' | 'history' | 'payment'>('pass');
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [isSettling, setIsSettling] = useState(false);

  // Robust financial values
  const total = parseFloat(String(member.totalPayable || 0));
  const paid = parseFloat(String(member.amountPaid || 0));
  const balance = Math.round(Math.max(0, total - paid) * 100) / 100;
  const hasBalance = balance > 0;

  // Validation: Amount entered must not exceed balance
  const enteredAmount = parseFloat(settleAmount) || 0;
  const isOverpaid = enteredAmount > balance;

  const handleSettlePayment = () => {
    if (!onUpdateMember) return;
    if (isNaN(enteredAmount) || enteredAmount <= 0 || isOverpaid) return;

    setIsSettling(true);
    const updatedMember: Member = {
      ...member,
      amountPaid: Math.round((paid + enteredAmount) * 100) / 100
    };
    
    onUpdateMember(updatedMember);
    setSettleAmount('');
    setIsSettling(false);
    setActiveTab('pass');
  };

  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500'];
    const index = (name || "A").length % colors.length;
    return colors[index];
  };

  const downloadReceipt = () => {
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(245, 158, 11); 
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text("MEGH FIT GYM CLUB", 105, 25, { align: "center" });
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("OFFICIAL PAYMENT RECEIPT", 105, 33, { align: "center" });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    let y = 60;
    const addRow = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 40, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 100, y);
      y += 10;
    };
    addRow("Receipt Date:", new Date().toLocaleDateString());
    addRow("Athlete ID:", member.id);
    addRow("Name:", member.name);
    addRow("Tier:", `${member.hasPersonalTraining ? member.tier + '+PT' : member.tier} (${member.membershipDuration}M)`);
    addRow("Total Package:", `INR ${total.toLocaleString()}`);
    addRow("Amount Paid So Far:", `INR ${paid.toLocaleString()}`);
    addRow("Remaining Balance:", `INR ${balance.toLocaleString()}`);
    addRow("Valid Until:", member.expiryDate);
    doc.save(`Receipt_${member.id}.pdf`);
  };

  const exportAttendanceHistory = () => {
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(245, 158, 11); 
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text("ATTENDANCE LOG", 105, 20, { align: "center" });
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Athlete: ${member.name}`, 20, 40);
    doc.text(`ID: ${member.id}`, 20, 47);
    doc.text(`Report Generated: ${new Date().toLocaleString()}`, 20, 54);

    doc.line(20, 60, 190, 60);
    doc.setFont('helvetica', 'bold');
    doc.text("Date", 25, 68);
    doc.text("Login", 85, 68);
    doc.text("Logout", 145, 68);
    doc.line(20, 72, 190, 72);

    doc.setFont('helvetica', 'normal');
    let y = 80;
    memberLogs.forEach((log) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(log.date, 25, y);
      doc.text(displayTime(log.checkIn), 85, y);
      doc.text(displayTime(log.checkOut) || "--:--", 145, y);
      y += 10;
    });

    doc.save(`Attendance_${member.id}.pdf`);
  };

  const memberLogs = attendance
    .filter(a => a.memberId === member.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const hasPhoto = member.photo && !member.photo.startsWith('data:image/svg+xml');
  const displayTier = member.hasPersonalTraining ? `${member.tier}+PT` : member.tier;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-950/98 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose}>
      <div className="relative w-full max-w-[320px] bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        
        <div className="h-20 bg-gradient-to-b from-slate-800 to-slate-900 flex flex-col items-center justify-center relative px-4">
          <h3 className="text-amber-500 text-[7px] font-black uppercase tracking-[0.3em]">Athlete Profile</h3>
          <h2 className="text-white text-base font-black uppercase tracking-tighter mt-0.5">MEGH FIT CLUB</h2>
          <button onClick={onClose} className="absolute top-3 right-3 text-slate-500 hover:text-white transition p-1.5 bg-slate-900/50 rounded-full z-10">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="flex bg-slate-950/50 p-1 mx-4 -mt-3 rounded-lg border border-slate-800 relative z-30">
          <button onClick={() => setActiveTab('pass')} className={`flex-1 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition ${activeTab === 'pass' ? 'bg-amber-500 text-slate-900' : 'text-slate-500'}`}>Card</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition ${activeTab === 'history' ? 'bg-amber-500 text-slate-900' : 'text-slate-500'}`}>History</button>
          <button onClick={() => setActiveTab('payment')} className={`flex-1 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition ${activeTab === 'payment' ? 'bg-amber-500 text-slate-900' : 'text-slate-500'}`}>Billing</button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {activeTab === 'pass' && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
               <div className={`w-20 h-20 rounded-full border-2 border-slate-800 overflow-hidden mb-3 ${!hasPhoto ? getAvatarColor(member.name) : ''}`}>
                  {hasPhoto ? <img src={member.photo} className="w-full h-full object-cover" /> : <span className="text-white font-black text-3xl flex h-full items-center justify-center uppercase">{member.name[0]}</span>}
               </div>
               <h2 className="text-lg font-black text-white uppercase tracking-tighter text-center">{member.name}</h2>
               <p className="text-amber-500 text-[9px] font-black uppercase tracking-widest mb-3">{displayTier} Member</p>
               
               <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 mb-4 grid grid-cols-2 gap-2">
                  <div className="col-span-2 flex justify-between items-center border-b border-slate-800 pb-1.5 mb-0.5">
                     <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Plan Value</span>
                     <span className="text-[10px] font-black text-white">₹{total}</span>
                  </div>
                  <div>
                    <p className="text-[6px] text-emerald-500 font-black uppercase tracking-widest">Paid</p>
                    <p className="text-xs font-black text-white">₹{paid}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[6px] font-black uppercase tracking-widest ${hasBalance ? 'text-red-500' : 'text-slate-500'}`}>Balance</p>
                    <p className={`text-xs font-black ${hasBalance ? 'text-red-500' : 'text-slate-300'}`}>₹{balance}</p>
                  </div>
               </div>

               <div className="w-full space-y-2">
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">Athlete ID</span>
                    <span className="text-[9px] font-mono text-white">{member.id}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">Expires On</span>
                    <span className="text-[9px] font-bold text-white">{member.expiryDate}</span>
                  </div>
               </div>
               
               <button onClick={downloadReceipt} className="w-full mt-4 py-2 bg-slate-800 text-white rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-slate-700 transition">Get Payment PDF</button>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="flex justify-between items-center mb-1">
                 <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Attendance Log</h4>
                 <button onClick={exportAttendanceHistory} className="text-[8px] font-black text-amber-500 uppercase hover:underline">Export PDF</button>
               </div>
               
               <div className="space-y-1.5">
                 {memberLogs.map((log, idx) => (
                   <div key={idx} className="bg-slate-950 border border-slate-800 p-2 rounded-lg flex justify-between items-center">
                     <div>
                       <p className="text-[9px] text-white font-black">{log.date}</p>
                     </div>
                     <div className="text-right flex items-center gap-3">
                       <div className="flex flex-col">
                         <span className="text-[6px] text-slate-500 font-bold uppercase">In</span>
                         <span className="text-[9px] text-emerald-500 font-mono font-black">{displayTime(log.checkIn)}</span>
                       </div>
                       <div className="flex flex-col">
                         <span className="text-[6px] text-slate-500 font-bold uppercase">Out</span>
                         <span className="text-[9px] text-amber-500 font-mono font-black">{displayTime(log.checkOut) || '--:--'}</span>
                       </div>
                     </div>
                   </div>
                 ))}
                 {memberLogs.length === 0 && <p className="text-center py-8 text-slate-600 text-[9px] font-black uppercase tracking-widest">No Logs Found</p>}
               </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300 h-full flex flex-col">
               <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Billing Overview</h4>
               <div className="space-y-3 flex-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                      <p className="text-[6px] text-slate-500 font-black uppercase">Package</p>
                      <p className="text-sm font-black text-white">₹{total}</p>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                      <p className="text-[6px] text-emerald-500 font-black uppercase">Paid</p>
                      <p className="text-sm font-black text-emerald-400">₹{paid}</p>
                    </div>
                  </div>

                  {hasBalance ? (
                    <div className="bg-white rounded-2xl p-4 space-y-3 shadow-xl">
                      <div className="flex justify-between items-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase">Process Settlement</p>
                        <span className="text-[10px] font-black text-red-500">DUE ₹{balance}</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">₹</span>
                        <input 
                          type="number" 
                          placeholder="Amount..." 
                          value={settleAmount}
                          onChange={(e) => setSettleAmount(e.target.value)}
                          className={`w-full bg-slate-50 border ${isOverpaid ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-amber-500'} rounded-lg pl-6 pr-3 py-2 text-slate-900 font-black outline-none text-sm transition-all`}
                        />
                      </div>
                      
                      {isOverpaid && (
                        <p className="text-[8px] font-black text-red-500 uppercase text-center animate-pulse">
                          Error: Amount exceeds the pending balance of ₹{balance}
                        </p>
                      )}

                      <button 
                        onClick={handleSettlePayment}
                        disabled={isSettling || !settleAmount || enteredAmount <= 0 || isOverpaid}
                        className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-slate-800 transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Settle Payment
                      </button>
                    </div>
                  ) : (
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 flex flex-col items-center justify-center">
                       <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-slate-900 mb-3">
                         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>
                       </div>
                       <p className="text-emerald-500 font-black uppercase text-[9px] tracking-tighter text-center">ACCOUNT CLEARED</p>
                    </div>
                  )}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberProfileView;
