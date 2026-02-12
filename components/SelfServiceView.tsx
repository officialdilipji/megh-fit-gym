
import React, { useState, useEffect, useMemo } from 'react';
import { Member, AttendanceLog, MemberStatus } from '../types';
import { normalizeDateStr } from '../services/googleSheetService';

interface SelfServiceViewProps {
  member: Member;
  attendance: AttendanceLog[];
  onUpdateAttendance: (log: AttendanceLog) => void;
  onLogoutIdentity: () => void;
  isSyncing?: boolean;
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

const SelfServiceView: React.FC<SelfServiceViewProps> = ({ member, attendance, onUpdateAttendance, onLogoutIdentity, isSyncing }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isProcessing, setIsProcessing] = useState(false);
  
  const todayIso = useMemo(() => normalizeDateStr(getIsoDateString(currentTime)), [currentTime.getDate()]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const latestLog = useMemo(() => {
    const todayLogs = attendance.filter(a => 
      a.memberId === member.id && 
      normalizeDateStr(a.date) === todayIso
    );
    
    if (todayLogs.length === 0) return null;
    return todayLogs.sort((a, b) => b.checkIn.localeCompare(a.checkIn))[0];
  }, [attendance, member.id, todayIso]);

  const handleAction = async (type: 'in' | 'out') => {
    if (isProcessing) return;
    setIsProcessing(true);

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    try {
      if (type === 'in') {
        await onUpdateAttendance({ memberId: member.id, checkIn: timeStr, checkOut: '', date: todayIso });
      } else if (type === 'out') {
        if (latestLog && latestLog.checkIn && !latestLog.checkOut) {
          await onUpdateAttendance({ ...latestLog, checkOut: timeStr });
        }
      }
    } finally {
      // Small buffer to ensure user sees the success state
      setTimeout(() => setIsProcessing(false), 1000);
    }
  };

  const isSessionOpen = !!(latestLog && latestLog.checkIn && !latestLog.checkOut);
  const sessionFinished = !!(latestLog && latestLog.checkIn && latestLog.checkOut);
  const isExpired = Number(member.expiryTimestamp) < Date.now();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[50%] bg-amber-500/10 blur-[120px] rounded-full animate-pulse"></div>
      
      <div className="z-10 w-full max-w-sm space-y-6 animate-in fade-in zoom-in duration-500">
        <header className="text-center space-y-1">
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">
            Athlete <span className="text-amber-500">Terminal</span>
          </h1>
          <div className="flex items-center justify-center gap-2">
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.4em]">Megh Fit Cloud-Sync Active</p>
            {(isSyncing || isProcessing) && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></div>}
          </div>
        </header>

        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500 border-2 border-amber-400 flex items-center justify-center mb-4 text-2xl font-black text-slate-950 italic shadow-lg shadow-amber-500/20">
              {member.name.charAt(0)}
            </div>
            <h2 className="text-lg font-black text-white uppercase tracking-tighter mb-1">{member.name}</h2>
            <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest">Unique ID: {member.id}</p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center space-y-1 mb-6 shadow-inner">
             <p className="text-3xl font-mono font-black text-white tracking-tight tabular-nums">
               {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </p>
             <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
               {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
             </p>
          </div>

          {isExpired ? (
            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-center">
              <p className="text-red-500 font-black uppercase text-xs tracking-tighter mb-2">Access Revoked</p>
              <p className="text-slate-400 text-[8px] uppercase tracking-widest leading-relaxed">Membership expired. Please see the desk for renewal.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {latestLog && (
                <div className={`border rounded-2xl p-5 flex flex-col items-center gap-3 transition-all duration-500 ${sessionFinished ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-950/50 border-slate-800'}`}>
                   {sessionFinished && (
                     <div className="flex items-center gap-2 mb-1 animate-in fade-in">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Workout Logged Successfully</span>
                     </div>
                   )}
                   
                   <div className="flex justify-between items-center w-full">
                     <div className="text-center flex-1">
                        <p className="text-[7px] text-slate-500 font-black uppercase mb-1">Check In</p>
                        <p className="text-xs font-black text-white font-mono">{formatDisplayTime(latestLog.checkIn)}</p>
                     </div>
                     <div className="w-px h-8 bg-slate-800 mx-2"></div>
                     <div className="text-center flex-1">
                        <p className="text-[7px] text-amber-500 font-black uppercase mb-1">Check Out</p>
                        <p className={`text-xs font-black text-amber-500 font-mono ${!latestLog.checkOut ? 'opacity-20' : ''}`}>
                          {latestLog.checkOut ? formatDisplayTime(latestLog.checkOut) : '--:--'}
                        </p>
                     </div>
                   </div>
                </div>
              )}

              {isSessionOpen ? (
                <button 
                  disabled={isProcessing}
                  onClick={() => handleAction('out')}
                  className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isProcessing ? 'Syncing Terminal...' : 'Finalize Session'}
                  {!isProcessing && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>}
                </button>
              ) : sessionFinished ? (
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl text-center animate-in zoom-in duration-300">
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Session Closed • Synced to Desk</p>
                   <p className="text-[7px] text-slate-600 uppercase mt-1 italic">Great work today, {member.name.split(' ')[0]}!</p>
                </div>
              ) : (
                <button 
                  disabled={isProcessing}
                  onClick={() => handleAction('in')}
                  className="w-full py-5 bg-amber-500 text-slate-950 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isProcessing ? 'Handshaking Cloud...' : 'Begin Session'}
                  {!isProcessing && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"></polyline></svg>}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="text-center pt-2">
          <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-4 italic">Identity Secured: {member.id}</p>
          <button onClick={onLogoutIdentity} className="text-amber-500/30 hover:text-amber-500 transition text-[8px] font-black uppercase tracking-widest underline underline-offset-4">
            Relink to Different Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelfServiceView;
