
import React, { useState, useEffect, useMemo } from 'react';
import { Member, MembershipTier, Gender, PaymentMethod, TierSettings, PTSettings, MemberStatus, DurationMonths } from '../types';
import CameraCapture from './CameraCapture';
import { getFitnessInsights } from '../services/geminiService';

interface MemberFormProps {
  onAdd: (member: Member) => void;
  onCancel: () => void;
  isSelfRegistration?: boolean;
  tierSettings: TierSettings;
  ptSettings: PTSettings;
  gymUpiId?: string;
}

const MemberForm: React.FC<MemberFormProps> = ({ onAdd, onCancel, tierSettings, ptSettings, isSelfRegistration = false, gymUpiId = 'meghfit@upi' }) => {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: Gender.MALE,
    phone: '',
    email: '',
    tier: MembershipTier.BASIC,
    membershipDuration: 1 as DurationMonths,
    hasPersonalTraining: false,
    ptDuration: 1 as DurationMonths,
    paymentMethod: isSelfRegistration ? PaymentMethod.LATER : PaymentMethod.UPI,
    amountPaidNow: '',
    paymentDueDate: '',
    transactionId: '',
    goals: '',
    photo: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle URL pre-fill on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlName = params.get('name') || '';
    const urlPhone = params.get('phone') || '';
    const urlEmail = params.get('email') || '';
    const urlGoals = params.get('goals') || '';
    
    if (urlName || urlPhone || urlEmail || urlGoals) {
      setFormData(prev => ({
        ...prev,
        name: urlName || prev.name,
        phone: urlPhone ? urlPhone.replace(/\D/g, '').slice(0,10) : prev.phone,
        email: urlEmail || prev.email,
        goals: urlGoals || prev.goals
      }));
    }
  }, []);

  const durationOptions: DurationMonths[] = [1, 3, 6, 12];

  const totalAmount = useMemo(() => {
    const basePrice = tierSettings[formData.tier][formData.membershipDuration] || 0;
    const ptPrice = formData.hasPersonalTraining ? (ptSettings[formData.ptDuration] || 0) : 0;
    return basePrice + ptPrice;
  }, [formData.tier, formData.membershipDuration, formData.hasPersonalTraining, formData.ptDuration, tierSettings, ptSettings]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    const ageNum = parseInt(formData.age);
    if (isNaN(ageNum) || ageNum < 5 || ageNum > 100) newErrors.age = "Valid age required";
    if (!/^\d{10}$/.test(formData.phone)) newErrors.phone = "Provide a 10-digit number";
    if (!formData.goals.trim()) newErrors.goals = "Specify fitness goals";
    
    // Strict Payment Validation
    if (formData.paymentMethod === PaymentMethod.UPI && !formData.transactionId.trim()) {
      newErrors.transactionId = "Transaction ID required for UPI";
    }
    if (formData.paymentMethod === PaymentMethod.LATER && !formData.paymentDueDate) {
      newErrors.paymentDueDate = "Must set a promise date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    
    const now = new Date();
    const timestamp = now.getTime();
    const expiryDateObj = new Date(now);
    expiryDateObj.setMonth(now.getMonth() + formData.membershipDuration);

    let ptExpiryObj: Date | undefined;
    if (formData.hasPersonalTraining) {
      ptExpiryObj = new Date(now);
      ptExpiryObj.setMonth(now.getMonth() + formData.ptDuration);
    }

    const initialStatus = isSelfRegistration ? MemberStatus.PENDING : MemberStatus.ACTIVE;
    
    // Logic: Full payment if UPI/Cash, partial if LATER
    const paidAmount = formData.paymentMethod === PaymentMethod.LATER 
      ? (parseFloat(formData.amountPaidNow) || 0) 
      : totalAmount;

    let insights: string = "";
    try {
      insights = await getFitnessInsights({
        name: formData.name, age: parseInt(formData.age) || 0, gender: formData.gender, goals: formData.goals, tier: formData.tier
      });
    } catch (e) { insights = "Welcome to Megh Fit!"; }
    
    const newMember: Member = {
      id: `MEGH-${timestamp}`,
      name: formData.name,
      age: parseInt(formData.age) || 0,
      gender: formData.gender,
      phone: formData.phone,
      email: formData.email,
      photo: formData.photo,
      tier: formData.tier,
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
      ptExpiryDate: ptExpiryObj?.toLocaleDateString(),
      timestamp: timestamp,
      expiryTimestamp: expiryDateObj.getTime(),
      ptExpiryTimestamp: ptExpiryObj?.getTime(),
      status: initialStatus,
      aiInsights: insights,
      registrationSource: isSelfRegistration ? 'Client QR' : 'Admin'
    };

    onAdd(newMember);
    setIsSubmitting(false);
  };

  const upiUri = `upi://pay?pa=${gymUpiId}&pn=MeghFit&am=${totalAmount}&cu=INR&tn=MeghFit_${formData.name.replace(/\s+/g, '')}`;
  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUri)}&color=0f172a&bgcolor=ffffff`;

  return (
    <div className="bg-slate-900 border border-slate-800 p-8 md:p-12 rounded-[3rem] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-5xl mx-auto">
      <header className="mb-10 text-center sm:text-left">
        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
          {isSelfRegistration ? 'Athlete Registration' : 'New Enrollment'}
        </h2>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Megh Fit Performance Hub</p>
      </header>
      
      <form onSubmit={handleSubmit} className="space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Photo & Contact */}
          <div className="lg:col-span-4 space-y-8">
            <CameraCapture onCapture={(url) => setFormData(p => ({ ...p, photo: url }))} currentPhoto={formData.photo} />
            
            <div className="space-y-6 bg-slate-950/50 p-6 rounded-3xl border border-slate-800">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Mobile Number *</label>
                <input type="tel" maxLength={10} value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))} className={`w-full bg-slate-950 border ${errors.phone ? 'border-red-500' : 'border-slate-800'} rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-amber-500 outline-none transition`} placeholder="10-digit #" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
                <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-amber-500 outline-none transition text-sm" placeholder="Optional" />
              </div>
            </div>
          </div>

          {/* Right Column: Details & Payment */}
          <div className="lg:col-span-8 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Full Name *</label>
                <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className={`w-full bg-slate-950 border ${errors.name ? 'border-red-500' : 'border-slate-800'} rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-amber-500 outline-none transition`} placeholder="Athlete Name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Age *</label>
                  <input type="number" value={formData.age} onChange={e => setFormData(p => ({ ...p, age: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Gender</label>
                  <select value={formData.gender} onChange={e => setFormData(p => ({ ...p, gender: e.target.value as Gender }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold focus:ring-1 focus:ring-amber-500 outline-none appearance-none">
                    <option value={Gender.MALE}>Male</option>
                    <option value={Gender.FEMALE}>Female</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-6">
               <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] border-l-4 border-amber-500 pl-4">1. Membership Tier</h4>
               <div className="grid grid-cols-3 gap-3">
                 {Object.values(MembershipTier).map(tier => (
                   <button key={tier} type="button" onClick={() => setFormData(p => ({ ...p, tier }))} className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${formData.tier === tier ? 'bg-amber-500 border-amber-400 text-slate-900 shadow-lg shadow-amber-500/20' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}>{tier}</button>
                 ))}
               </div>
               <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar">
                 {durationOptions.map(m => (
                   <button key={m} type="button" onClick={() => setFormData(p => ({ ...p, membershipDuration: m }))} className={`px-6 py-2 rounded-full border text-[9px] font-black uppercase tracking-tighter whitespace-nowrap transition-all ${formData.membershipDuration === m ? 'bg-white border-white text-slate-950 shadow-md' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>{m} Month{m > 1 ? 's' : ''} • ₹{tierSettings[formData.tier][m]}</button>
                 ))}
               </div>
            </div>

            <div className={`space-y-6 p-6 rounded-3xl border transition-all ${formData.hasPersonalTraining ? 'bg-amber-500/5 border-amber-500/30' : 'bg-slate-950 border-slate-800'}`}>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">2. Personal Training (Add-on)</h4>
                <button type="button" onClick={() => setFormData(p => ({ ...p, hasPersonalTraining: !p.hasPersonalTraining }))} className={`w-12 h-6 rounded-full relative transition-colors ${formData.hasPersonalTraining ? 'bg-amber-500' : 'bg-slate-800'}`}>
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${formData.hasPersonalTraining ? 'translate-x-6' : ''}`}></div>
                </button>
              </div>
              {formData.hasPersonalTraining && (
                <div className="animate-in slide-in-from-top-4 duration-300">
                   <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar">
                    {durationOptions.map(m => (
                      <button key={m} type="button" onClick={() => setFormData(p => ({ ...p, ptDuration: m }))} className={`px-6 py-2 rounded-full border text-[9px] font-black uppercase tracking-tighter whitespace-nowrap transition-all ${formData.ptDuration === m ? 'bg-amber-500 border-amber-400 text-slate-900 shadow-md' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>{m} Month{m > 1 ? 's' : ''} • ₹{ptSettings[m]}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Payment Section: Mandatory for both Admin and Client modes to ensure financial clarity */}
            <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-2xl space-y-8 border border-slate-200">
               <div className="flex justify-between items-center border-b border-slate-100 pb-6">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculated Total</span>
                  <span className="text-3xl font-black text-slate-900 tracking-tighter">₹{totalAmount}</span>
               </div>
               
               <div className="space-y-6">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Payment Method</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[PaymentMethod.UPI, PaymentMethod.CASH, PaymentMethod.LATER].map(m => (
                      <button key={m} type="button" onClick={() => setFormData(p => ({ ...p, paymentMethod: m }))} className={`px-4 py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${formData.paymentMethod === m ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                  
                  <div className="pt-4">
                    {formData.paymentMethod === PaymentMethod.LATER ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-4">
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Amount Paid Now</label>
                          <div className="relative">
                             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                             <input type="number" placeholder="0" value={formData.amountPaidNow} onChange={e => setFormData(p => ({ ...p, amountPaidNow: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-sm text-slate-900 outline-none" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Balance Promise Date *</label>
                          <input type="date" value={formData.paymentDueDate} onChange={e => setFormData(p => ({ ...p, paymentDueDate: e.target.value }))} className={`w-full bg-slate-50 border ${errors.paymentDueDate ? 'border-red-500' : 'border-slate-200'} rounded-xl px-4 py-3 text-sm text-slate-900 outline-none`} />
                        </div>
                      </div>
                    ) : formData.paymentMethod === PaymentMethod.UPI ? (
                      <div className="flex flex-col md:flex-row gap-6 items-center animate-in slide-in-from-top-4">
                         <div className="flex-1 w-full">
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">UPI Transaction ID (UTR) *</label>
                            <input type="text" value={formData.transactionId} onChange={e => setFormData(p => ({ ...p, transactionId: e.target.value }))} className={`w-full bg-slate-50 border ${errors.transactionId ? 'border-red-500' : 'border-slate-200'} rounded-xl px-4 py-4 text-xs font-mono text-amber-600 outline-none focus:ring-1 focus:ring-amber-500`} placeholder="Enter Ref Number" />
                            <p className="text-[7px] text-slate-400 font-black uppercase mt-2">Required for verification</p>
                         </div>
                         <div className="p-3 bg-white border-2 border-slate-100 rounded-3xl shadow-inner shrink-0 group">
                            <img src={upiQrUrl} alt="UPI QR" className="w-28 h-28 group-hover:scale-110 transition-transform duration-500" />
                            <p className="text-[7px] text-center text-slate-400 font-black uppercase mt-2">{gymUpiId}</p>
                         </div>
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in">
                         <p className="text-[10px] text-slate-500 font-bold text-center uppercase leading-relaxed">Cash Payment of <span className="text-slate-900 font-black">₹{totalAmount}</span> will be verified by the front desk representative.</p>
                      </div>
                    )}
                  </div>
               </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Athlete Goals *</label>
              <textarea value={formData.goals} onChange={e => setFormData(prev => ({ ...prev, goals: e.target.value }))} className={`w-full bg-slate-950 border ${errors.goals ? 'border-red-500' : 'border-slate-800'} rounded-2xl px-4 py-4 h-24 text-sm text-white focus:ring-1 focus:ring-amber-500 outline-none transition resize-none`} placeholder="e.g. 5kg weight loss, muscle gain, cardio endurance..." />
            </div>

            <div className="flex gap-4">
              <button type="button" onClick={onCancel} className="flex-1 py-5 bg-slate-800 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:text-white transition">Exit Form</button>
              <button type="submit" disabled={isSubmitting} className="flex-[2] py-5 bg-amber-500 text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-amber-400 transition shadow-xl shadow-amber-500/20 active:scale-95 disabled:opacity-50">
                {isSubmitting ? 'Processing...' : isSelfRegistration ? 'Submit Application' : 'Finalize Enrollment'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default MemberForm;
