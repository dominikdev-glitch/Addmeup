export interface OfficialEmailChannel {
  id: string;
  label: string;
  address: string;
  purpose: string;
  responseSla: string;
}

export const OFFICIAL_EMAILS: OfficialEmailChannel[] = [
  {
    id: 'general',
    label: 'General & Community',
    address: 'hello@addmeup.ng',
    purpose: 'General platform questions, creator onboarding, and community feedback.',
    responseSla: 'Replies within 24 hours',
  },
  {
    id: 'support',
    label: 'Member Support & Privacy',
    address: 'support@addmeup.ng',
    purpose: 'Account help, verification reviews, data requests, and profile assistance.',
    responseSla: 'Replies within 2–12 hours',
  },
  {
    id: 'partnerships',
    label: 'Partnerships & Brands',
    address: 'partnerships@addmeup.ng',
    purpose: 'Brand sponsorships, WhatsApp TV collaborations, Snapchat creators, and agency bulk plans.',
    responseSla: 'Dedicated partner desk',
  },
  {
    id: 'receipts',
    label: 'Billing & Deposits',
    address: 'receipts@addmeup.ng',
    purpose: 'Paystack payment confirmations, point credit receipts, and payout notices.',
    responseSla: 'Automated + billing review',
  },
  {
    id: 'security',
    label: 'Trust & Security',
    address: 'security@addmeup.ng',
    purpose: 'Abuse reports, impersonation takedowns, password alerts, and security disclosures.',
    responseSla: 'Priority moderation review',
  },
];

export const OFFICIAL_WHATSAPP_NUMBER = '+234 904 046 4774';
export const OFFICIAL_WHATSAPP_DIGITS = '2349040464774';
export const OFFICIAL_WHATSAPP_URL =
  'https://wa.me/2349040464774?text=Hello%20AddMeUp%20Support';
export const OFFICIAL_DOMAIN = 'addmeup.ng';
export const OFFICIAL_SITE_URL = 'https://addmeup.ng';

export type PublicPageId =
  | 'about'
  | 'partnership'
  | 'contact'
  | 'faq'
  | 'privacy'
  | 'terms';
