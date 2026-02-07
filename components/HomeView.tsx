
import React, { useState, useEffect, useMemo } from 'react';
import { Member, AttendanceLog, MemberStatus, AdminConfig } from '../types';

interface HomeViewProps {
  members: Member[];
  attendance: AttendanceLog[];
  onUpdateAttendance: (log: AttendanceLog) => void;
  onNavigate: (view: 'home' | 'admin' | 'client' | 'login') => void;
  adminConfig: AdminConfig; 
}

const formatDisplayTime = (time24: string) => {
  if (!time24) return '';
  const [h24, m] = time24.split(':');
  let hNum = parseInt(h24);
  const p = hNum >= 12 ? 'PM' : 'AM';
  const h12 = (hNum % 12 || 12).toString().padStart(2, '0');
  return `${h12}:${m} ${p}`;
};

const getIsoDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const HomeView: React.FC<HomeViewProps> = ({ members, attendance, onUpdateAttendance, onNavigate, adminConfig }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [showOverrideModal, setShowOverrideModal] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [overridePassword, setOverridePassword] = useState('');
  const [overrideError, setOverrideError] = useState(false);
  
  const today = useMemo(() => getIsoDateString(new Date()), []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeMembers = members.filter(m => 
    (m.status === MemberStatus.ACTIVE || m.status === MemberStatus.PENDING) && 
    (m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.phone.includes(searchTerm))
  );

  const getLatestTodayLog = (memberId: string) => {
    const todayLogs = attendance.filter(a => a.memberId === memberId && a.date === today);
    if (todayLogs.length === 0) return null;
    const openSession = todayLogs.find(a => !a.checkOut);
    if (openSession) return openSession;
    return todayLogs[todayLogs.length - 1];
  };

  const handleAction = (memberId: string, type: 'in' | 'out', isOverride = false) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const isExpired = Number(member.expiryTimestamp) < Date.now();
    if (isExpired && !isOverride) {
       alert("MEMBERSHIP EXPIRED. Admin approval required for access.");
       setShowOverrideModal(memberId);
       return;
    }

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const latestLog = getLatestTodayLog(memberId);

    if (type === 'in') {
      // If they already logged out today, they need admin approval to log in again
      if (latestLog && latestLog.checkIn && latestLog.checkOut && !isOverride) {
        setShowOverrideModal(memberId);
        return;
      }
      onUpdateAttendance({ memberId, checkIn: timeStr, checkOut: '', date: today });
      setShowOverrideModal(null);
      setOverridePassword('');
      setOverrideError(false);
    } else if (type === 'out') {
      if (latestLog && latestLog.checkIn && !latestLog.checkOut) {
        onUpdateAttendance({ ...latestLog, checkOut: timeStr });
      }
    }
  };

  const handleOverrideSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (overridePassword === adminConfig.password) {
      if (showOverrideModal) handleAction(showOverrideModal, 'in', true);
    } else {
      setOverrideError(true);
      setTimeout(() => setOverrideError(false), 2000);
    }
  };

  const liveNowCount = useMemo(() => {
    return attendance.filter(a => a.date === today && a.checkIn && !a.checkOut).length;
  }, [attendance, today]);

  const totalVisitsToday = useMemo(() => {
    return attendance.filter(a => a.date === today).length;
  }, [attendance, today]);

  const joinQrUrl = useMemo(() => {
    const baseUrl = window.location.origin + window.location.pathname;
    const fullUrl = `${baseUrl}?mode=client`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fullUrl)}&color=0f172a&bgcolor=ffffff`;
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans">
      <header className="p-4 md:p-8 flex flex-col md:flex-row md:items-center justify-between bg-slate-900 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase leading-none">
            MEGH FIT <span className="text-amber-500">GYM CLUB</span>
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[8px] md:text-[10px] mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Front Desk Console
          </p>
        </div>
        <div className="flex items-center gap-6 self-end md:self-auto">
          <button 
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-2xl transition-all group"
          >
            <div className="text-right hidden sm:block">
              <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest">New Admission</p>
              <p className="text-[7px] text-slate-400 font-bold uppercase">Scan to Join</p>
            </div>
            <div className="p-1.5 bg-white rounded-lg group-hover:scale-105 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </div>
          </button>

          <div className="text-right">
            <p className="text-2xl md:text-4xl font-mono font-black text-white leading-none">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-slate-500 font-bold text-[10px] md:text-xs uppercase mt-1 md:mt-2">
              {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-2xl">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-8 text-center lg:text-left">Access Points</h3>
            <div className="space-y-4">
               <button onClick={() => onNavigate('client')} className="w-full py-5 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-3xl font-black uppercase tracking-widest transition-all shadow-xl shadow-amber-500/10 active:scale-95">Enrollment</button>
               <button onClick={() => onNavigate('admin')} className="w-full py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-3xl font-black uppercase tracking-widest transition-all border border-slate-700 active:scale-95">Management</button>
            </div>
            
            <div className="mt-8 space-y-3">
               <div className="p-6 bg-slate-950 rounded-3xl border border-slate-800 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live Now</span>
                    <span className="text-[7px] font-bold text-emerald-500 uppercase">On Floor</span>
                  </div>
                  <span className="text-2xl font-black text-emerald-500">{liveNowCount}</span>
               </div>
               <div className="p-6 bg-slate-950 rounded-3xl border border-slate-800 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Visits</span>
                    <span className="text-[7px] font-bold text-amber-500 uppercase">Today</span>
                  </div>
                  <span className="text-2xl font-black text-amber-500">{totalVisitsToday}</span>
               </div>
            </div>
          </div>
        </aside>

        <section className="lg:col-span-3">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col h-full">
            <div className="p-6 md:p-8 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
               <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Daily Attendance</h2>
               <div className="relative w-full sm:w-64">
                 <input type="text" placeholder="Search athlete..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs outline-none w-full focus:ring-1 focus:ring-amber-500 transition-all" />
               </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Athlete & Status</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Login Session</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Logout Session</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Account Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {activeMembers.map(member => {
                    const log = getLatestTodayLog(member.id);
                    const hasEntry = !!(log && log.checkIn);
                    const isSessionOpen = hasEntry && !log.checkOut;
                    const sessionFinished = hasEntry && !!log.checkOut;
                    
                    const totalPayable = parseFloat(String(member.totalPayable || 0));
                    const totalPaid = parseFloat(String(member.amountPaid || 0));
                    const balance = Math.round((totalPayable - totalPaid) * 100) / 100;
                    const hasBalance = balance > 0;
                    
                    const isExpired = Number(member.expiryTimestamp) < Date.now();
                    const promiseDate = member.paymentDueDate ? new Date(member.paymentDueDate) : null;
                    const isPastDue = promiseDate && promiseDate < new Date() && hasBalance;

                    return (
                      <tr key={member.id} className={`hover:bg-slate-800/30 transition-colors ${isSessionOpen ? 'bg-emerald-500/[0.03]' : sessionFinished ? 'bg-slate-800/20' : ''}`}>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                               <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-white font-black uppercase text-lg transition-all ${isExpired ? 'bg-red-900/40 border-red-500/50 text-red-500' : isSessionOpen ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20' : 'bg-slate-800 border-slate-700'}`}>
                                 {member.name.charAt(0)}
                               </div>
                               {isSessionOpen && (
                                 <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-slate-900 rounded-full animate-pulse shadow-sm"></span>
                               )}
                            </div>
                            <div>
                              <p className="text-sm font-black uppercase text-white truncate max-w-[150px] tracking-tight">{member.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {isSessionOpen ? (
                                  <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded text-[7px] font-black uppercase tracking-widest">Logged In</span>
                                ) : sessionFinished ? (
                                  <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded text-[7px] font-black uppercase tracking-widest">Finished</span>
                                ) : (
                                  <span className="px-1.5 py-0.5 bg-slate-950 text-slate-600 border border-slate-800 rounded text-[7px] font-bold uppercase tracking-widest">Not Logged In</span>
                                )}
                                {isExpired && <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded text-[7px] font-black uppercase tracking-widest">Expired</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          {hasEntry ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="text-[7px] text-slate-500 font-black uppercase tracking-widest mb-1.5">Check-in at</span>
                              <div className="flex items-center gap-2 text-emerald-400 font-mono font-black text-xs bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 shadow-inner">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>
                                  {formatDisplayTime(log.checkIn)}
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleAction(member.id, 'in')} 
                              className="group relative px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-amber-500/10 active:scale-95 transition-all overflow-hidden"
                            >
                              <span className="relative z-10 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                                Login Athlete
                              </span>
                            </button>
                          )}
                        </td>
                        <td className="px-8 py-6 text-center">
                          {isSessionOpen ? (
                            <button 
                              onClick={() => handleAction(member.id, 'out')} 
                              className="px-6 py-3 bg-white text-slate-900 border border-slate-200 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-100 active:scale-95 transition-all shadow-md flex items-center gap-2 mx-auto"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                              Logout Session
                            </button>
                          ) : sessionFinished ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="text-[7px] text-slate-500 font-black uppercase tracking-widest mb-1.5">Check-out at</span>
                              <div className="flex items-center justify-center gap-2 text-slate-400 font-mono font-black text-xs bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700/50">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>
                                  {formatDisplayTime(log.checkOut)}
                              </div>
                              <button 
                                onClick={() => handleAction(member.id, 'in')}
                                className="mt-2 text-[8px] font-black text-amber-500 uppercase hover:underline flex items-center gap-1"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                                Re-login
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center opacity-20">
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1 text-slate-500"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">No entry recorded</span>
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-6 text-right">
                           {hasBalance ? (
                              <div className="flex flex-col items-end">
                                <span className={`px-3 py-1.5 border rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm ${isPastDue ? 'bg-red-600 border-red-500 text-white animate-pulse shadow-red-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}`}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                  {isPastDue ? 'PAST DUE: ' : 'BALANCE: '} ₹{balance}
                                </span>
                                {member.paymentDueDate && <p className={`text-[7px] font-bold uppercase mt-1.5 tracking-tighter ${isPastDue ? 'text-red-400' : 'text-slate-500'}`}>Promise: {member.paymentDueDate}</p>}
                              </div>
                           ) : (
                              <div className="flex items-center justify-end gap-1.5 text-emerald-500 bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-4 py-1.5 w-fit ml-auto shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                <span className="text-[8px] font-black uppercase tracking-widest">Clear Account</span>
                              </div>
                           )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* Admission QR Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setShowJoinModal(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 text-center relative" onClick={e => e.stopPropagation()}>
             <button onClick={() => setShowJoinModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             </button>
             
             <div className="mb-8">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Join Megh Fit</h3>
                <p className="text-amber-500 text-[9px] font-black uppercase tracking-[0.3em] mt-2">New Athlete Enrollment</p>
             </div>

             <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl mb-8 group transition-transform hover:scale-105 duration-500">
                <img src={joinQrUrl} alt="Join QR" className="w-full h-full aspect-square" />
             </div>

             <div className="space-y-4">
                <p className="text-slate-400 text-xs font-bold leading-relaxed">Scan this code with your phone camera to open the admission form instantly.</p>
                <div className="pt-4 flex flex-col items-center gap-4">
                  <div className="px-4 py-2 bg-slate-800 rounded-full border border-slate-700 flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Live Registration Link</span>
                  </div>
                  
                  <button 
                    onClick={() => setShowJoinModal(false)}
                    className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg active:scale-95 border border-slate-700"
                  >
                    Back to Dashboard
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Admin Approval / Security Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 text-center">
             <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-500/5">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
             </div>
             <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Admin Approval Required</h3>
             <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-8">Unauthorized Re-login Attempt or Expired Membership</p>
             
             <form onSubmit={handleOverrideSubmit} className="space-y-6">
                <div className="relative">
                  <input 
                    autoFocus
                    type="password"
                    placeholder="Enter Admin Pin"
                    value={overridePassword}
                    onChange={(e) => setOverridePassword(e.target.value)}
                    className={`w-full bg-slate-950 border ${overrideError ? 'border-red-500' : 'border-slate-800'} rounded-2xl px-6 py-5 text-center text-amber-500 font-mono tracking-[0.5em] outline-none transition-all placeholder:text-[10px] placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-700`}
                  />
                  {overrideError && (
                    <p className="absolute -bottom-6 left-0 right-0 text-red-500 text-[8px] font-black uppercase tracking-widest">Invalid Credentials</p>
                  )}
                </div>
                
                <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setShowOverrideModal(null)} className="flex-1 py-4 bg-slate-800 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:text-white transition">Cancel</button>
                   <button type="submit" className="flex-[2] py-4 bg-amber-500 text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-amber-400 transition shadow-lg shadow-amber-500/20">Approve Access</button>
                </div>
             </form>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};

export default HomeView;
