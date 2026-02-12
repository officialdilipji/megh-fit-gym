
import { Member, MemberStatus, MembershipTier, Gender, PaymentMethod, AttendanceLog, DurationMonths, PricingConfig } from '../types';

/**
 * MANDATORY: Verify this URL matches your current Apps Script deployment URL.
 */
const GOOGLE_SCRIPT_URL: string = 'https://script.google.com/macros/s/AKfycbx0JavHlD_J3CxjQ2pqhqY3ao_rd6y_zRO4XxtRU4cysVEhOJC62wGnIna5lgdcNrv6/exec'; 

// Utility to ensure dates are compared as YYYY-MM-DD regardless of source format
export const normalizeDateStr = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      // Handle DD/MM/YYYY manually if Date fails
      const parts = dateStr.split(/[/.-]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      return dateStr.trim();
    }
    return d.toISOString().split('T')[0];
  } catch {
    return dateStr.trim();
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

export const syncConfigToSheet = async (config: { upiId: string, membershipPrices: PricingConfig, ptPrices: PricingConfig }): Promise<boolean> => {
  if (!GOOGLE_SCRIPT_URL || !GOOGLE_SCRIPT_URL.includes('/exec')) return false;
  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      body: JSON.stringify({ 
        ...config, 
        sheetType: 'config', 
        action: 'update' 
      }),
    });
    return true; 
  } catch (error) {
    console.error("Config Sync Error:", error);
    return false;
  }
};

export const fetchConfigFromSheet = async (): Promise<{ upiId?: string, membershipPrices?: PricingConfig, ptPrices?: PricingConfig } | null> => {
  if (!GOOGLE_SCRIPT_URL || !GOOGLE_SCRIPT_URL.includes('/exec')) return null;
  try {
    const url = `${GOOGLE_SCRIPT_URL}?type=config&_t=${Date.now()}`;
    const response = await fetch(url, { method: 'GET', mode: 'cors', redirect: 'follow' });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Fetch Config Error:", error);
    return null;
  }
};

export const syncMemberToSheet = async (member: Member): Promise<boolean> => {
  if (!GOOGLE_SCRIPT_URL || !GOOGLE_SCRIPT_URL.includes('/exec')) return false;
  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      body: JSON.stringify({ ...member, sheetType: 'member', action: 'update' }),
    });
    return true; 
  } catch (error) {
    console.error("Cloud Sync Error:", error);
    return false;
  }
};

export const deleteMemberFromSheet = async (memberId: string): Promise<boolean> => {
  if (!GOOGLE_SCRIPT_URL || !GOOGLE_SCRIPT_URL.includes('/exec')) return false;
  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      body: JSON.stringify({ id: memberId, sheetType: 'member', action: 'delete' }),
    });
    return true;
  } catch (error) {
    console.error("Cloud Delete Error:", error);
    return false;
  }
};

export const syncAttendanceToSheet = async (log: AttendanceLog): Promise<boolean> => {
  if (!GOOGLE_SCRIPT_URL || !GOOGLE_SCRIPT_URL.includes('/exec')) return false;
  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      body: JSON.stringify({ ...log, sheetType: 'attendance' }),
    });
    return true;
  } catch (error) {
    console.error("Attendance Sync Error:", error);
    return false;
  }
};

export const fetchMembersFromSheet = async (): Promise<Member[]> => {
  if (!GOOGLE_SCRIPT_URL || !GOOGLE_SCRIPT_URL.includes('/exec')) return [];
  try {
    const url = `${GOOGLE_SCRIPT_URL}?type=members&_t=${Date.now()}`;
    const response = await fetch(url, { method: 'GET', mode: 'cors', redirect: 'follow' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data.map((row: any): Member => {
      const ts = parseNum(getVal(row, ["timestamp"]));
      const expTs = parseNum(getVal(row, ["expiryTimestamp"]));
      const paid = parseNum(getVal(row, ["amountPaid", "AmountPaid", "Amount Paid"]));
      const due = parseNum(getVal(row, ["dueAmount", "DueAmount", "Due Amount", "balance"]));
      const total = paid + due;
      return {
        id: String(getVal(row, ["id"])),
        name: String(getVal(row, ["name"])),
        age: parseNum(getVal(row, ["age"])),
        gender: (getVal(row, ["gender"]) || Gender.MALE) as Gender,
        phone: String(getVal(row, ["phone"])),
        email: String(getVal(row, ["email"])),
        photo: String(row["photo"] || row["Photo"] || ""), 
        tier: (getVal(row, ["tier"]) || MembershipTier.BASIC) as MembershipTier,
        membershipDuration: (parseNum(getVal(row, ["membershipDuration"])) || 1) as DurationMonths,
        hasPersonalTraining: parseBool(getVal(row, ["hasPersonalTraining", "Personal Training", "PT", "PersonalTraining"])),
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
  } catch (error) {
    console.error("Fetch Members Error:", error);
    return [];
  }
};

export const fetchAttendanceLogs = async (): Promise<AttendanceLog[]> => {
  if (!GOOGLE_SCRIPT_URL || !GOOGLE_SCRIPT_URL.includes('/exec')) return [];
  try {
    const url = `${GOOGLE_SCRIPT_URL}?type=attendance&_t=${Date.now()}`;
    const response = await fetch(url, { method: 'GET', mode: 'cors', redirect: 'follow' });
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data.map((row: any) => ({
      memberId: String(getVal(row, ["memberId"])),
      checkIn: String(getVal(row, ["checkIn"])),
      checkOut: String(getVal(row, ["checkOut"])),
      date: String(getVal(row, ["date"]))
    })).filter(l => l.memberId && l.memberId !== "");
  } catch (error) {
    console.error("Fetch Attendance Error:", error);
    return [];
  }
};
