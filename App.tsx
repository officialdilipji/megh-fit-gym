
import React, { useState, useEffect, useCallback } from 'react';
import { Member, AppState, MembershipTier, MemberStatus, DEFAULT_TIER_CONFIG, TierSettings } from './types';
import MemberForm from './components/MemberForm';
import MemberList from './components/MemberList';
import MemberProfileView from './components/MemberProfileView';
import { PlusIcon } from './components/Icons';
import { getFitnessInsights } from './services/geminiService';
import { syncMemberToSheet } from './services/googleSheetService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const savedMembers = localStorage.getItem('titan_gym_members');
    const savedSettings = localStorage.getItem('titan_gym_settings');
    
    return {
      members: savedMembers ? JSON.parse(savedMembers) : [],
      isAddingMember: false,
      searchTerm: '',
      sortOrder: 'newest',
      currentView: 'admin',
      tierSettings: savedSettings ? JSON.parse(savedSettings) : DEFAULT_TIER_CONFIG
    };
  });

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showJoinQR, setShowJoinQR] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync with LocalStorage
  useEffect(() => {
    localStorage.setItem('titan_gym_members', JSON.stringify(state.members));
    localStorage.setItem('titan_gym_settings', JSON.stringify(state.tierSettings));
  }, [state.members, state.tierSettings]);

  // Unified Routing Handler
  const handleNavigation = useCallback(() => {
    const hash = window.location.hash;
    
    if (hash === '#join') {
      setState(prev => ({ ...prev, currentView: 'client', isAddingMember: false }));
      setSelectedMember(null);
      setShowSettings(false);
    } else {
      setState(prev => ({ ...prev, currentView: 'admin' }));
      
      if (hash.startsWith('#profile/')) {
        const id = hash.replace('#profile/', '');
        const member = state.members.find(m => m.id === id);
        if (member) {
          setSelectedMember(member);
        } else {
          const localMembers = JSON.parse(localStorage.getItem('titan_gym_members') || '[]');
          const localMember = localMembers.find((m: any) => m.id === id);
          if (localMember) setSelectedMember(localMember);
        }
      } else {
        setSelectedMember(null);
      }
    }
  }, [state.members]);

  useEffect(() => {
    handleNavigation();
    window.addEventListener('hashchange', handleNavigation);
    return () => window.removeEventListener('hashchange', handleNavigation);
  }, [handleNavigation]);

  const handleAddMember = async (newMember: Member) => {
    setState(prev => ({
      ...prev,
      members: [newMember, ...prev.members],
      isAddingMember: false
    }));
    
    setIsSyncing(true);
    await syncMemberToSheet(newMember);
    setIsSyncing(false);

    if (state.currentView === 'client') {
      setJustSubmitted(true);
    }
  };

  const handleApprove = async (member: Member) => {
    if (!confirm(`Confirm activation for ${member.name}?`)) return;

    const now = new Date();
    const duration = state.tierSettings[member.tier].durationMonths;
    const expiryDateObj = new Date(now);
    expiryDateObj.setMonth(now.getMonth() + duration);

    const insights = await getFitnessInsights({
      name: member.name,
      age: member.age,
      gender: member.gender,
      goals: member.fitnessGoals,
      tier: member.tier
    });

    const updatedMember: Member = { 
      ...member, 
      status: MemberStatus.ACTIVE, 
      joinDate: now.toLocaleDateString(), 
      expiryDate: expiryDateObj.toLocaleDateString(),
      expiryTimestamp: expiryDateObj.getTime(),
      aiInsights: insights 
    };

    setState(prev => ({
      ...prev,
      members: prev.members.map(m => m.id === member.id ? updatedMember : m)
    }));

    setIsSyncing(true);
    await syncMemberToSheet(updatedMember);
    setIsSyncing(false);
  };

  const handleDeleteMember = (id: string) => {
    if (confirm('Are you sure you want to remove this member?')) {
      setState(prev => ({
        ...prev,
        members: prev.members.filter(m => m.id !== id)
      }));
    }
  };

  const handlePriceUpdate = (tier: MembershipTier, newPrice: number) => {
    setState(prev => ({
      ...prev,
      tierSettings: {
        ...prev.tierSettings,
        [tier]: {
          ...prev.tierSettings[tier],
          price: newPrice
        }
      }
    }));
  };

  const toggleSort = () => {
    setState(prev => ({
      ...prev,
      sortOrder: prev.sortOrder === 'newest' ? 'oldest' : 'newest'
    }));
  };

  const stats = {
    total: state.members.filter(m => m.status === MemberStatus.ACTIVE).length,
    pending: state.members.filter(m => m.status === MemberStatus.PENDING).length,
    premium: state.members.filter(m => m.tier === MembershipTier.PREMIUM && m.status === MemberStatus.ACTIVE).length,
    activeRevenue: state.members.reduce((acc, m) => m.status === MemberStatus.ACTIVE ? acc + m.amountPaid : acc, 0)
  };

  const closeProfile = () => {
    setSelectedMember(null);
    window.location.hash = '';
  };

  // Robust join link generation
  const getJoinLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#join`;
  };

  const joinLink = getJoinLink();
  const joinQRUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(joinLink)}&color=f59e0b&bgcolor=0f172a&margin=20`;

  const goToAdmin = () => {
    window.location.hash = '';
    setState(prev => ({ ...prev, currentView: 'admin', isAddingMember: false }));
  };

  if (state.currentView === 'client') {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center bg-slate-950">
        <div className="max-w-4xl w-full pt-8">
           <header className="mb-12 text-center relative">
             <div className="flex justify-center mb-8">
               <button 
                onClick={goToAdmin} 
                className="px-10 py-4 bg-amber-500 text-slate-900 rounded-full font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:bg-amber-400 transition transform active:scale-95 flex items-center gap-3 border-4 border-slate-900"
               >
                 <span>←</span> BACK TO ADMIN
               </button>
             </div>
             <h1 className="text-4xl font-black text-white tracking-tighter uppercase border-b-2 border-amber-500 inline-block pb-2 px-4">MEGH FIT CLUB</h1>
             <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-[10px] mt-4">Self Registration Portal</p>
           </header>

           {justSubmitted ? (
             <div className="bg-slate-900/50 border border-emerald-500/30 p-10 rounded-3xl text-center animate-in zoom-in duration-500 shadow-2xl">
               <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-900">
                 <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
               </div>
               <h2 className="text-2xl font-black text-white mb-2">Registration Submitted!</h2>
               <p className="text-slate-400 mb-8 max-w-sm mx-auto">Please proceed to the front desk and complete your payment to activate your membership.</p>
               <div className="flex flex-col gap-3 max-w-xs mx-auto">
                 <button 
                  onClick={() => setJustSubmitted(false)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-8 py-3 rounded-xl text-xs font-bold uppercase transition shadow-lg"
                 >
                   Register Another
                 </button>
                 <button 
                  onClick={goToAdmin}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-xl text-xs font-bold uppercase transition border border-slate-700"
                 >
                   Return to Dashboard
                 </button>
               </div>
             </div>
           ) : (
            <MemberForm 
              isSelfRegistration 
              onAdd={handleAddMember} 
              onCancel={goToAdmin}
              tierSettings={state.tierSettings}
            />
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-slate-950 text-slate-200">
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-black tracking-tighter text-white uppercase">MEGH FIT<span className="text-amber-500 ml-1">GYM CLUB</span></h1>
              <div className="flex items-center gap-2">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Admin Portal</p>
                {isSyncing && (
                  <span className="flex h-2 w-2 relative" title="Syncing to Cloud...">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden lg:block">
              <input 
                type="text"
                placeholder="Search athletes..."
                value={state.searchTerm}
                onChange={e => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="bg-slate-800 border border-slate-700 rounded-full px-5 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none w-64 transition"
              />
            </div>
            
            <button
              onClick={() => setShowJoinQR(true)}
              className="bg-slate-800 hover:bg-slate-700 text-amber-500 border border-slate-700 px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 transition"
            >
              Scan Join QR
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-full transition ${showSettings ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
              title="Membership Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </button>

            {!state.isAddingMember && (
              <button
                onClick={() => setState(prev => ({ ...prev, isAddingMember: true }))}
                className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition shadow-lg shadow-amber-500/20"
              >
                <PlusIcon /> New Entry
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8">
        {showSettings && (
          <div className="mb-8 p-6 bg-slate-900 border border-amber-500/30 rounded-3xl animate-in slide-in-from-top duration-300 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-white uppercase">Gym Fee Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(Object.keys(MembershipTier) as Array<keyof typeof MembershipTier>).map((key) => {
                const tier = MembershipTier[key];
                const config = state.tierSettings[tier];
                return (
                  <div key={tier} className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
                    <label className="block text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3">{tier} Tier Fee (₹)</label>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-black text-slate-400">₹</span>
                      <input 
                        type="number"
                        value={config.price}
                        onChange={(e) => handlePriceUpdate(tier, parseInt(e.target.value) || 0)}
                        className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xl font-black text-white w-full outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <p className="text-[9px] text-slate-500 mt-2 italic">Auto-calculated for {config.durationMonths} month(s) duration.</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end">
               <p className="text-xs text-emerald-500 font-bold flex items-center gap-2">
                 <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                 Prices auto-saved to system
               </p>
            </div>
          </div>
        )}

        {!state.isAddingMember && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl shadow-xl">
              <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Active</p>
              <h4 className="text-2xl sm:text-4xl font-black text-amber-500">{stats.total}</h4>
            </div>
            <div className="bg-slate-900/50 border border-amber-500/30 p-6 rounded-2xl shadow-xl">
              <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Pending</p>
              <h4 className="text-2xl sm:text-4xl font-black text-white">{stats.pending}</h4>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl shadow-xl">
              <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Premium</p>
              <h4 className="text-2xl sm:text-4xl font-black text-white">{stats.premium}</h4>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl shadow-xl">
              <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Revenue</p>
              <h4 className="text-2xl sm:text-4xl font-black text-emerald-500">₹{stats.activeRevenue}</h4>
            </div>
          </div>
        )}

        <div className="min-h-[500px]">
          {state.isAddingMember ? (
            <MemberForm 
              onAdd={handleAddMember} 
              onCancel={() => setState(prev => ({ ...prev, isAddingMember: false }))}
              tierSettings={state.tierSettings}
            />
          ) : (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                 <h2 className="text-2xl font-black text-white uppercase tracking-tight">Athlete Directory</h2>
                 <div className="flex items-center gap-4">
                   <button 
                    onClick={toggleSort}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-4 py-2 text-xs font-bold text-slate-300 transition whitespace-nowrap"
                   >
                     Sort: {state.sortOrder === 'newest' ? 'Newest' : 'Oldest'}
                   </button>
                 </div>
              </div>
              <MemberList 
                members={state.members} 
                onDelete={handleDeleteMember}
                onSelect={(m) => {
                  window.location.hash = `#profile/${m.id}`;
                }}
                onApprove={handleApprove}
                searchTerm={state.searchTerm}
                sortOrder={state.sortOrder}
                tierSettings={state.tierSettings}
              />
            </>
          )}
        </div>
      </main>

      {selectedMember && (
        <MemberProfileView 
          member={selectedMember} 
          onClose={closeProfile} 
        />
      )}

      {showJoinQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center shadow-2xl">
            <button 
              onClick={() => setShowJoinQR(false)}
              className="absolute top-6 right-6 text-slate-500 hover:text-white transition p-2 bg-slate-800 rounded-full h-10 w-10 flex items-center justify-center"
            >✕</button>
            <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Registration QR</h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">Let members register on their own phones.</p>
            <div className="bg-white p-8 rounded-3xl mx-auto shadow-inner border-4 border-amber-500 mb-8">
              <img src={joinQRUrl} alt="Join QR" className="w-full h-auto rounded-lg" />
            </div>
            <p className="text-amber-500 font-mono text-[10px] font-bold tracking-tight mb-8 break-all opacity-60 bg-slate-950 p-3 rounded-lg border border-slate-800">
              {joinLink}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => window.print()}
                className="py-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition border border-slate-700"
              >
                Print Poster
              </button>
              <button 
                onClick={() => setShowJoinQR(false)}
                className="py-4 bg-amber-500 text-slate-900 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-amber-400 transition shadow-lg shadow-amber-500/20"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
