
export enum MembershipTier {
  BASIC = 'Basic',
  STANDARD = 'Standard',
  PREMIUM = 'Premium'
}

export enum PaymentMethod {
  UPI = 'UPI',
  CASH = 'Cash'
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

export interface TierConfig {
  price: number;
  features: string[];
  durationMonths: number;
  color: string;
}

export type TierSettings = Record<MembershipTier, TierConfig>;

export interface Member {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  phone: string;
  email: string;
  photo: string; // Base64
  tier: MembershipTier;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  transactionId?: string; // For UPI validation
  fitnessGoals: string;
  joinDate: string;
  expiryDate: string;
  timestamp: number;
  expiryTimestamp: number;
  status: MemberStatus;
  aiInsights?: string;
  registrationSource: 'Admin' | 'Client QR';
}

export interface AppState {
  members: Member[];
  isAddingMember: boolean;
  searchTerm: string;
  sortOrder: SortOrder;
  currentView: 'admin' | 'client';
  tierSettings: TierSettings;
}

export const DEFAULT_TIER_CONFIG: TierSettings = {
  [MembershipTier.BASIC]: {
    price: 1200,
    features: ['General Gym Access', 'Standard Equipment', 'Locker Room'],
    durationMonths: 1,
    color: 'slate'
  },
  [MembershipTier.STANDARD]: {
    price: 2500,
    features: ['General Gym Access', 'Group Fitness Classes', '1 Guest Pass/Month'],
    durationMonths: 3,
    color: 'blue'
  },
  [MembershipTier.PREMIUM]: {
    price: 5000,
    features: ['24/7 Access', 'Personal Training (2/mo)', 'Steam & Sauna', 'Nutrition Plan'],
    durationMonths: 12,
    color: 'amber'
  }
};
