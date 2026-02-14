
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

export type AppView = 'home' | 'admin' | 'client' | 'login' | 'landing';

// Simplified pricing: just a record of months -> price
export type PricingConfig = Record<number, number>;

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
  currentView: AppView;
  isLoggedIn: boolean;
  membershipPrices: PricingConfig;
  ptPrices: PricingConfig;
  adminConfig: AdminConfig;
}

export const DEFAULT_MEMBERSHIP_PRICES: PricingConfig = {
  1: 3000,
  3: 6000,
  6: 9000,
  12: 15000
};

export const DEFAULT_PT_PRICES: PricingConfig = {
  1: 3000,
  3: 6000,
  6: 9000,
  12: 15000
};
