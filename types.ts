
export enum MembershipTier {
  BASIC = 'Basic',
  STANDARD = 'Standard',
  PREMIUM = 'Premium'
}

export type DurationMonths = 1 | 3 | 6 | 12;

export enum PaymentMethod {
  UPI = 'UPI',
  CASH = 'Cash',
  LATER = 'Pay Later'
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other'
}

export enum MemberStatus {
  PENDING = 'Pending',
  ACTIVE = 'Active'
}

export type SortOrder = 'newest' | 'oldest';

export interface TierPriceConfig {
  [key: number]: number; // duration (months) -> price
}

export type TierSettings = Record<MembershipTier, TierPriceConfig>;

export interface PTSettings {
  [key: number]: number; // duration (months) -> price
}

export interface AttendanceLog {
  memberId: string;
  checkIn: string;
  checkOut: string;
  date: string;
}

export interface AdminConfig {
  username: string;
  password: string;
  upiId: string;
}

export interface Member {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  phone: string;
  email: string;
  photo: string;
  tier: MembershipTier;
  membershipDuration: DurationMonths;
  hasPersonalTraining: boolean;
  ptDuration?: DurationMonths;
  totalPayable: number;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  paymentDueDate?: string;
  transactionId?: string;
  fitnessGoals: string;
  joinDate: string;
  expiryDate: string;
  ptExpiryDate?: string;
  timestamp: number;
  expiryTimestamp: number;
  ptExpiryTimestamp?: number;
  status: MemberStatus;
  aiInsights?: string;
  registrationSource: 'Admin' | 'Client QR';
}

export interface AppState {
  members: Member[];
  attendance: AttendanceLog[];
  isAddingMember: boolean;
  searchTerm: string;
  sortOrder: SortOrder;
  currentView: 'home' | 'admin' | 'client' | 'login' | 'landing';
  isLoggedIn: boolean;
  tierSettings: TierSettings;
  ptSettings: PTSettings;
  adminConfig: AdminConfig;
}

export const DEFAULT_TIER_CONFIG: TierSettings = {
  [MembershipTier.BASIC]: { 1: 1200, 3: 3200, 6: 6000, 12: 10000 },
  [MembershipTier.STANDARD]: { 1: 2500, 3: 6500, 6: 12000, 12: 20000 },
  [MembershipTier.PREMIUM]: { 1: 5000, 3: 13000, 6: 24000, 12: 45000 }
};

export const DEFAULT_PT_CONFIG: PTSettings = {
  1: 3000,
  3: 8000,
  6: 15000,
  12: 28000
};
