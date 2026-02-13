
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Member, AppState, MemberStatus, DEFAULT_MEMBERSHIP_PRICES, DEFAULT_PT_PRICES, AttendanceLog, PricingConfig } from './types';
import MemberForm from './components/MemberForm';
import MemberList from './components/MemberList';
import MemberProfileView from './components/MemberProfileView';
import AdminLogin from './components/AdminLogin';
import HomeView from './components/HomeView';
import LandingView from './components/LandingView';
import SelfServiceView from './components/SelfServiceView';
import AdminSettings from './components/AdminSettings';
import ClientPortal from './components/ClientPortal';
import IdentityRecovery from './components/IdentityRecovery';
import { getFitnessInsights } from './services/geminiService';
import { syncMemberToSheet, fetchMembersFromSheet, syncAttendanceToSheet, fetchAttendanceLogs, fetchConfigFromSheet, syncConfigToSheet, normalizeDateStr, normalizeTimeStr, deleteMemberFromSheet } from './services/googleSheetService';

const App: React.FC = () => {
  const [tombstones, setTombstones] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('meghfit_tombstones');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [state, setState] = useState<AppState>(() => {
    const tryParse = (key: string, fallback: any) => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
      } catch (e) {
        return fallback;
      }
    };

    const savedMembers = tryParse('meghfit_members', []);
    const savedAttendance = tryParse('meghfit_attendance', []);
    const savedMembership = tryParse('meghfit_membership_prices', DEFAULT_MEMBERSHIP_PRICES);
    const savedPT = tryParse('meghfit_pt_prices', DEFAULT_PT_PRICES);
    const savedAdmin = tryParse('meghfit_admin_config', { username: 'admin', password: 'meghfit123', upiId: 'meghfit@upi' });
    
    const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';
    const hash = window.location.hash;
    
    let initialView: 'home' | 'admin' | 'client' | 'login' | 'landing' = 'landing';
    
    if (hash === '#join') initialView = 'client';
    else if (hash === '#admin') initialView = isLoggedIn ? 'admin' : 'login';

    return {
      members: savedMembers,
      attendance: savedAttendance,
      isAddingMember: false,
      searchTerm: '',
      sortOrder: 'newest',
      currentView: initialView,
      isLoggedIn: isLoggedIn,
      membershipPrices: savedMembership,
      ptPrices: savedPT,
      adminConfig: savedAdmin
    };
  });

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  const [clientMode, setClientMode] = useState<'gateway' | 'enroll' | 'link'>('gateway');

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const refreshCloudData = useCallback(async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const [cloudMembers, cloudAttendance, cloudConfig] = await Promise.all([
        fetchMembersFromSheet(),
        fetchAttendanceLogs(),
        fetchConfigFromSheet()
      ]);
      
      const now = Date.now();
      
      setState(prev => {
        const activeCloudMembers = cloudMembers.length > 0 ? cloudMembers.filter(m => {
          const tombstoneTime = tombstones[m.id];
          return !tombstoneTime || (now - tombstoneTime > 600000); 
        }) : prev.members;

        const reconciledAttendanceMap = new Map<string, AttendanceLog>();
        
        cloudAttendance.forEach(log => {
          const dKey = normalizeDateStr(log.date);
          const compositeKey = `${log.memberId}-${dKey}`;
          reconciledAttendanceMap.set(compositeKey, { 
            ...log, 
            date: dKey, 
            checkIn: normalizeTimeStr(log.checkIn), 
            checkOut: normalizeTimeStr(log.checkOut) 
          });
        });

        prev.attendance.forEach(log => {
          const dKey = normalizeDateStr(log.date);
          const compositeKey = `${log.memberId}-${dKey}`;
          const cloudExisting = reconciledAttendanceMap.get(compositeKey);
          
          if (!cloudExisting || (log.checkOut && !cloudExisting.checkOut)) {
            reconciledAttendanceMap.set(compositeKey, { 
              ...log, 
              date: dKey, 
              checkIn: normalizeTimeStr(log.checkIn), 
              checkOut: normalizeTimeStr(log.checkOut) 
            });
          }
        });

        return {
          ...prev,
          members: activeCloudMembers,
          attendance: Array.from(reconciledAttendanceMap.values()),
          adminConfig: cloudConfig?.upiId ? { ...prev.adminConfig, upiId: cloudConfig.upiId } : prev.adminConfig,
          membershipPrices: cloudConfig?.membershipPrices || prev.membershipPrices,
          ptPrices: cloudConfig?.ptPrices || prev.ptPrices
        };
      });
      
    } catch (err) {
      console.error("Critical Sync Failure:", err);
      if (!silent) showToast("Cloud Sync Error - Retrying", "error");
    } finally {
      setIsSyncing(false);
      setInitialLoadDone(true);
    }
  }, [tombstones, showToast]);

  useEffect(() => {
    refreshCloudData();
    const interval = setInterval(() => refreshCloudData(true), 20000); 
    return () => clearInterval(interval);
  }, [refreshCloudData]);

  useEffect(() => {
    localStorage.setItem('meghfit_members', JSON.stringify(state.members));
    localStorage.setItem('meghfit_attendance', JSON.stringify(state.attendance));
    localStorage.setItem('meghfit_tombstones', JSON.stringify(tombstones));
  }, [state.members, state.attendance, tombstones]);

  const executeMemberDeletion = async (id: string) => {
    const targetMember = state.members.find(m => m.id === id);
    const memberName = targetMember ? targetMember.name : "Athlete";

    setConfirmDeleteId(null);

    const now = Date.now();
    const updatedTombstones = { ...tombstones, [id]: now };
    setTombstones(updatedTombstones);
    localStorage.setItem('meghfit_tombstones', JSON.stringify(updatedTombstones));

    setState(prev => ({
      ...prev,
      members: prev.members.filter(m => m.id !== id)
    }));

    showToast(`Deleting ${memberName}...`, "success");

    try {
      await deleteMemberFromSheet(id);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error("Cloud command failed:", err);
      window.location.reload();
    }
  };

  const handleNavigate = (view: 'home' | 'admin' | 'client' | 'login' | 'landing') => {
    setState(prev => {
      let loggedIn = prev.isLoggedIn;
      const isPublicView = (view === 'home' || view === 'client' || view === 'landing');
      if (prev.isLoggedIn && isPublicView && view !== 'home') {
        sessionStorage.removeItem('admin_logged_in');
        loggedIn = false;
      }
      const nextView = (view === 'admin' && !loggedIn) ? 'login' : view;
      return { ...prev, currentView: nextView, isLoggedIn: loggedIn, isAddingMember: false };
    });
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('admin_logged_in');
    setState(prev => ({ ...prev, isLoggedIn: false, currentView: 'landing' }));
  };

  const updateAttendance = async (log: AttendanceLog) => {
    const normalizedLog = { ...log, date: normalizeDateStr(log.date), checkIn: normalizeTimeStr(log.checkIn), checkOut: normalizeTimeStr(log.checkOut) };
    setState(prev => {
      const dKey = normalizeDateStr(normalizedLog.date);
      const compositeKey = `${normalizedLog.memberId}-${dKey}`;
      const existingIdx = prev.attendance.findIndex(a => `${a.memberId}-${normalizeDateStr(a.date)}` === compositeKey);
      const newList = [...prev.attendance];
      if (existingIdx >= 0) newList[existingIdx] = normalizedLog;
      else newList.push(normalizedLog);
      return { ...prev, attendance: newList };
    });
    if (normalizedLog.checkOut) showToast("Session Finalized", "success");
    else showToast("Check-In Logged", "success");
    await syncAttendanceToSheet(normalizedLog);
    refreshCloudData(true);
  };

  const handleUpdateMember = useCallback(async (updatedMember: Member) => {
    setState(prev => ({
      ...prev,
      members: prev.members.map(m => m.id === updatedMember.id ? updatedMember : m)
    }));
    if (selectedMember && selectedMember.id === updatedMember.id) setSelectedMember(updatedMember);
    await syncMemberToSheet(updatedMember);
  }, [selectedMember]);

  const handleUpdateConfig = useCallback(async (upiId: string, membershipPrices: PricingConfig, ptPrices: PricingConfig) => {
    setState(prev => ({ ...prev, adminConfig: { ...prev.adminConfig, upiId }, membershipPrices, ptPrices }));
    const success = await syncConfigToSheet({ upiId, membershipPrices, ptPrices });
    if (success) showToast("Settings Synchronized", "success");
    else showToast("Cloud Sync Failed", "error");
  }, [showToast]);

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
    handleUpdateMember(activatedMember);
    showToast(`Approved: ${activatedMember.name}`);
    getFitnessInsights(activatedMember).then(insights => handleUpdateMember({ ...activatedMember, aiInsights: insights }));
  };

  const handleAddMember = async (newMember: Member) => {
    setState(prev => ({ ...prev, members: [newMember, ...prev.members], isAddingMember: false }));
    await syncMemberToSheet(newMember);
    showToast("Application Sent");
    if (state.currentView === 'client') setJustSubmitted(true);
    refreshCloudData(true);
  };

  if (!initialLoadDone) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-10 text-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-8 mx-auto"></div>
        <h2 className="text-white font-black uppercase tracking-widest text-[10px] italic">Securing Registry...</h2>
      </div>
    );
  }

  const athleteToDelete = confirmDeleteId ? state.members.find(m => m.id === confirmDeleteId) : null;

  if (state.currentView === 'landing') return <LandingView onUnlock={() => setState(prev => ({ ...prev, currentView: 'home' }))} />;
  if (state.currentView === 'home') return <HomeView members={state.members} attendance={state.attendance} onUpdateAttendance={updateAttendance} onNavigate={handleNavigate} adminConfig={state.adminConfig} />;
  if (state.currentView === 'login') return <AdminLogin onLogin={() => { sessionStorage.setItem('admin_logged_in', 'true'); setState(prev => ({...prev, isLoggedIn: true, currentView: 'admin'})); }} adminConfig={state.adminConfig} />;
  
  if (state.currentView === 'client') {
    const registeredId = localStorage.getItem('meghfit_registered_id');
    const identifiedMember = registeredId ? state.members.find(m => m.id === registeredId) : null;
    if (identifiedMember && identifiedMember.status === MemberStatus.ACTIVE) return <SelfServiceView member={identifiedMember} attendance={state.attendance} onUpdateAttendance={updateAttendance} onLogoutIdentity={() => { localStorage.removeItem('meghfit_registered_id'); window.location.reload(); }} isSyncing={isSyncing} />;
    if (identifiedMember && identifiedMember.status === MemberStatus.PENDING) return (
      <div className="min-h-screen p-6 flex items-center justify-center bg-slate-950 text-slate-200">
         <div className="bg-slate-900 border border-amber-500/30 p-10 rounded-[2.5rem] text-center shadow-2xl max-w-sm">
             <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
             <h2 className="text-xl font-black text-white mb-4 uppercase tracking-tighter italic">Approval Pending</h2>
             <p className="text-slate-500 mb-8 text-[10px] font-bold uppercase tracking-widest leading-relaxed">Identity Linked: {identifiedMember.id}. Please see the desk for activation.</p>
             <button onClick={() => { localStorage.removeItem('meghfit_registered_id'); window.location.reload(); }} className="text-[9px] font-black text-amber-500 uppercase tracking-widest underline underline-offset-4">Reset Linked Identity</button>
         </div>
      </div>
    );
    if (clientMode === 'gateway') return <ClientPortal onSelectEnroll={() => setClientMode('enroll')} onSelectLink={() => setClientMode('link')} />;
    if (clientMode === 'link') return <IdentityRecovery members={state.members} onLink={(id) => { localStorage.setItem('meghfit_registered_id', id); window.location.reload(); }} onCancel={() => setClientMode('gateway')} />;
    return (
      <div className="min-h-screen p-4 md:p-8 bg-slate-950 text-slate-200">
        <div className="max-w-4xl mx-auto">
           <header className="mb-8 flex items-center justify-between"><button onClick={() => setClientMode('gateway')} className="text-amber-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">← Gateway</button><h1 className="text-xl font-black text-white tracking-tighter uppercase italic">Athlete Admission</h1><div className="w-10"></div></header>
           {justSubmitted ? (
             <div className="bg-slate-900 border border-emerald-500/30 p-12 rounded-[2.5rem] text-center shadow-2xl">
               <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-900"><svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
               <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter italic">Application Sent</h2>
               <p className="text-slate-500 mb-8 max-w-sm mx-auto text-[10px] font-bold uppercase tracking-widest leading-relaxed">Your profile is currently on the waitlist. Our team will verify and activation your pass shortly.</p>
               <button onClick={() => window.location.reload()} className="bg-amber-500 text-slate-950 px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-2xl">Return to Terminal</button>
             </div>
           ) : <MemberForm isSelfRegistration onAdd={handleAddMember} onCancel={() => setClientMode('gateway')} membershipPrices={state.membershipPrices} ptPrices={state.ptPrices} gymUpiId={state.adminConfig.upiId} onSwitchToLink={() => setClientMode('link')} />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-slate-950 text-slate-200">
      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmDeleteId && athleteToDelete && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="w-full max-w-sm bg-slate-900 border-2 border-red-500/50 rounded-[3rem] p-10 text-center shadow-[0_0_100px_rgba(239,68,68,0.2)]">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 text-red-500">
                 <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-4">Confirm Deletion</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed mb-10">
                 Are you sure you want to delete <span className="text-white underline decoration-red-500 underline-offset-4">{athleteToDelete.name}</span>? This action is permanent.
              </p>
              <div className="flex flex-col gap-3">
                 <button 
                   onClick={() => executeMemberDeletion(confirmDeleteId)}
                   className="w-full py-5 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-2xl active:scale-95 transition-all"
                 >
                   Yes, Delete Athlete
                 </button>
                 <button 
                   onClick={() => setConfirmDeleteId(null)}
                   className="w-full py-5 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:text-white transition-all"
                 >
                   Cancel
                 </button>
              </div>
           </div>
        </div>
      )}

      {notification && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-full border shadow-2xl animate-in slide-in-from-top duration-500 flex items-center gap-3 ${notification.type === 'success' ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'bg-red-500 border-red-400 text-white'}`}>
           <p className="text-[10px] font-black uppercase tracking-tight italic">{notification.message}</p>
        </div>
      )}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-2xl border-b border-slate-800 px-4 py-3 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3"><button onClick={() => handleNavigate('landing')} className="text-slate-500 hover:text-white transition"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="9 22 9 12 15 12 15 22"/></svg></button><h1 className="text-lg md:text-xl font-black tracking-tighter text-white uppercase italic">Registry Portal</h1></div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowSettings(true)} className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1Enc1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></button>
          <button onClick={() => refreshCloudData()} className={`p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition ${isSyncing ? 'animate-spin' : ''}`}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg></button>
          <button onClick={handleAdminLogout} className="bg-red-500 text-white px-4 py-2.5 rounded-xl font-black text-[9px] uppercase shadow-lg shadow-red-500/20 active:scale-95 transition-all">Logout</button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6">
        {!state.isAddingMember ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
               <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl"><p className="text-slate-500 text-[8px] font-black uppercase mb-1">Active</p><h4 className="text-3xl font-black text-white">{state.members.filter(m => (m.status || '').toUpperCase() === MemberStatus.ACTIVE.toUpperCase()).length}</h4></div>
               <div className="bg-slate-900 border border-amber-500/30 p-6 rounded-3xl"><p className="text-amber-500 text-[8px] font-black uppercase mb-1">Waitlist</p><h4 className="text-3xl font-black text-amber-500">{state.members.filter(m => (m.status || '').toUpperCase() === MemberStatus.PENDING.toUpperCase()).length}</h4></div>
               <div className="col-span-2 bg-slate-900 border border-emerald-500/30 p-6 rounded-3xl"><p className="text-emerald-500 text-[8px] font-black uppercase mb-1">Total Revenue</p><h4 className="text-3xl font-black text-emerald-400">₹{state.members.reduce((acc, m) => acc + (Number(m.amountPaid) || 0), 0).toLocaleString()}</h4></div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
               <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Athlete Registry</h2>
               <div className="flex gap-3 w-full md:w-auto">
                 <input type="text" placeholder="Search registry..." value={state.searchTerm} onChange={e => setState(prev => ({ ...prev, searchTerm: e.target.value }))} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs w-full md:w-64 outline-none focus:ring-1 focus:ring-amber-500 shadow-inner" />
                 <button onClick={() => setState(prev => ({...prev, isAddingMember: true}))} className="shrink-0 bg-amber-500 text-slate-950 px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all">Enroll New</button>
               </div>
            </div>
            <MemberList members={state.members} onDelete={(id) => setConfirmDeleteId(id)} onSelect={(m) => setSelectedMember(m)} onApprove={handleApprove} searchTerm={state.searchTerm} sortOrder={state.sortOrder} />
          </>
        ) : <MemberForm onAdd={handleAddMember} onCancel={() => setState(prev => ({ ...prev, isAddingMember: false }))} membershipPrices={state.membershipPrices} ptPrices={state.ptPrices} gymUpiId={state.adminConfig.upiId} />}
      </main>
      {selectedMember && <MemberProfileView member={selectedMember} attendance={state.attendance} onClose={() => setSelectedMember(null)} onUpdateMember={handleUpdateMember} />}
      {showSettings && <AdminSettings membershipPrices={state.membershipPrices} ptPrices={state.ptPrices} adminConfig={state.adminConfig} onSave={handleUpdateConfig} onClose={() => setShowSettings(false)} />}
    </div>
  );
};

export default App;
