
import { Member, MemberStatus, MembershipTier, Gender, PaymentMethod, AttendanceLog, DurationMonths, PricingConfig } from '../types';

/**
 * MANDATORY: Verify this URL matches your current Apps Script deployment URL.
 */
const GOOGLE_SCRIPT_URL: string = 'https://script.google.com/macros/s/AKfycbx0JavHlD_J3CxjQ2pqhqY3ao_rd6y_zRO4XxtRU4cysVEhOJC62wGnIna5lgdcNrv6/exec'; 

/**
 * Ensures a consistent IST Date object regardless of local system timezone.
 */
export const getISTNow = (): Date => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false
  });
  const parts = formatter.formatToParts(new Date());
  const d: any = {};
  parts.forEach(p => d[p.type] = p.value);
  return new Date(d.year, d.month - 1, d.day, d.hour, d.minute, d.second);
};

/**
 * Formats time as HH:mm in IST.
 */
export const formatISTTime = (date: Date = new Date()): string => {
  return date.toLocaleTimeString('en-GB', { 
    timeZone: 'Asia/Kolkata', 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

/**
 * Formats date as YYYY-MM-DD in IST.
 */
export const formatISTDate = (date: Date = new Date()): string => {
  const formatter = new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date);
};

/**
 * Normalizes time to HH:mm. 
 * Enhanced to detect ISO strings from Google Sheets and lock them back to IST.
 */
export const normalizeTimeStr = (timeStr: any): string => {
  if (!timeStr) return '';
  const clean = String(timeStr).trim();
  
  if (clean.includes('T') && clean.includes('Z')) {
    try {
      const d = new Date(clean);
      return formatISTTime(d);
    } catch { }
  }

  const parts = clean.split(':');
  if (parts.length >= 2) {
    const h = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    if (!isNaN(parseInt(h)) && !isNaN(parseInt(m))) {
      return `${h.slice(-2)}:${m.slice(-2)}`;
    }
  }
  return clean;
};

/**
 * Normalizes date strings to YYYY-MM-DD.
 */
export const normalizeDateStr = (dateStr: string): string => {
  if (!dateStr) return '';
  const trimmed = String(dateStr).trim();
  if (!trimmed) return '';

  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return trimmed;
  } catch {
    return trimmed;
  }
};

const getVal = (row: any, searchKeys: string[]) => {
  const rowKeys = Object.keys(row);
  for (const sk of searchKeys) {
    const foundKey = rowKeys.find(rk => rk.toLowerCase().trim() === sk.toLowerCase().trim());
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
      const val = row[foundKey];
      return typeof val === 'string' ? val.trim() : val;
    }
  }
  return "";
};

const parseBool = (val: any): boolean => {
  if (val === undefined || val === null) return false;
  const s = String(val).toLowerCase().trim();
  return s === 'true' || s === '1' || s === 'yes' || s === 'checked' || val === true;
};

const parseNum = (val: any): number => {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

// HELPER FOR ROBUST FETCHING
const robustFetch = async (url: string, options: any = {}) => {
  if (!GOOGLE_SCRIPT_URL || !GOOGLE_SCRIPT_URL.includes('/exec')) {
    throw new Error("Invalid Cloud URL");
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      cache: 'no-store',
      redirect: 'follow'
    });
    
    if (!response.ok && options.mode !== 'no-cors') {
      throw new Error(`Cloud error: ${response.status}`);
    }
    
    return response;
  } catch (err) {
    console.warn("Handshake error with Cloud Sheet:", err);
    throw err;
  }
};

export const syncConfigToSheet = async (config: { upiId: string, membershipPrices: PricingConfig, ptPrices: PricingConfig }): Promise<boolean> => {
  try {
    await robustFetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({ ...config, sheetType: 'config', action: 'update' }),
    });
    return true; 
  } catch {
    return false;
  }
};

export const fetchConfigFromSheet = async (): Promise<{ upiId?: string, membershipPrices?: PricingConfig, ptPrices?: PricingConfig } | null> => {
  try {
    const url = `${GOOGLE_SCRIPT_URL}?type=config&_t=${Date.now()}`;
    const response = await robustFetch(url);
    return await response.json();
  } catch {
    return null;
  }
};

export const syncMemberToSheet = async (member: Member): Promise<boolean> => {
  try {
    await robustFetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({ ...member, sheetType: 'member', action: 'update' }),
    });
    return true; 
  } catch {
    return false;
  }
};

export const deleteMemberFromSheet = async (memberId: string): Promise<boolean> => {
  try {
    await robustFetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({ action: 'delete', id: memberId.trim(), sheetType: 'member' }),
    });
    return true;
  } catch {
    return false;
  }
};

export const syncAttendanceToSheet = async (log: AttendanceLog): Promise<boolean> => {
  try {
    await robustFetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({ ...log, sheetType: 'attendance' }),
    });
    return true;
  } catch {
    return false;
  }
};

export const fetchMembersFromSheet = async (): Promise<Member[]> => {
  try {
    const url = `${GOOGLE_SCRIPT_URL}?type=members&_t=${Date.now()}`;
    const response = await robustFetch(url);
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data.map((row: any): Member => {
      const ts = parseNum(getVal(row, ["timestamp"]));
      const expTs = parseNum(getVal(row, ["expiryTimestamp"]));
      const paid = parseNum(getVal(row, ["amountPaid"]));
      const due = parseNum(getVal(row, ["dueAmount", "balance"]));
      const total = paid + due;
      const idStr = String(getVal(row, ["id"])).trim();
      
      return {
        id: idStr,
        name: String(getVal(row, ["name"])),
        age: parseNum(getVal(row, ["age"])),
        gender: (getVal(row, ["gender"]) || Gender.MALE) as Gender,
        phone: String(getVal(row, ["phone"])),
        email: String(getVal(row, ["email"])),
        photo: String(row["photo"] || row["Photo"] || ""), 
        tier: (getVal(row, ["tier"]) || MembershipTier.BASIC) as MembershipTier,
        membershipDuration: (parseNum(getVal(row, ["membershipDuration"])) || 1) as DurationMonths,
        hasPersonalTraining: parseBool(getVal(row, ["hasPersonalTraining"])),
        ptDuration: getVal(row, ["ptDuration"]) ? (parseNum(getVal(row, ["ptDuration"])) as DurationMonths) : undefined,
        totalPayable: total,
        amountPaid: paid,
        paymentMethod: (getVal(row, ["paymentMethod"]) || PaymentMethod.UPI) as PaymentMethod,
        paymentDueDate: getVal(row, ["paymentDueDate"]) ? String(getVal(row, ["paymentDueDate"])) : undefined,
        transactionId: String(getVal(row, ["transactionId"])),
        fitnessGoals: String(getVal(row, ["fitnessGoals"])),
        joinDate: String(getVal(row, ["joinDate"])),
        expiryDate: String(getVal(row, ["expiryDate"])),
        ptExpiryDate: getVal(row, ["ptExpiryDate"]) ? String(getVal(row, ["ptExpiryDate"])) : undefined,
        timestamp: ts === 0 ? Date.now() : ts,
        expiryTimestamp: expTs,
        status: (getVal(row, ["status"]) || MemberStatus.PENDING) as MemberStatus,
        aiInsights: String(getVal(row, ["aiInsights"])),
        registrationSource: (getVal(row, ["registrationSource"]) || "Admin") as 'Admin' | 'Client QR'
      };
    }).filter(m => m.id && m.id !== "undefined");
  } catch {
    return [];
  }
};

export const fetchAttendanceLogs = async (): Promise<AttendanceLog[]> => {
  try {
    const url = `${GOOGLE_SCRIPT_URL}?type=attendance&_t=${Date.now()}`;
    const response = await robustFetch(url);
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data.map((row: any) => ({
      memberId: String(getVal(row, ["memberId"])).trim(),
      checkIn: normalizeTimeStr(String(getVal(row, ["checkIn"]))),
      checkOut: normalizeTimeStr(String(getVal(row, ["checkOut"]))),
      date: normalizeDateStr(String(getVal(row, ["date"])))
    })).filter(l => l.memberId && l.memberId !== "");
  } catch {
    return [];
  }
};
