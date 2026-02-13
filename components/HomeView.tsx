
import React, { useState, useEffect, useMemo } from 'react';
import { Member, AttendanceLog, MemberStatus, AdminConfig } from '../types';
import { normalizeDateStr, normalizeTimeStr, getISTNow, formatISTTime, formatISTDate } from '../services/googleSheetService';

interface HomeViewProps {
  members: Member[];
  attendance: AttendanceLog[];
  onUpdateAttendance: (log: AttendanceLog) => void;
  onNavigate: (view: 'home' | 'admin' | 'client' | 'login' | 'landing') => void;
  adminConfig: AdminConfig; 
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

const HomeView: React.FC<HomeViewProps> = ({ members, attendance, onUpdateAttendance, onNavigate, adminConfig }) => {
  const [currentTime, setCurrentTime] = useState(getISTNow());
  const [searchTerm, setSearchTerm] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState<string | null>(null);
  const [overridePassword, setOverridePassword] = useState('');
  const [overrideError, setOverrideError] = useState(false);
  
  // Strict IST Date for local filtering
  const todayIso = useMemo(() => formatISTDate(currentTime), [currentTime.getDate()]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getISTNow()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeMembers = members.filter(m => 
    (m.status === MemberStatus.ACTIVE || m.status === MemberStatus.PENDING) && 
    (m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.phone.includes(searchTerm))
  );

  const getLatestTodayLog = (memberId: string) => {
    const todayLogs = attendance.filter(a => 
      a.memberId === memberId && normalizeDateStr(a.date) === todayIso
    );
    if (todayLogs.length === 0) return null;
    return todayLogs.sort((a, b) => b.checkIn.localeCompare(a.checkIn))[0];
  };

  const handleAction = (memberId: string, type: 'in' | 'out', isOverride = false) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    if (member.status !== MemberStatus.ACTIVE && type === 'in') {
      alert("Athlete Enrollment Pending Desk Approval.");
      return;
    }

    const timeStr = formatISTTime();
    const latestLog = getLatestTodayLog(memberId);

    if (type === 'in') {
      if (latestLog && latestLog.checkOut && !isOverride) {
        setShowOverrideModal(memberId);
        return;
      }
      onUpdateAttendance({ memberId, checkIn: timeStr, checkOut: '', date: todayIso });
      setShowOverrideModal(null);
      setOverridePassword('');
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
      setOverrideError(false);
    } else {
      setOverrideError(true);
      setTimeout(() => setOverrideError(false), 2000);
    }
  };

  const liveNowCount = useMemo(() => 
    attendance.filter(a => normalizeDateStr(a.date) === todayIso && a.checkIn && !a.checkOut).length
  , [attendance, todayIso]);

  const totalVisitsToday = useMemo(() => 
    attendance.filter(a => normalizeDateStr(a.date) === todayIso).length
  , [attendance, todayIso]);

  // Robust Enrollment QR URL Generation
  const joinQrUrl = useMemo(() => {
    const baseUrl = window.location.href.split('#')[0].split('?')[0];
    const enrollLink = `${baseUrl}#join`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(enrollLink)}&color=0f172a&bgcolor=ffffff&qzone=2`;
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans overflow-x-hidden">
      <header className="p-4 md:p-6 sticky top-0 z-[40] bg-slate-900/95 backdrop-blur-2xl border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex justify-between items-center w-full md:w-auto">
          <div>
            <h1 className="text-xl md:text-3xl font-black text-white tracking-tighter uppercase italic leading-none">
              Megh Fit <span className="text-amber-500">Hub</span>
            </h1>
            <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1.5 flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
               IST SYNC ACTIVE • CLOUD MONITOR
            </p>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <p className="text-sm font-mono font-black text-white bg-slate-800 px-3 py-2 rounded-xl border border-slate-700">
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button onClick={() => setShowJoinModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2.5 bg-amber-500/10 border border-amber-500/20 px-4 py-3 rounded-xl transition-all hover:bg-amber-500/20 active:scale-95">
            <span className="text-[9px] font-black uppercase text-amber-500 tracking-widest">Athlete Gateway</span>
            <div className="p-1 bg-white rounded-md shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="3"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </div>
          </button>
          <div className="hidden md:flex flex-col items-end">
            <p className="text-2xl font-mono font-black text-white leading-none tabular-nums">
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">
              {currentTime.toLocaleDateString('en-IN', { weekday: 'short', month: 'long', day: 'numeric' })} IST
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-80 space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2.5rem] shadow-xl">
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 mb-6">
               <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col relative overflow-hidden group">
                  <span className="text-[7px] font-black text-slate-600 uppercase mb-1">In Gym Now</span>
                  <span className="text-2xl font-black text-emerald-500 tabular-nums relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500" key={liveNowCount}>{liveNowCount}</span>
                  {liveNowCount > 0 && <div className="absolute inset-0 bg-emerald-500/10 animate-pulse"></div>}
               </div>
               <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col relative overflow-hidden">
                  <span className="text-[7px] font-black text-slate-600 uppercase mb-1">Today's Visits</span>
                  <span className="text-2xl font-black text-amber-500 tabular-nums animate-in fade-in slide-in-from-bottom-4 duration-500" key={totalVisitsToday}>{totalVisitsToday}</span>
               </div>
            </div>
            <div className="space-y-2">
               <button onClick={() => onNavigate('client')} className="w-full py-4 bg-amber-500 text-slate-950 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-amber-500/10 transition-all hover:bg-amber-400 active:scale-95">Enroll Athlete</button>
               <button onClick={() => onNavigate('admin')} className="w-full py-4 bg-slate-800 text-white rounded-xl font-black uppercase tracking-widest text-[10px] border border-slate-700 transition-all hover:bg-slate-700">Registry Console</button>
            </div>
          </div>
        </aside>

        <section className="flex-1">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col min-h-[500px]">
            <div className="p-5 md:p-8 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/50">
               <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tighter italic">Athlete Monitor</h2>
               <div className="relative w-full sm:w-72">
                 <input type="text" placeholder="Search registry..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-5 py-3.5 text-xs text-white outline-none w-full focus:ring-1 focus:ring-amber-500 transition-all shadow-inner" />
               </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                {activeMembers.map(member => {
                  const log = getLatestTodayLog(member.id);
                  const isSessionOpen = !!(log && log.checkIn && !log.checkOut);
                  const sessionFinished = !!(log && log.checkIn && log.checkOut);
                  const isExpired = Number(member.expiryTimestamp) < Date.now();
                  const isPending = member.status === MemberStatus.PENDING;

                  return (
                    <div key={member.id} className={`p-4 md:p-6 rounded-[2rem] border transition-all duration-500 ${isSessionOpen ? 'bg-emerald-500/[0.04] border-emerald-500/40 shadow-xl scale-[1.02]' : 'bg-slate-950/50 border-slate-800'}`}>
                       <div className="flex justify-between items-start mb-5">
                         <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg border-2 transition-all ${isExpired ? 'bg-red-500/10 border-red-500/30 text-red-500' : isSessionOpen ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-lg' : 'bg-slate-800 border-slate-700 text-white'}`}>{member.name.charAt(0)}</div>
                            <div className="min-w-0">
                               <p className="text-[13px] font-black text-white uppercase tracking-tight truncate max-w-[120px]">{member.name}</p>
                               <div className="flex items-center gap-1.5 mt-0.5">
                                 <div className={`w-1.5 h-1.5 rounded-full ${isSessionOpen ? 'bg-emerald-500 animate-ping' : isPending ? 'bg-amber-500' : sessionFinished ? 'bg-slate-500' : 'bg-slate-800'}`}></div>
                                 <span className="text-[7px] text-slate-500 font-black uppercase tracking-widest truncate">
                                    {isPending ? 'Pending Approval' : isSessionOpen ? 'In Training' : sessionFinished ? 'Finished' : 'Ready'}
                                 </span>
                               </div>
                            </div>
                         </div>
                       </div>

                       <div className="space-y-3">
                          {log && (
                            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex justify-between items-center animate-in fade-in slide-in-from-bottom-2">
                               <div className="text-center">
                                 <p className="text-[6px] text-slate-500 uppercase font-black mb-0.5">In</p>
                                 <p className="text-[10px] text-white font-mono font-black">{displayTime(log.checkIn)}</p>
                               </div>
                               <div className="w-px h-6 bg-slate-800"></div>
                               <div className="text-center">
                                 <p className="text-[6px] text-amber-500 uppercase font-black mb-0.5">Out</p>
                                 <p className={`text-[10px] font-mono font-black ${log.checkOut ? 'text-amber-500' : 'text-slate-700'}`}>
                                    {log.checkOut ? displayTime(log.checkOut) : '--:--'}
                                 </p>
                               </div>
                            </div>
                          )}

                          {!isSessionOpen ? (
                            <button 
                              disabled={isPending}
                              onClick={() => handleAction(member.id, 'in')} 
                              className={`w-full py-4.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 ${
                                isPending 
                                  ? 'bg-slate-800 text-amber-500/10 border border-amber-500/5 cursor-not-allowed' 
                                  : isExpired 
                                    ? 'bg-red-600 text-white shadow-red-500/20' 
                                    : sessionFinished 
                                      ? 'bg-slate-800 text-slate-400' 
                                      : 'bg-amber-500 text-slate-950 shadow-amber-500/10'
                              }`}
                            >
                              {isPending ? 'Registry Hold' : sessionFinished ? 'Session Done' : 'Manual Login'}
                            </button>
                          ) : (
                            <button onClick={() => handleAction(member.id, 'out')} className="w-full py-4.5 bg-white text-slate-950 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                               Force Logout
                            </button>
                          )}
                       </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-slate-950/98 backdrop-blur-xl">
          <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 max-w-sm w-full shadow-2xl text-center">
             <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
             </div>
             <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-4 italic">Session Override</h3>
             <p className="text-slate-500 text-[10px] font-bold leading-relaxed mb-8 uppercase tracking-widest">Athlete already trained today. Re-authorize entry?</p>
             <form onSubmit={handleOverrideSubmit} className="space-y-4">
                <input type="password" autoFocus placeholder="Admin Key" value={overridePassword} onChange={(e) => setOverridePassword(e.target.value)} className={`w-full bg-slate-950 border ${overrideError ? 'border-red-500' : 'border-slate-800'} rounded-2xl px-6 py-5 text-center text-white focus:ring-1 focus:ring-amber-500 outline-none font-mono`} />
                <div className="flex gap-4">
                   <button type="button" onClick={() => setShowOverrideModal(null)} className="flex-1 py-5 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-[10px]">Back</button>
                   <button type="submit" className="flex-[2] py-5 bg-amber-500 text-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-widest">Allow Access</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Enrollment Gateway Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-2xl" onClick={() => setShowJoinModal(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-8 max-w-xs w-full shadow-2xl text-center relative animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
             <button onClick={() => setShowJoinModal(false)} className="absolute top-6 right-6 text-slate-600 hover:text-white transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             </button>
             <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-8 italic">Enrollment Gateway</h3>
             <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl mb-8 flex items-center justify-center">
               <img 
                 src={joinQrUrl} 
                 alt="Scan for Admission" 
                 className="w-full aspect-square object-contain"
               />
             </div>
             <p className="text-slate-500 text-[9px] font-black mb-4 uppercase tracking-[0.2em] leading-relaxed italic">Direct athletes to scan this for new admission or check-in.</p>
             <div className="h-px bg-slate-800 w-full mb-6"></div>
             <p className="text-amber-500 text-[10px] font-black uppercase tracking-widest">IST Terminal Active</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeView;
