
import React from 'react';
// Fix: Removed non-existent and unused TIER_CONFIG import and corrected the import path (removed .ts extension)
import { Member } from '../types';
import { jsPDF } from 'jspdf';

interface MemberProfileViewProps {
  member: Member;
  onClose: () => void;
}

const MemberProfileView: React.FC<MemberProfileViewProps> = ({ member, onClose }) => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin + window.location.pathname + window.location.search + '#profile/' + member.id)}&color=f59e0b&bgcolor=0f172a`;

  const handleBackToHome = () => {
    window.location.hash = '';
    onClose();
  };

  const downloadReceipt = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(245, 158, 11); 
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text("MEGH FIT GYM CLUB", 105, 25, { align: "center" });
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("PAYMENT RECEIPT", 105, 33, { align: "center" });

    // Content
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
    addRow("Member ID:", member.id);
    addRow("Athlete Name:", member.name);
    addRow("Tier:", member.tier);
    addRow("Valid From:", member.joinDate);
    addRow("Valid Until:", member.expiryDate);
    addRow("Amount Paid:", `INR ${member.amountPaid.toLocaleString()}`);
    addRow("Mode:", member.paymentMethod);

    doc.save(`Receipt_${member.id}.pdf`);
  };

  const isExpired = Date.now() > member.expiryTimestamp;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl">
        <div className="h-24 bg-gradient-to-br from-amber-500 to-orange-600 relative">
          <button 
            onClick={handleBackToHome}
            className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white rounded-full h-8 w-8 flex items-center justify-center transition z-10 font-bold"
          >✕</button>
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
            <div className="w-20 h-20 rounded-full border-4 border-slate-900 overflow-hidden bg-slate-800 shadow-xl">
              <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        <div className="pt-12 pb-8 px-6 text-center">
          <h2 className="text-xl font-black text-white">{member.name}</h2>
          <p className="text-amber-500 font-mono text-xs font-bold">{member.id}</p>
          
          <div className="mt-4 flex justify-center gap-2">
            <div className="bg-slate-800 border border-slate-700 rounded-full px-3 py-1 text-[10px] font-bold text-slate-300">
              {member.tier}
            </div>
            <div className={`border rounded-full px-3 py-1 text-[10px] font-bold ${isExpired ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
              {isExpired ? 'Expired' : 'Active'}
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center">
            <div className="bg-white p-3 rounded-2xl shadow-inner mb-2">
              <img src={qrUrl} alt="QR" className="w-32 h-32" />
            </div>
            <p className="text-[10px] text-amber-500 font-black uppercase">Verify Membership</p>
          </div>

          <div className="mt-6 space-y-3">
            <button 
              onClick={downloadReceipt}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition border border-slate-700 text-sm"
            >
              Download Receipt
            </button>
            
            <button 
              onClick={handleBackToHome}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl font-black uppercase text-xs transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberProfileView;
