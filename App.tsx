
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Member, AppState, MembershipTier, MemberStatus, DEFAULT_TIER_CONFIG, DEFAULT_PT_CONFIG, AttendanceLog, AdminConfig, TierSettings, PTSettings, DurationMonths } from './types';
import MemberForm from './components/MemberForm';
import MemberList from './components/MemberList';
import MemberProfileView from './components/MemberProfileView';
import AdminLogin from './components/AdminLogin';
import HomeView from './components/HomeView';
import LandingView from './components/LandingView';
import { getFitnessInsights } from './services/geminiService';
import { syncMemberToSheet, fetchMembersFromSheet, syncAttendanceToSheet, fetchAttendanceLogs, deleteMemberFromSheet } from './services/googleSheetService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const savedMembers = localStorage.getItem('titan_gym_members');
    const savedAttendance = localStorage.getItem('titan_gym_attendance');
    const savedSettings = localStorage.getItem('titan_gym_settings');
    const savedPTSettings = localStorage.getItem('titan_gym_pt_settings');
    const savedAdmin = localStorage.getItem('titan_gym_admin');
    const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';
    const isFrontDeskUnlocked = sessionStorage.getItem('front_desk_unlocked') === 'true';
    
    const hash = window.location.hash;
    let initialView: 'home' | 'admin' | 'client' | 'login' | 'landing' = 'landing';
    
    // Auto-navigate based on login and hash
    if (hash === '#join') initialView = 'client';
    else if (hash === '#admin') initialView = isLoggedIn ? 'admin' : 'login';
    else if (isFrontDeskUnlocked) initialView = 'home';

    return {
      members: savedMembers ? JSON.parse(savedMembers) : [],
      attendance: savedAttendance ? JSON.parse(savedAttendance) : [],
      isAddingMember: false,
      searchTerm: '',
      sortOrder: 'newest',
      currentView: initialView,
      isLoggedIn: isLoggedIn,
      tierSettings: savedSettings ? JSON.parse(savedSettings) : DEFAULT_TIER_CONFIG,
      ptSettings: savedPTSettings ? JSON.parse(savedPTSettings) : DEFAULT_PT_CONFIG,
      adminConfig: savedAdmin ? JSON.parse(savedAdmin) : { username: 'admin', password: 'meghfit123', upiId: 'meghfit@upi' }
    };
  });

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [memberToConfirmDelete, setMemberToConfirmDelete] = useState<Member | null>(null);

  const [tempSettings, setTempSettings] = useState<{ 
    upiId: string, 
    prices: TierSettings, 
    ptPrices: PTSettings 
  }>({
    upiId: state.adminConfig.upiId,
    prices: state.tierSettings,
    ptPrices: state.ptSettings
  });

  const syncLock = useRef<Map<string, number>>(new Map());

  const getDeletedBlacklist = (): Map<string, number> => {
    try {
      const stored = localStorage.getItem('titan_gym_deleted_blacklist');
      if (!stored) return new Map();
      const parsed = JSON.parse(stored);
      return new Map(Object.entries(parsed));
    } catch {
      return new Map();
    }
  };

  const saveDeletedBlacklist = (map: Map<string, number>) => {
    localStorage.setItem('titan_gym_deleted_blacklist', JSON.stringify(Object.fromEntries(map)));
  };

  useEffect(() => {
    localStorage.setItem('titan_gym_members', JSON.stringify(state.members));
    localStorage.setItem('titan_gym_attendance', JSON.stringify(state.attendance));
    localStorage.setItem('titan_gym_admin', JSON.stringify(state.adminConfig));
    localStorage.setItem('titan_gym_settings', JSON.stringify(state.tierSettings));
    localStorage.setItem('titan_gym_pt_settings', JSON.stringify(state.ptSettings));
  }, [state.members, state.attendance, state.adminConfig, state.tierSettings, state.ptSettings]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadCloudData = useCallback(async () => {
    if (isSyncing || state.isAddingMember) return;
    setIsSyncing(true);
    try {
      const cloudMembers = await fetchMembersFromSheet();
      const cloudAttendance = await fetchAttendanceLogs();
      
      setState(prev => {
        const now = Date.now();
        const LOCK_DURATION = 20000; 
        const DELETE_BLOCK_DURATION = 86400000; // Block for 24h after deletion to prevent re-sync
        
        const blacklist = getDeletedBlacklist();
        let mergedMembers: Member[] = [];
        
        if (cloudMembers && cloudMembers.length > 0) {
          cloudMembers.forEach(cm => {
            const deleteTime = blacklist.get(cm.id);
            if (deleteTime && (now - deleteTime < DELETE_BLOCK_DURATION)) return;

            const lockTime = syncLock.current.get(cm.id);
            if (lockTime && (now - lockTime < LOCK_DURATION)) {
              const local = prev.members.find(m => m.id === cm.id);
              if (local) mergedMembers.push(local);
              else mergedMembers.push(cm);
            } else {
              mergedMembers.push(cm);
            }
          });
          
          prev.members.forEach(lm => {
            if (!mergedMembers.find(mm => mm.id === lm.id)) {
              const deleteTime = blacklist.get(lm.id);
              if (!deleteTime || (now - deleteTime > DELETE_BLOCK_DURATION)) {
                const lockTime = syncLock.current.get(lm.id);
                if (lockTime && (now - lockTime < LOCK_DURATION)) {
                  mergedMembers.push(lm);
                }
              }
            }
          });
        } else {
          mergedMembers = prev.members.filter(lm => {
            const lockTime = syncLock.current.get(lm.id);
            const deleteTime = blacklist.get(lm.id);
            return lockTime && (now - lockTime < LOCK_DURATION) && !deleteTime;
          });
        }

        let mergedAttendance = [...prev.attendance];
        if (cloudAttendance && cloudAttendance.length > 0) {
          cloudAttendance.forEach(ca => {
            const idx = mergedAttendance.findIndex(a => a.memberId === ca.memberId && a.date === ca.date && a.checkIn === ca.checkIn);
            if (idx >= 0) {
              const localLog = mergedAttendance[idx];
              if (!!ca.checkOut && !localLog.checkOut) mergedAttendance[idx] = ca;
            } else {
              mergedAttendance.push(ca);
            }
          });
        }
        return { ...prev, members: mergedMembers, attendance: mergedAttendance };
      });
    } catch (err: any) {
      console.warn("Sync error:", err.message);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, state.isAddingMember]);

  useEffect(() => {
    loadCloudData();
    const interval = setInterval(loadCloudData, 45000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigate = (view: 'home' | 'admin' | 'client' | 'login' | 'landing') => {
    if (view === 'admin' && !state.isLoggedIn) setState(prev => ({ ...prev, currentView: 'login' }));
    else setState(prev => ({ ...prev, currentView: view }));
  };

  const handleUnlockFrontDesk = () => {
    sessionStorage.setItem('front_desk_unlocked', 'true');
    setState(prev => ({ ...prev, currentView: 'home' }));
  };

  const handleUpdateMember = async (updatedMember: Member) => {
    syncLock.current.set(updatedMember.id, Date.now());
    setState(prev => ({
      ...prev,
      members: prev.members.map(m => m.id === updatedMember.id ? updatedMember : m)
    }));
    
    if (selectedMember && selectedMember.id === updatedMember.id) {
      setSelectedMember(updatedMember);
    }

    try {
      await syncMemberToSheet(updatedMember);
    } catch (err) {
      showToast("Sync pending.", "error");
    }
  };

  const handleApprove = async (member: Member) => {
    const now = new Date();
    const expiryDateObj = new Date(now);
    expiryDateObj.setMonth(now.getMonth() + member.membershipDuration);

    let activatedMember: Member = { 
      ...member, 
      status: MemberStatus.ACTIVE, 
      joinDate: now.toLocaleDateString(), 
      expiryDate: expiryDateObj.toLocaleDateString(),
      expiryTimestamp: expiryDateObj.getTime()
    };

    if (member.hasPersonalTraining && member.ptDuration) {
      const ptExpiryObj = new Date(now);
      ptExpiryObj.setMonth(now.getMonth() + member.ptDuration);
      activatedMember.ptExpiryDate = ptExpiryObj.toLocaleDateString();
      activatedMember.ptExpiryTimestamp = ptExpiryObj.getTime();
    }

    handleUpdateMember(activatedMember);
    showToast(`${activatedMember.name} activated!`);
    
    getFitnessInsights({
      name: member.name, age: member.age, gender: member.gender, goals: member.fitnessGoals, tier: member.tier
    }).then(insights => {
      handleUpdateMember({ ...activatedMember, aiInsights: insights });
    });
  };

  const handleAddMember = async (newMember: Member) => {
    syncLock.current.set(newMember.id, Date.now());
    setState(prev => ({ ...prev, members: [newMember, ...prev.members], isAddingMember: false }));
    setIsSyncing(true);
    try {
      await syncMemberToSheet(newMember);
      showToast(`${newMember.name} added.`);
    } catch (err) {
      showToast(`Locally saved.`, 'error');
    } finally {
      setIsSyncing(false);
    }
    if (state.currentView === 'client') setJustSubmitted(true);
  };

  const updateAttendance = async (log: AttendanceLog) => {
    setState(prev => {
      const idx = prev.attendance.findIndex(a => a.memberId === log.memberId && a.date === log.date && a.checkIn === log.checkIn);
      const newLogs = [...prev.attendance];
      if (idx >= 0) newLogs[idx] = log;
      else newLogs.push(log);
      return { ...prev, attendance: newLogs };
    });
    
    if (log.checkOut) {
      showToast("Logout Successful", "success");
    }

    syncAttendanceToSheet(log).catch(console.error);
  };

  const saveConfiguration = () => {
    setState(prev => ({
      ...prev,
      adminConfig: { ...prev.adminConfig, upiId: tempSettings.upiId },
      tierSettings: tempSettings.prices,
      ptSettings: tempSettings.ptPrices
    }));
    showToast("Settings updated.");
    setShowSettings(false);
  };

  const openSettings = () => {
    setTempSettings({
      upiId: state.adminConfig.upiId,
      prices: JSON.parse(JSON.stringify(state.tierSettings)),
      ptPrices: JSON.parse(JSON.stringify(state.ptSettings))
    });
    setShowSettings(true);
  };

  const confirmDeleteMember = async () => {
    if (!memberToConfirmDelete) return;
    const id = memberToConfirmDelete.id;
    const blacklist = getDeletedBlacklist();
    blacklist.set(id, Date.now());
    saveDeletedBlacklist(blacklist);
    setState(prev => ({ 
      ...prev, 
      members: prev.members.filter(m => m.id !== id) 
    }));
    if (selectedMember?.id === id) setSelectedMember(null);
    setMemberToConfirmDelete(null);
    showToast("Athlete profile and ID removed.", "success");
    try {
      await deleteMemberFromSheet(id);
    } catch (err) {
      console.warn("Cloud cleanup scheduled.");
    }
  };

  const stats = {
    total: state.members.filter(m => String(m.status).toUpperCase() === MemberStatus.ACTIVE.toUpperCase()).length,
    pending: state.members.filter(m => !m.status || String(m.status).toUpperCase() === MemberStatus.PENDING.toUpperCase()).length,
    revenue: state.members.reduce((acc, m) => String(m.status).toUpperCase() === MemberStatus.ACTIVE.toUpperCase() ? acc + (Number(m.amountPaid) || 0) : acc, 0)
  };

  // Rendering logic
  if (state.currentView === 'landing') {
    return <LandingView onUnlock={handleUnlockFrontDesk} />;
  }

  if (state.currentView === 'home') {
    return (
      <HomeView 
        members={state.members} 
        attendance={state.attendance} 
        onUpdateAttendance={updateAttendance} 
        onNavigate={handleNavigate}
        adminConfig={state.adminConfig}
      />
    );
  }

  if (state.currentView === 'login') {
    return <AdminLogin onLogin={() => setState(prev => ({...prev, isLoggedIn: true, currentView: 'admin'}))} adminConfig={state.adminConfig} />;
  }

  if (state.currentView === 'client') {
    return (
      <div className="min-h-screen p-6 bg-slate-950 text-slate-200">
        <div className="max-w-4xl mx-auto pt-8">
           <header className="mb-12 flex items-center justify-between">
             <button onClick={() => handleNavigate('landing')} className="text-amber-500 font-bold text-xs uppercase hover:underline">← Home</button>
             <h1 className="text-2xl font-black text-white tracking-tighter uppercase border-b-2 border-amber-500 pb-1">JOIN THE CLUB</h1>
             <div className="w-10"></div>
           </header>
           {justSubmitted ? (
             <div className="bg-slate-900 border border-emerald-500/30 p-12 rounded-3xl text-center shadow-2xl animate-in zoom-in duration-500">
               <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-900">
                 <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
               </div>
               <h2 className="text-3xl font-black text-white mb-4 uppercase">Applied</h2>
               <p className="text-slate-400 mb-10 max-w-sm mx-auto leading-relaxed">Application sent for approval. Visit front desk to finalize your membership.</p>
               <button onClick={() => { setJustSubmitted(false); handleNavigate('landing'); }} className="text-xs font-black text-amber-500 uppercase tracking-widest hover:underline">Return Home</button>
             </div>
           ) : (
            <MemberForm 
              isSelfRegistration 
              onAdd={handleAddMember} 
              onCancel={() => handleNavigate('landing')} 
              tierSettings={state.tierSettings} 
              ptSettings={state.ptSettings}
              gymUpiId={state.adminConfig.upiId} 
            />
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-slate-950 text-slate-200">
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[110] px-8 py-5 rounded-[2rem] border shadow-2xl animate-in slide-in-from-top duration-300 flex items-center gap-4 ${notification.type === 'success' ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'bg-red-500 border-red-400 text-white'}`}>
           <p className="text-sm font-black uppercase tracking-tight">{notification.message}</p>
        </div>
      )}

      {memberToConfirmDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300 p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300">
             <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0-1-1-2-2-2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2m-6 5v6m4-6v6"/></svg>
             </div>
             <h3 className="text-xl font-black text-white text-center uppercase tracking-tighter mb-2">Delete Athlete?</h3>
             <p className="text-slate-500 text-xs text-center font-bold mb-8 uppercase leading-relaxed">This will permanently remove <span className="text-white font-black">{memberToConfirmDelete.name}</span> and their ID from all records.</p>
             <div className="flex gap-4">
                <button onClick={() => setMemberToConfirmDelete(null)} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest transition hover:bg-slate-700">Cancel</button>
                <button onClick={confirmDeleteMember} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-400 transition shadow-lg shadow-red-500/20">Delete</button>
             </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => handleNavigate('landing')} className="text-slate-500 hover:text-white transition">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </button>
            <h1 className="text-xl font-black tracking-tighter text-white uppercase">ADMIN <span className="text-amber-500 ml-1">PANEL</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={openSettings} className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition">
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button onClick={loadCloudData} disabled={isSyncing} className={`p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition ${isSyncing ? 'animate-spin' : ''}`}>
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 12c0-4.4 3.6-8 8-8 3.3 0 6.2 2 7.4 4.9M22 12c0 4.4-3.6 8-8 8-3.3 0-6.2-2-7.4-4.9"/></svg>
            </button>
            <button onClick={() => setState(prev => ({...prev, isAddingMember: true}))} className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-6 py-2 rounded-full font-black text-xs uppercase shadow-lg shadow-amber-500/20 transition">Register Athlete</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8">
        {!state.isAddingMember && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
              <p className="text-slate-500 text-[9px] font-black uppercase mb-1">Active Members</p>
              <h4 className="text-4xl font-black text-white tracking-tighter">{stats.total}</h4>
            </div>
            <div className="bg-slate-900 border border-amber-500/30 p-6 rounded-3xl">
              <p className="text-amber-500 text-[9px] font-black uppercase mb-1">Pending Approval</p>
              <h4 className="text-4xl font-black text-amber-500 tracking-tighter">{stats.pending}</h4>
            </div>
            <div className="bg-slate-900 border border-emerald-500/30 p-6 rounded-3xl">
              <p className="text-emerald-500 text-[9px] font-black uppercase mb-1">Total Revenue</p>
              <h4 className="text-3xl font-black text-emerald-400 tracking-tighter">₹{stats.revenue.toLocaleString()}</h4>
            </div>
          </div>
        )}

        {state.isAddingMember ? (
          <MemberForm 
            onAdd={handleAddMember} 
            onCancel={() => setState(prev => ({ ...prev, isAddingMember: false }))} 
            tierSettings={state.tierSettings} 
            ptSettings={state.ptSettings}
            gymUpiId={state.adminConfig.upiId} 
          />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
               <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Athlete Database</h2>
               <div className="flex gap-3">
                  <input 
                    type="text" 
                    placeholder="Search name, phone..." 
                    value={state.searchTerm} 
                    onChange={e => setState(prev => ({ ...prev, searchTerm: e.target.value }))} 
                    className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-amber-500 outline-none w-full sm:w-64" 
                  />
               </div>
            </div>
            <MemberList 
              members={state.members} 
              onDelete={(id) => {
                const member = state.members.find(m => m.id === id);
                if (member) setMemberToConfirmDelete(member);
              }} 
              onSelect={(m) => { if (m.status === MemberStatus.ACTIVE) setSelectedMember(m); }} 
              onApprove={handleApprove} 
              searchTerm={state.searchTerm} 
              sortOrder={state.sortOrder} 
              tierSettings={state.tierSettings} 
            />
          </>
        )}
      </main>

      {selectedMember && <MemberProfileView member={selectedMember} attendance={state.attendance} onClose={() => setSelectedMember(null)} onUpdateMember={handleUpdateMember} />}
      
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter text-center">Gym Configuration</h3>
            
            <div className="space-y-10">
               <div className="text-left">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Gym UPI ID (For Payments)</label>
                  <input 
                    type="text"
                    value={tempSettings.upiId}
                    onChange={(e) => setTempSettings(prev => ({ ...prev, upiId: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-amber-500 font-mono text-sm focus:ring-2 focus:ring-amber-500 outline-none transition"
                  />
               </div>

               <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 border-b border-slate-800 pb-2">Membership Fees Matrix (INR)</h4>
                  <div className="space-y-8">
                    {Object.values(MembershipTier).map(tier => (
                      <div key={tier} className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800">
                        <label className="text-xs font-black text-amber-500 uppercase mb-4 block tracking-wider">{tier} TIER</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {[1, 3, 6, 12].map(duration => (
                            <div key={duration}>
                              <p className="text-[9px] text-slate-500 font-bold mb-1 uppercase">{duration} Month{duration > 1 ? 's' : ''}</p>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-bold">₹</span>
                                <input 
                                  type="number"
                                  value={tempSettings.prices[tier][duration]}
                                  onChange={(e) => {
                                    const updated = { ...tempSettings.prices };
                                    updated[tier][duration] = parseInt(e.target.value) || 0;
                                    setTempSettings(prev => ({ ...prev, prices: updated }));
                                  }}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-6 pr-2 py-2 text-white font-mono text-xs focus:ring-1 focus:ring-amber-500 outline-none transition"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
               </div>

               <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 border-b border-slate-800 pb-2">Personal Training Fees (INR)</h4>
                  <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[1, 3, 6, 12].map(duration => (
                        <div key={duration}>
                          <p className="text-[9px] text-slate-500 font-bold mb-1 uppercase">{duration} Month{duration > 1 ? 's' : ''}</p>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-bold">₹</span>
                            <input 
                              type="number"
                              value={tempSettings.ptPrices[duration]}
                              onChange={(e) => {
                                const updated = { ...tempSettings.ptPrices };
                                updated[duration as keyof PTSettings] = parseInt(e.target.value) || 0;
                                setTempSettings(prev => ({ ...prev, ptPrices: updated }));
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-6 pr-2 py-2 text-white font-mono text-xs focus:ring-1 focus:ring-amber-500 outline-none transition"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
               </div>
            </div>

            <div className="flex gap-4 mt-12">
              <button onClick={() => setShowSettings(false)} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest transition hover:bg-slate-700">Cancel</button>
              <button onClick={saveConfiguration} className="flex-[2] py-4 bg-amber-500 text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-amber-400 transition shadow-lg shadow-amber-500/20 active:scale-95">Apply Settings</button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
