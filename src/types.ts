export type PlatformType = 'snapchat' | 'whatsapp';

export type CategoryType = 'Friends' | 'Business' | 'Tech' | 'Fashion' | 'Services';

export type AdDurationType = '6h' | '12h' | '24h' | '7d' | '30d';

export interface AdDurationConfig {
  id: AdDurationType;
  label: string;
  durationHours: number;
  costCredits: number;
  tag?: string;
  isPopular?: boolean;
}

export interface BoostPackage {
  id: string;
  label: string;
  durationHours: number;
  costCredits: number;
  tag?: string;
  isPopular?: boolean;
}

export interface DepositPackage {
  id: string;
  credits: number;
  bonusCredits?: number;
  priceNgn: number;
  label: string;
  popular?: boolean;
  bestValue?: boolean;
}

export interface UserProfile {
  uid: string;
  username: string;
  email?: string;
  photoUrl?: string;
  creditBalance: number;
  isAdmin?: boolean;
  isBanned?: boolean;
  snapchatHandle?: string;
  whatsappNumber?: string;
  referralCode?: string;
  referredBy?: string;
  referralsCount?: number;
  referralCreditsEarned?: number;
  approvedClaimsCount?: number;
  totalClaimsCount?: number;
  dailyStreak?: number;
  lastDailyBonusDate?: string;
  createdAt: string | number;
}

export interface Ad {
  adId: string;
  userId: string;
  title: string;
  category: CategoryType;
  platform: PlatformType;
  targetHandleOrNumber: string;
  rewardPerAdd: number; // default: 5
  status: 'active' | 'paused' | 'expired';
  durationHours?: number;
  costCredits?: number;
  expiresAt: number; // timestamp in ms
  createdAt: number; // timestamp in ms
  userDisplayName?: string;
  avatarUrl?: string;
  imageUrl?: string;
  description?: string;
  reportsCount?: number;
  isBoosted?: boolean;
  boostedUntil?: number; // timestamp in ms
  boostTier?: string;
  viewsCount?: number;
  clicksCount?: number;
}

export type ClaimStatus = 'pending' | 'verified' | 'rejected';

export interface Claim {
  claimId: string;
  adId: string;
  adOwnerUid: string;
  adTitle: string;
  platform: PlatformType;
  targetHandleOrNumber: string;
  claimerUid: string;
  claimerDisplayName: string;
  verificationCode?: string; // e.g. "AD-8492" for WhatsApp
  claimerSnapchatHandle?: string; // e.g. "@alex_streaks" for Snapchat
  proofImageUrl?: string; // optional screenshot proof attached by earner
  deviceFingerprint?: string;
  status: ClaimStatus;
  creditsAwarded: number;
  createdAt: number;
  verifiedAt?: number;
  rejectedAt?: number;
  rejectionReason?: string;
  autoApproveAt?: number;
}

export interface Transaction {
  transactionId: string;
  userId: string;
  amount: number; // positive for earned/deposited, negative for spent
  type: 'earned_ad_click' | 'placed_ad' | 'deposit' | 'daily_bonus' | 'referral_bonus' | 'boost_ad' | 'admin_adjustment';
  referenceId?: string;
  amountNgn?: number;
  paymentMethod?: string;
  description?: string;
  createdAt: number;
}

export type NotificationType = 
  | 'claim_received' 
  | 'claim_verified' 
  | 'claim_rejected' 
  | 'deposit_success' 
  | 'referral_bonus' 
  | 'boost_activated'
  | 'system';

export interface AppNotification {
  notificationId: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: number;
  linkTab?: 'feed' | 'post' | 'verifications' | 'wallet';
  meta?: Record<string, any>;
}

export type ReportReason = 
  | 'spam_bot'
  | 'inappropriate_content'
  | 'broken_link'
  | 'harassment_fraud'
  | 'other';

export interface AdReport {
  reportId: string;
  adId: string;
  reportedUserId: string;
  reporterUid: string;
  reason: ReportReason;
  details?: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  createdAt: number;
}

