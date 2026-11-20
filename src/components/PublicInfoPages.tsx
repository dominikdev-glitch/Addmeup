import React, { useState } from 'react';
import { PublicLayout } from './PublicLayout';
import {
  OFFICIAL_EMAILS,
  OFFICIAL_WHATSAPP_NUMBER,
  OFFICIAL_WHATSAPP_URL,
  PublicPageId,
} from '../lib/contactConfig';
import { submitContactInquiry, ContactInquiryPayload } from '../lib/emails';
import {
  Mail,
  Copy,
  Check,
  MessageCircle,
  ArrowRight,
  ChevronDown,
  Search,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Handshake,
} from 'lucide-react';

interface PublicInfoPagesProps {
  page: 'about' | 'partnership' | 'contact' | 'faq';
  onNavigate: (page: 'home' | PublicPageId) => void;
  onPrimaryCta: () => void;
  primaryCtaLabel?: string;
}

interface FaqItem {
  id: string;
  category: 'started' | 'points' | 'payments' | 'safety';
  categoryLabel: string;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-signup-bonus',
    category: 'started',
    categoryLabel: 'Getting Started',
    question: 'How does AddMeUp work and what do I get when I sign up?',
    answer:
      'Sign up with Google or email/password in seconds and your wallet receives +20 free welcome points immediately. You can earn unlimited additional points by adding active Snapchat handles or WhatsApp vendors on the feed (+5 points per verified add), or deposit Naira via Paystack to promote your own handle right away.',
  },
  {
    id: 'faq-platforms',
    category: 'started',
    categoryLabel: 'Getting Started',
    question: 'Which platforms are supported on AddMeUp?',
    answer:
      'AddMeUp focuses on direct social growth for Snapchat usernames and WhatsApp business/personal numbers. Clicking a listing opens Snapchat or WhatsApp directly so real members can add or message each other without middlemen.',
  },
  {
    id: 'faq-10s-timer',
    category: 'points',
    categoryLabel: 'Points & Earning',
    question: 'Why is there a 10-second timer when claiming +5 points?',
    answer:
      'The 10-second verification timer ensures members genuinely open Snapchat or WhatsApp to add the advertiser before claiming points. Submitting fake or repeated claims without adding the handle can result in claim rejections or account moderation.',
  },
  {
    id: 'faq-ad-pricing',
    category: 'points',
    categoryLabel: 'Points & Earning',
    question: 'How much does it cost to post or boost my handle?',
    answer:
      'Posting durations scale to your schedule: 6 hours (100 Pts), 12 hours (200 Pts), 24 hours (450 Pts), 7 days (2,500 Pts), or 1 month (9,000 Pts). Optional VIP Boosts pin your listing near the top of the feed for extra visibility.',
  },
  {
    id: 'faq-daily-streak',
    category: 'points',
    categoryLabel: 'Points & Earning',
    question: 'How do daily streak bonuses and referrals work?',
    answer:
      'Open the daily streak check-in modal from your header to collect free points every day. You can also share your personal referral link from your Wallet to earn bonus points whenever friends register and verify their accounts.',
  },
  {
    id: 'faq-paystack',
    category: 'payments',
    categoryLabel: 'Payments & Paystack',
    question: 'What payment methods work for Naira deposits?',
    answer:
      'All Naira deposits are processed through Paystack, supporting Nigerian Debit Cards, Bank Transfer, USSD, and OPay. Packages start at ₦100 for 10 Points (₦1,000 = 100 Points), and verified transactions credit automatically.',
  },
  {
    id: 'faq-missing-deposit',
    category: 'payments',
    categoryLabel: 'Payments & Paystack',
    question: 'What should I do if a Paystack transfer did not credit automatically?',
    answer:
      'Keep your Paystack transaction reference ID and message WhatsApp Support (+234 904 046 4774) or email receipts@addmeup.ng / support@addmeup.ng with your email and reference code so our team can verify and credit your wallet.',
  },
  {
    id: 'faq-privacy-delete',
    category: 'safety',
    categoryLabel: 'Safety & Accounts',
    question: 'Can I set a password for a Google account or delete my account data?',
    answer:
      'Yes. You can use the Reset Password flow with your email address to set an email/password credential, remove your active listings anytime inside My Ads, or email support@addmeup.ng to request permanent account deletion.',
  },
  {
    id: 'faq-partnerships',
    category: 'started',
    categoryLabel: 'Getting Started',
    question: 'How do WhatsApp TVs, influencers, and brands partner with AddMeUp?',
    answer:
      'Visit the Partnerships page or email partnerships@addmeup.ng with your channel handle, audience size, and campaign goals. We run creator co-promotions, campus ambassador campaigns, and bulk agency point allocations.',
  },
];

export const PublicInfoPages: React.FC<PublicInfoPagesProps> = ({
  page,
  onNavigate,
  onPrimaryCta,
  primaryCtaLabel = 'Open App',
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Shared inquiry state (used on Partnerships & Contact pages)
  const [formCategory, setFormCategory] = useState<ContactInquiryPayload['category']>(
    page === 'partnership' ? 'partnership' : 'general'
  );
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formOrg, setFormOrg] = useState('');
  const [formHandle, setFormHandle] = useState('');
  const [formBudget, setFormBudget] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // FAQ state
  const [faqFilter, setFaqFilter] = useState<'all' | 'started' | 'points' | 'payments' | 'safety'>('all');
  const [faqQuery, setFaqQuery] = useState('');
  const [openFaqId, setOpenFaqId] = useState<string>('faq-signup-bonus');

  const handleCopyEmail = (id: string, address: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(address).catch(() => {});
    }
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 2200);
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!formName.trim() || formName.trim().length < 2) {
      setSubmitError('Please enter your full name.');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@') || !formEmail.includes('.')) {
      setSubmitError('Please enter a valid email address so we can reply.');
      return;
    }
    if (!formMessage.trim() || formMessage.trim().length < 10) {
      setSubmitError('Please share at least a brief 10-character message about your request.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await submitContactInquiry({
        name: formName.trim(),
        email: formEmail.trim(),
        category: page === 'partnership' && !['partnership', 'creator', 'ambassador'].includes(formCategory)
          ? 'partnership'
          : formCategory,
        organization: formOrg.trim() || undefined,
        handle: formHandle.trim() || undefined,
        budgetOrReach: formBudget.trim() || undefined,
        message: formMessage.trim(),
      });
      setSubmitSuccess(
        res.message ||
          'Thank you! Your inquiry has been emailed to our team and a confirmation copy is on the way to your inbox.'
      );
      setFormMessage('');
      setFormBudget('');
    } catch (err: any) {
      setSubmitError(
        err?.message ||
          'Could not submit right now. You can email partnerships@addmeup.ng or message WhatsApp support directly.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFaqs = FAQ_ITEMS.filter((item) => {
    if (faqFilter !== 'all' && item.category !== faqFilter) return false;
    if (faqQuery.trim()) {
      const q = faqQuery.toLowerCase();
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <PublicLayout
      activePage={page}
      onNavigate={onNavigate}
      onPrimaryCta={onPrimaryCta}
      primaryCtaLabel={primaryCtaLabel}
    >
      {/* ============================= ABOUT PAGE ============================= */}
      {page === 'about' && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-14">
          {/* Hero */}
          <section className="max-w-3xl space-y-5">
            <p className="text-xs font-bold text-orange-600 tracking-wide">
              About AddMeUp · addmeup.ng
            </p>
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Built for real connections across Snapchat and WhatsApp
            </h1>
            <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
              AddMeUp is a social handle exchange and discovery platform created so everyday people, content creators, and local businesses can grow real audiences without bots or fake engagement.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onPrimaryCta}
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition-colors flex items-center gap-2"
              >
                <span>{primaryCtaLabel}</span>
                <ArrowRight className="w-4 h-4 text-orange-400" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('partnership')}
                className="px-6 py-3 bg-white hover:bg-orange-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition-colors"
              >
                Explore Partnerships
              </button>
            </div>
          </section>

          {/* Factual Platform Benchmarks Strip */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 border-y border-slate-200/80 py-8">
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">+20 Pts</p>
              <p className="text-xs font-semibold text-slate-600">Instant welcome balance on signup</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">+5 Pts</p>
              <p className="text-xs font-semibold text-slate-600">Earned per verified handle add</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">10 Sec</p>
              <p className="text-xs font-semibold text-slate-600">Fair-play redirect verification</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">₦100 Min</p>
              <p className="text-xs font-semibold text-slate-600">Paystack NGN point packages</p>
            </div>
          </section>

          {/* Who Uses AddMeUp — Editorial Numbering */}
          <section className="space-y-8">
            <div className="max-w-2xl space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                How the community grows together
              </h2>
              <p className="text-sm text-slate-600">
                Every listing links straight to native Snapchat or WhatsApp apps on iPhone, Android, and desktop.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-2.5">
                <p className="text-xs font-bold text-orange-600">01. Everyday Connections</p>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Meet active streaks and campus communities
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Users discover new Snapchat streak partners, gaming squads, and interest groups filtered cleanly by category without algorithmic clutter.
                </p>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-2.5">
                <p className="text-xs font-bold text-orange-600">02. Creators &amp; WhatsApp TVs</p>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Convert feed visibility into real story views
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Creators publish listings from 6 hours up to 30 days, pin top placements with VIP Boosts, and grow recurring Snapchat Story and WhatsApp Status viewers.
                </p>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-2.5">
                <p className="text-xs font-bold text-orange-600">03. Local Merchants &amp; Vendors</p>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Direct WhatsApp customer acquisition
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Fashion stores, tech sellers, service providers, and small businesses share direct WhatsApp numbers so buyers reach them in one tap.
                </p>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-2.5">
                <p className="text-xs font-bold text-orange-600">04. Safety, Fair Play &amp; Privacy</p>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Human moderation and clear verification
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Report tools, screenshot verification reviews, Google OAuth limited-use compliance, and Paystack-verified point credits keep the network clean and dependable.
                </p>
              </div>
            </div>
          </section>

          {/* Direct Channels & Official Email Strip */}
          <section className="bg-white border border-orange-200/80 rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <h2 className="text-xl font-black text-slate-900">
                Reach the AddMeUp team directly
              </h2>
              <p className="text-sm text-slate-600">
                Need support, partnership pricing, or privacy assistance? Write to our verified `@addmeup.ng` desks or message us on WhatsApp.
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs font-bold text-slate-700">
                <a href="mailto:hello@addmeup.ng" className="text-orange-600 hover:underline">
                  hello@addmeup.ng
                </a>
                <span className="text-slate-300">·</span>
                <a href="mailto:support@addmeup.ng" className="text-orange-600 hover:underline">
                  support@addmeup.ng
                </a>
                <span className="text-slate-300">·</span>
                <a href="mailto:partnerships@addmeup.ng" className="text-orange-600 hover:underline">
                  partnerships@addmeup.ng
                </a>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition-colors"
              >
                Open Contact Desk
              </button>
              <a
                href={OFFICIAL_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-colors"
              >
                WhatsApp Support
              </a>
            </div>
          </section>
        </div>
      )}

      {/* ========================== PARTNERSHIP PAGE ========================== */}
      {page === 'partnership' && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-14">
          {/* Split Hero */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-5">
              <p className="text-xs font-bold text-orange-600 tracking-wide">
                Partnerships · Brand Sponsorships · Creators
              </p>
              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Grow your brand, TV channel, or campus community with AddMeUp
              </h1>
              <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
                We collaborate with consumer brands, WhatsApp TVs, Snapchat creators, digital agencies, and campus ambassadors to drive verified handle additions and direct messaging conversations.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href="#partner-apply"
                  className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-extrabold transition-colors"
                >
                  Submit Partnership Proposal
                </a>
                <a
                  href="mailto:partnerships@addmeup.ng?subject=AddMeUp%20Partnership%20Inquiry"
                  className="px-5 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
                >
                  <Mail className="w-4 h-4 text-orange-600" />
                  <span>partnerships@addmeup.ng</span>
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-slate-900 font-extrabold text-sm">
                <Handshake className="w-5 h-5 text-orange-500" />
                <span>Direct Partner Desk</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Want fast campaign turnaround or a custom sponsorship rate card? Reach our partnerships desk directly by email or WhatsApp.
              </p>
              <div className="space-y-2.5 pt-1 text-xs">
                <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-500 font-semibold">Official Partner Email</p>
                    <p className="font-bold text-slate-900 truncate">partnerships@addmeup.ng</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyEmail('partner-top', 'partnerships@addmeup.ng')}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-orange-300 rounded-lg font-bold text-slate-700 flex items-center gap-1 shrink-0"
                  >
                    {copiedId === 'partner-top' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <a
                  href={OFFICIAL_WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100/70 transition-colors"
                >
                  <div>
                    <p className="text-[11px] text-emerald-800 font-semibold">WhatsApp Business Line</p>
                    <p className="font-bold text-emerald-950">{OFFICIAL_WHATSAPP_NUMBER}</p>
                  </div>
                  <MessageCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                </a>
              </div>
            </div>
          </section>

          {/* Partnership Programs — Asymmetric Bento Grid */}
          <section className="space-y-6">
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Partnership tracks we offer
              </h2>
              <p className="text-sm text-slate-600">
                Choose the format that fits your brand, creator channel, or marketing agency.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
                <p className="text-xs font-bold text-orange-600">01. Brand &amp; Product Sponsorships</p>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Pinned feed takeovers and direct WhatsApp lead campaigns
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Feature your fintech app, e-commerce store, fashion drop, or entertainment event at the top of the AddMeUp feed with VIP placement, verified click tracking, and direct WhatsApp customer routing.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
                <p className="text-xs font-bold text-orange-600">02. Snapchat &amp; WhatsApp TVs</p>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Cross-promotions &amp; creator grants
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Active story creators and WhatsApp TVs receive promotional point grants in exchange for featured shoutouts and verified community swaps.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
                <p className="text-xs font-bold text-orange-600">03. Campus Ambassadors</p>
                <h3 className="text-lg font-extrabold text-slate-900">
                  University leads &amp; student reps
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Represent AddMeUp on your campus, onboard student creators and vendors through your referral link, and earn recurring monthly bonuses.
                </p>
              </div>

              <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
                <p className="text-xs font-bold text-orange-600">04. Agency &amp; Reseller Bulk Packages</p>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Volume point bundles for client management teams
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Social media managers and PR agencies running handle growth for multiple business clients can request discounted bulk point allocations and priority moderation clearance.
                </p>
              </div>
            </div>
          </section>

          {/* Partnership Application Form */}
          <section
            id="partner-apply"
            className="bg-white border border-orange-200/90 rounded-3xl p-6 sm:p-10 shadow-sm"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-3">
                <p className="text-xs font-bold text-orange-600">Apply Online</p>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Start a partnership conversation
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Send your proposal directly from this page. Your submission emails our partnerships desk immediately and sends a confirmation receipt to your inbox.
                </p>
                <div className="pt-2 space-y-1.5 text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">Direct email: partnerships@addmeup.ng</p>
                  <p>Typical response window: within 24 hours</p>
                </div>
              </div>

              <form onSubmit={handleInquirySubmit} className="lg:col-span-8 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Tunde Adebayo"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Work or Creator Email *
                    </label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="you@brand.com"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Partnership Track
                    </label>
                    <select
                      value={
                        ['partnership', 'creator', 'ambassador'].includes(formCategory)
                          ? formCategory
                          : 'partnership'
                      }
                      onChange={(e) =>
                        setFormCategory(e.target.value as ContactInquiryPayload['category'])
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                    >
                      <option value="partnership">Brand Sponsorship / Agency</option>
                      <option value="creator">Creator / WhatsApp TV</option>
                      <option value="ambassador">Campus Ambassador</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Brand / Channel Name
                    </label>
                    <input
                      type="text"
                      value={formOrg}
                      onChange={(e) => setFormOrg(e.target.value)}
                      placeholder="e.g. Lagos Vibes TV"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Snapchat / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={formHandle}
                      onChange={(e) => setFormHandle(e.target.value)}
                      placeholder="@handle or +234..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Estimated Audience Size or Monthly Budget (Optional)
                  </label>
                  <input
                    type="text"
                    value={formBudget}
                    onChange={(e) => setFormBudget(e.target.value)}
                    placeholder="e.g. 15,000 daily viewers or ₦50,000 / month"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Proposal Details *
                  </label>
                  <textarea
                    rows={4}
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    placeholder="Tell us about your audience, campaign goals, and preferred start date..."
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {submitError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                )}

                {submitSuccess && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{submitSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition-colors flex items-center gap-2 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Proposal...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-orange-400" />
                      <span>Send Partnership Inquiry</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </section>
        </div>
      )}

      {/* ============================ CONTACT PAGE ============================ */}
      {page === 'contact' && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-12">
          <section className="max-w-3xl space-y-4">
            <p className="text-xs font-bold text-orange-600 tracking-wide">
              Contact &amp; Official Emails · addmeup.ng
            </p>
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Official AddMeUp Email Desks &amp; Support
            </h1>
            <p className="text-base text-slate-600 leading-relaxed">
              Reach the exact desk for account help, Paystack receipts, brand partnerships, or safety reports.
            </p>
          </section>

          {/* Official @addmeup.ng Email Directory */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {OFFICIAL_EMAILS.map((desk) => (
              <div
                key={desk.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-orange-600">{desk.label}</p>
                  <p className="text-base font-black text-slate-900 break-all">{desk.address}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{desk.purpose}</p>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <p className="text-[11px] text-slate-500 font-medium">{desk.responseSla}</p>
                  <div className="flex items-center gap-2">
                    <a
                      href={`mailto:${desk.address}`}
                      className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold text-center transition-colors"
                    >
                      Send Email
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyEmail(desk.id, desk.address)}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      {copiedId === desk.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* WhatsApp Desk Card */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 flex flex-col justify-between gap-4">
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-emerald-700">Live Human Desk</p>
                <p className="text-base font-black text-emerald-950">{OFFICIAL_WHATSAPP_NUMBER}</p>
                <p className="text-xs text-emerald-900/80 leading-relaxed">
                  Fastest channel for urgent deposit checks, boost requests, or live creator onboarding on WhatsApp.
                </p>
              </div>
              <a
                href={OFFICIAL_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </section>

          {/* Direct Web Inquiry Form */}
          <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm">
            <div className="max-w-3xl space-y-6">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-black text-slate-900">Send us a direct message</h2>
                <p className="text-sm text-slate-600">
                  Prefer submitting right here? Fill out this form and Resend delivers your message straight to our inbox with a confirmation copy to your email.
                </p>
              </div>

              <form onSubmit={handleInquirySubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Your Name *</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Your name"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Your Email *</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Department / Topic</label>
                    <select
                      value={formCategory}
                      onChange={(e) =>
                        setFormCategory(e.target.value as ContactInquiryPayload['category'])
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                    >
                      <option value="support">Account &amp; User Support (support@addmeup.ng)</option>
                      <option value="billing">Billing &amp; Paystack Receipts (receipts@addmeup.ng)</option>
                      <option value="partnership">Partnerships &amp; Sponsors (partnerships@addmeup.ng)</option>
                      <option value="general">General Feedback (hello@addmeup.ng)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Account Handle or Paystack Reference (Optional)
                    </label>
                    <input
                      type="text"
                      value={formHandle}
                      onChange={(e) => setFormHandle(e.target.value)}
                      placeholder="@snap_handle or AMU-REF"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Message *</label>
                  <textarea
                    rows={4}
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    placeholder="How can our team help you today?"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {submitError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                )}

                {submitSuccess && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{submitSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-extrabold transition-colors flex items-center gap-2 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Message...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </section>
        </div>
      )}

      {/* ============================== FAQ PAGE ============================== */}
      {page === 'faq' && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-10">
          <section className="space-y-4">
            <p className="text-xs font-bold text-orange-600 tracking-wide">Help Center &amp; FAQ</p>
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Frequently Asked Questions
            </h1>
            <p className="text-base text-slate-600">
              Clear answers about points, handle verification, Paystack deposits, account recovery, and safety rules.
            </p>
          </section>

          {/* Search & Topic Tabs */}
          <section className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={faqQuery}
                onChange={(e) => setFaqQuery(e.target.value)}
                placeholder="Search questions (e.g. Paystack, timer, boost, delete account)..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl w-fit">
              {[
                { id: 'all', label: 'All Topics' },
                { id: 'started', label: 'Getting Started' },
                { id: 'points', label: 'Points & Earning' },
                { id: 'payments', label: 'Payments' },
                { id: 'safety', label: 'Safety' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFaqFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                    faqFilter === tab.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </section>

          {/* Accordion List */}
          <section className="space-y-3">
            {filteredFaqs.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
                <p className="text-sm font-bold text-slate-900">No matching answers found</p>
                <p className="text-xs text-slate-500">
                  Email <a href="mailto:support@addmeup.ng" className="text-orange-600 font-bold underline">support@addmeup.ng</a> or message WhatsApp support for quick help.
                </p>
              </div>
            ) : (
              filteredFaqs.map((item) => {
                const isOpen = openFaqId === item.id;
                return (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqId(isOpen ? '' : item.id)}
                      className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-bold text-orange-600">
                          {item.categoryLabel}
                        </p>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                          {item.question}
                        </h3>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
                          isOpen ? 'rotate-180 text-orange-600' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </section>

          {/* Still Need Help Banner */}
          <section className="bg-white border border-orange-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-slate-900">
                  Still have a question for our team?
                </h3>
                <p className="text-xs text-slate-600">
                  Email <a href="mailto:support@addmeup.ng" className="text-orange-600 font-bold underline">support@addmeup.ng</a> or submit a message directly on our Contact page.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('contact')}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold whitespace-nowrap shrink-0"
            >
              Contact Support
            </button>
          </section>
        </div>
      )}
    </PublicLayout>
  );
};
