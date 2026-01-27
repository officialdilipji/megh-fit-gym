import React, { useState, useEffect } from 'react';
import { Member, MembershipTier, Gender, PaymentMethod, TierSettings, MemberStatus } from '../types';
import CameraCapture from './CameraCapture';
import { getFitnessInsights } from '../services/geminiService';

interface MemberFormProps {
  onAdd: (member: Member) => void;
  onCancel: () => void;
  isSelfRegistration?: boolean;
  tierSettings: TierSettings;
}

const MemberForm: React.FC<MemberFormProps> = ({ onAdd, onCancel, tierSettings, isSelfRegistration = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: Gender.MALE,
    phone: '',
    email: '',
    tier: MembershipTier.BASIC,
    amount: tierSettings[MembershipTier.BASIC].price.toString(),
    paymentMethod: PaymentMethod.UPI,
    transactionId: '',
    goals: '',
    photo: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync amount if tier changes or settings change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      amount: tierSettings[prev.tier].price.toString()
    }));
  }, [formData.tier, tierSettings]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    
    const ageNum = parseInt(formData.age);
    if (isNaN(ageNum) || ageNum < 10 || ageNum > 100) {
      newErrors.age = "Age must be between 10 and 100";
    }

    if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = "Phone must be exactly 10 digits";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }

    if (!formData.goals.trim()) newErrors.goals = "Please specify fitness goals";
    if (!formData.photo) newErrors.photo = "Member photo is mandatory";

    if (formData.paymentMethod === PaymentMethod.UPI && !formData.transactionId.trim()) {
      newErrors.transactionId = "Transaction ID is required for UPI";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTierChange = (tier: MembershipTier) => {
    setFormData(prev => ({ 
      ...prev, 
      tier, 
      amount: tierSettings[tier].price.toString() 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsSubmitting(true);
    
    const now = new Date();
    const timestamp = now.getTime();
    const duration = tierSettings[formData.tier].durationMonths;
    const expiryDateObj = new Date(now);
    expiryDateObj.setMonth(now.getMonth() + duration);

    const initialStatus = isSelfRegistration ? MemberStatus.PENDING : MemberStatus.ACTIVE;

    let insights: string = "";
    if (initialStatus === MemberStatus.ACTIVE) {
      const generatedInsights = await getFitnessInsights({
        name: formData.name,
        age: parseInt(formData.age) || 0,
        gender: formData.gender as string,
        goals: formData.goals,
        tier: formData.tier as string
      });
      insights = generatedInsights;
    }
    
    const newMember: Member = {
      id: `MEGH-${timestamp}`,
      name: formData.name,
      age: parseInt(formData.age) || 0,
      gender: formData.gender,
      phone: formData.phone,
      email: formData.email,
      photo: formData.photo,
      tier: formData.tier,
      amountPaid: parseFloat(formData.amount),
      paymentMethod: formData.paymentMethod,
      transactionId: formData.transactionId,
      fitnessGoals: formData.goals,
      joinDate: now.toLocaleDateString(),
      expiryDate: expiryDateObj.toLocaleDateString(),
      timestamp: timestamp,
      expiryTimestamp: expiryDateObj.getTime(),
      status: initialStatus,
      aiInsights: insights,
      registrationSource: isSelfRegistration ? 'Client QR' : 'Admin'
    };

    onAdd(newMember);
    setIsSubmitting(false);
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-md p-6 rounded-2xl border border-slate-700 animate-in fade-in zoom-in duration-300">
      <h2 className="text-2xl font-bold mb-6 text-amber-500">
        {isSelfRegistration ? "Join the Tribe" : "New Admission"}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1 space-y-4">
            <CameraCapture 
              onCapture={(dataUrl) => setFormData(prev => ({ ...prev, photo: dataUrl }))} 
              currentPhoto={formData.photo}
            />
            
            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full bg-slate-900 border ${errors.name ? 'border-red-500' : 'border-slate-700'} rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 outline-none transition`}
                  placeholder="Full Name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Age</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={e => setFormData(prev => ({ ...prev, age: e.target.value }))}
                  className={`w-full bg-slate-900 border ${errors.age ? 'border-red-500' : 'border-slate-700'} rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 outline-none transition`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={e => setFormData(prev => ({ ...prev, gender: e.target.value as Gender }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 outline-none transition"
                >
                  <option value={Gender.MALE}>Male</option>
                  <option value={Gender.FEMALE}>Female</option>
                  <option value={Gender.OTHER}>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className={`w-full bg-slate-900 border ${errors.phone ? 'border-red-500' : 'border-slate-700'} rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 outline-none transition`}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className={`w-full bg-slate-900 border ${errors.email ? 'border-red-500' : 'border-slate-700'} rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 outline-none transition`}
              />
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Select Membership</label>
              <div className="grid grid-cols-3 gap-3 mt-1">
                {(Object.keys(MembershipTier) as Array<keyof typeof MembershipTier>).map((key) => {
                  const tier = MembershipTier[key];
                  const config = tierSettings[tier];
                  const isActive = formData.tier === tier;
                  return (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => handleTierChange(tier)}
                      className={`p-3 rounded-xl border transition-all text-left ${
                        isActive 
                        ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500' 
                        : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <p className={`text-[10px] font-bold uppercase ${isActive ? 'text-amber-500' : 'text-slate-500'}`}>{tier}</p>
                      <p className="text-sm font-black text-white mt-1">₹{config.price}</p>
                      <p className="text-[9px] text-slate-400">{config.durationMonths} Mo.</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Fitness Goals</label>
              <textarea
                value={formData.goals}
                onChange={e => setFormData(prev => ({ ...prev, goals: e.target.value }))}
                className={`w-full bg-slate-900 border ${errors.goals ? 'border-red-500' : 'border-slate-700'} rounded-lg px-4 py-3 h-20 focus:ring-2 focus:ring-amber-500 outline-none transition resize-none text-sm`}
                placeholder="e.g. Weight loss, Strength training..."
              />
            </div>

            <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-700 space-y-4">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-slate-400 uppercase">Payment Method</label>
                <div className="flex gap-4">
                  {Object.values(PaymentMethod).map(method => (
                    <label key={method} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        className="accent-amber-500 h-4 w-4"
                        checked={formData.paymentMethod === method}
                        onChange={() => setFormData(prev => ({ ...prev, paymentMethod: method }))}
                      />
                      <span className="text-xs group-hover:text-amber-500 transition">{method}</span>
                    </label>
                  ))}
                </div>
              </div>

              {formData.paymentMethod === PaymentMethod.UPI && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Transaction ID</label>
                  <input
                    type="text"
                    value={formData.transactionId}
                    onChange={e => setFormData(prev => ({ ...prev, transactionId: e.target.value }))}
                    className={`w-full bg-slate-950 border ${errors.transactionId ? 'border-red-500' : 'border-slate-800'} rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition`}
                    placeholder="UPI Ref / TXN Number"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-600 transition text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-[2] py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold hover:from-amber-600 hover:to-orange-700 transition shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {isSubmitting ? 'Syncing...' : isSelfRegistration ? 'Join Now' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default MemberForm;