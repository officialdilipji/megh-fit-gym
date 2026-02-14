
import React, { useState, useMemo } from 'react';
import { Member, MembershipTier, Gender, PaymentMethod, PricingConfig, MemberStatus, DurationMonths } from '../types';
import CameraCapture from './CameraCapture';

interface MemberFormProps {
  onAdd: (member: Member) => void;
  onCancel: () => void;
  isSelfRegistration?: boolean;
  membershipPrices: PricingConfig;
  ptPrices: PricingConfig;
  gymUpiId?: string;
  onSwitchToLink?: () => void;
}

const MemberForm: React.FC<MemberFormProps> = ({ 
  onAdd, 
  onCancel, 
  membershipPrices, 
  ptPrices, 
  isSelfRegistration = false, 
  gymUpiId = 'meghfit@upi',
  onSwitchToLink
}) => {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: Gender.MALE,
    phone: '',
    email: '',
    membershipDuration: 1 as DurationMonths,
    hasPersonalTraining: false,
    ptDuration: 1 as DurationMonths,
    paymentMethod: PaymentMethod.UPI,
    amountPaidNow: '',
    paymentDueDate: '',
    transactionId: '',
    goals: '',
    photo: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalAmount = useMemo(() => {
    const basePrice = membershipPrices[formData.membershipDuration] || 0;
    const ptPrice = formData.hasPersonalTraining ? (ptPrices[formData.ptDuration] || 0) : 0;
    return basePrice + ptPrice;
  }, [formData.membershipDuration, formData.hasPersonalTraining, formData.ptDuration, membershipPrices, ptPrices]);

  const paidNowVal = parseFloat(formData.amountPaidNow) || 0;
  const isOverpaidAtEnrollment = formData.paymentMethod === PaymentMethod.LATER && paidNowVal > totalAmount;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!/^\d{10}$/.test(formData.phone)) newErrors.phone = "Invalid phone number";
    if (!formData.goals.trim()) newErrors.goals = "Goals are required";
    if (isOverpaidAtEnrollment) newErrors.payment = "Payment exceeds total amount";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; 
    if (!validate()) return;
    
    setIsSubmitting(true);
    
    const now = new Date();
    const timestamp = now.getTime();
    
    // Calculate Membership Expiry
    const expiryDateObj = new Date(now);
    expiryDateObj.setMonth(now.getMonth() + formData.membershipDuration);

    // Calculate PT Expiry if applicable
    let ptExpiryStr: string | undefined = undefined;
    if (formData.hasPersonalTraining) {
      const ptExpiryObj = new Date(now);
      ptExpiryObj.setMonth(now.getMonth() + formData.ptDuration);
      ptExpiryStr = ptExpiryObj.toLocaleDateString();
    }

    const initialStatus = isSelfRegistration ? MemberStatus.PENDING : MemberStatus.ACTIVE;
    const paidAmount = formData.paymentMethod === PaymentMethod.LATER ? (parseFloat(formData.amountPaidNow) || 0) : totalAmount;
    const memberId = `MEGH-${timestamp}`;

    const newMember: Member = {
      id: memberId,
      name: formData.name,
      age: parseInt(formData.age) || 0,
      gender: formData.gender,
      phone: formData.phone,
      email: formData.email,
      photo: formData.photo,
      tier: MembershipTier.STANDARD,
      membershipDuration: formData.membershipDuration,
      hasPersonalTraining: formData.hasPersonalTraining,
      ptDuration: formData.hasPersonalTraining ? formData.ptDuration : undefined,
      totalPayable: totalAmount,
      amountPaid: paidAmount,
      paymentMethod: formData.paymentMethod,
      paymentDueDate: formData.paymentMethod === PaymentMethod.LATER ? formData.paymentDueDate : undefined,
      transactionId: formData.transactionId,
      fitnessGoals: formData.goals,
      joinDate: now.toLocaleDateString(),
      expiryDate: expiryDateObj.toLocaleDateString(),
      ptExpiryDate: ptExpiryStr,
      timestamp: timestamp,
      expiryTimestamp: expiryDateObj.getTime(),
      status: initialStatus,
      registrationSource: isSelfRegistration ? 'Client QR' : 'Admin'
    };

    if (isSelfRegistration) {
      localStorage.setItem('meghfit_registered_id', memberId);
    }

    onAdd(newMember);
  };

  const upiUri = `upi://pay?pa=${gymUpiId}&pn=MeghFit&am=${totalAmount}&cu=INR&tn=MeghFit_${formData.name.replace(/\s+/g, '')}`;
  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUri)}&color=0f172a&bgcolor=ffffff`;

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 md:p-10 rounded-[3rem] shadow-2xl w-full max-w-5xl mx-auto mb-10 animate-in slide-in-from-bottom-8 duration-700">
      <header className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between border-b border-slate-800 pb-6 gap-4">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic underline underline-offset-8 decoration-amber-500/30">Athlete Admission</h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic">Forge your future at Megh Fit</p>
        </div>
        {isSelfRegistration && onSwitchToLink && (
          <button 
            type="button" 
            onClick={onSwitchToLink}
            className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-[9px] font-black text-amber-500 uppercase tracking-widest hover:bg-slate-800 transition-all"
          >
            Already a member? Check In
          </button>
        )}
      </header>
      
      <form onSubmit={handleSubmit} className="space-y-12">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 flex flex-col items-center">
            <CameraCapture onCapture={(url) => setFormData(p => ({ ...p, photo: url }))} currentPhoto={formData.photo} />
            <div className="w-full mt-8 space-y-5 bg-slate-950/50 p-6 rounded-3xl border border-slate-800 shadow-inner">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Primary Phone *</label>
                <input type="tel" maxLength={10} value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))} className={`w-full bg-slate-950 border ${errors.phone ? 'border-red-500' : 'border-slate-800'} rounded-2xl px-5 py-4 text-white text-sm outline-none font-mono focus:border-amber-500 transition-all`} placeholder="9876543210" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Full Legal Name *</label>
                <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className={`w-full bg-slate-950 border ${errors.name ? 'border-red-500' : 'border-slate-800'} rounded-2xl px-5 py-4 text-white text-sm outline-none focus:border-amber-500 transition-all font-bold`} placeholder="John Doe" />
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-10">
            <div className="grid grid-cols-2 gap-6">
               <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Age</label>
                  <input type="number" value={formData.age} onChange={e => setFormData(p => ({ ...p, age: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white text-sm outline-none focus:border-amber-500 transition-all" />
               </div>
               <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Gender</label>
                  <select value={formData.gender} onChange={e => setFormData(p => ({ ...p, gender: e.target.value as Gender }))} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white text-xs font-bold outline-none cursor-pointer">
                    <option value={Gender.MALE}>Male</option>
                    <option value={Gender.FEMALE}>Female</option>
                  </select>
               </div>
            </div>

            <div className="space-y-6">
              <label className="block text-[11px] font-black text-white uppercase tracking-widest border-l-4 border-amber-500 pl-4">Plan Selection</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1, 3, 6, 12].map(m => (
                  <button key={m} type="button" onClick={() => setFormData(p => ({ ...p, membershipDuration: m as DurationMonths }))} className={`py-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${formData.membershipDuration === m ? 'bg-amber-500 border-amber-400 text-slate-900 shadow-lg shadow-amber-500/10' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'}`}>
                    <span className="text-xs font-black">{m} MONTH</span>
                    <span className="text-[9px] opacity-70">₹{membershipPrices[m]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-950/50 p-6 rounded-[2rem] border border-slate-800 space-y-6 shadow-inner">
               <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-3 cursor-pointer">
                     <input type="checkbox" checked={formData.hasPersonalTraining} onChange={e => setFormData(p => ({ ...p, hasPersonalTraining: e.target.checked }))} className="w-5 h-5 rounded-md accent-blue-500" />
                     Personal Training Add-on
                  </label>
               </div>
               {formData.hasPersonalTraining && (
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 animate-in fade-in slide-in-from-top-4 duration-300">
                   {[1, 3, 6, 12].map(m => (
                     <button key={m} type="button" onClick={() => setFormData(p => ({ ...p, ptDuration: m as DurationMonths }))} className={`py-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${formData.ptDuration === m ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/10' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}>
                       <span className="text-[10px] font-black">{m}M PT</span>
                       <span className="text-[8px] opacity-70">₹{ptPrices[m]}</span>
                     </button>
                   ))}
                 </div>
               )}
            </div>

            <div>
               <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Core Fitness Goals *</label>
               <textarea value={formData.goals} onChange={e => setFormData(p => ({ ...p, goals: e.target.value }))} className={`w-full bg-slate-950 border ${errors.goals ? 'border-red-500' : 'border-slate-800'} rounded-2xl px-5 py-4 text-white text-sm min-h-[100px] outline-none shadow-inner focus:border-amber-500 transition-all`} placeholder="e.g. Muscle gain, weight loss, athletic endurance..." />
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl space-y-8 text-slate-900" style={{ colorScheme: 'light' }}>
               <div className="flex justify-between items-center border-b border-slate-200 pb-6">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Enrollment Total</p>
                  <p className="text-4xl font-black text-slate-900 tracking-tighter italic">₹{totalAmount}</p>
               </div>
               
               <div className="space-y-6">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Payment Method</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[PaymentMethod.UPI, PaymentMethod.CASH, PaymentMethod.LATER].map(m => (
                      <button key={m} type="button" onClick={() => setFormData(p => ({ ...p, paymentMethod: m }))} className={`py-4 rounded-2xl border-2 font-black uppercase text-[10px] tracking-widest transition-all ${formData.paymentMethod === m ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'}`}>{m}</button>
                    ))}
                  </div>
                  
                  <div className="pt-2 animate-in fade-in duration-300">
                    {formData.paymentMethod === PaymentMethod.UPI && (
                      <div className="flex flex-col sm:flex-row gap-6 items-center bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                         <div className="flex-1 w-full space-y-3">
                            <label className="text-[9px] font-black text-slate-700 uppercase">Transaction ID / UTR</label>
                            <input type="text" value={formData.transactionId} onChange={e => setFormData(p => ({ ...p, transactionId: e.target.value }))} className="w-full bg-white border border-slate-400 rounded-xl px-4 py-3 text-xs font-mono outline-none shadow-sm focus:border-slate-900 text-slate-900 placeholder-slate-400" placeholder="Reference #" />
                         </div>
                         <div className="shrink-0 p-3 bg-white rounded-3xl shadow-xl border border-slate-100">
                            <img src={upiQrUrl} alt="UPI QR" className="w-24 h-24" />
                         </div>
                      </div>
                    )}
                    {formData.paymentMethod === PaymentMethod.LATER && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-800 uppercase">Initial Payment (₹)</label>
                          <input 
                            type="number" 
                            value={formData.amountPaidNow} 
                            onChange={e => setFormData(p => ({ ...p, amountPaidNow: e.target.value }))} 
                            className={`w-full bg-white border-2 ${isOverpaidAtEnrollment ? 'border-red-500' : 'border-slate-300'} rounded-xl px-4 py-3 text-sm font-black outline-none shadow-sm transition-all text-slate-900 placeholder-slate-400 focus:border-slate-900`} 
                            placeholder="0" 
                          />
                          {isOverpaidAtEnrollment && (
                            <p className="text-[8px] font-black text-red-600 uppercase">Error: Exceeds Total</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-800 uppercase">Promise Date</label>
                          <input 
                            type="date" 
                            value={formData.paymentDueDate} 
                            onChange={e => setFormData(p => ({ ...p, paymentDueDate: e.target.value }))} 
                            className="w-full bg-white border-2 border-slate-300 rounded-xl px-4 py-3 text-xs font-black outline-none shadow-sm text-slate-900 focus:border-slate-900" 
                          />
                        </div>
                      </div>
                    )}
                  </div>
               </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              {!isSelfRegistration && (
                <button type="button" onClick={onCancel} className="flex-1 py-5 bg-slate-800 text-slate-500 rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest active:scale-95 transition-all">Cancel</button>
              )}
              <button 
                type="submit" 
                disabled={isSubmitting || isOverpaidAtEnrollment} 
                className={`flex-[2] py-5 bg-amber-500 text-slate-950 rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Processing Admission...
                  </>
                ) : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default MemberForm;
