import React from 'react';
import { PublicLayout } from './PublicLayout';
import {
  OFFICIAL_WHATSAPP_NUMBER,
  OFFICIAL_WHATSAPP_URL,
  PublicPageId,
} from '../lib/contactConfig';
import { Shield, FileText, Lock, Mail, MessageCircle } from 'lucide-react';

interface LegalPageProps {
  page: 'privacy' | 'terms';
  onNavigate: (page: 'home' | PublicPageId) => void;
  onPrimaryCta: () => void;
  primaryCtaLabel?: string;
}

export const LegalPage: React.FC<LegalPageProps> = ({
  page,
  onNavigate,
  onPrimaryCta,
  primaryCtaLabel = 'Open App',
}) => {
  const effectiveDate = 'September 26, 2026';
  const appOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://addmeup.ng';

  return (
    <PublicLayout
      activePage={page}
      onNavigate={onNavigate}
      onPrimaryCta={onPrimaryCta}
      primaryCtaLabel={primaryCtaLabel}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        {/* Segmented Switcher between Legal Docs */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl">
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('privacy');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-colors whitespace-nowrap shrink-0 ${
                page === 'privacy'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('terms');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-colors whitespace-nowrap shrink-0 ${
                page === 'terms'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Terms of Service
            </a>
          </div>

          <a
            href="/contact"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('contact');
            }}
            className="text-xs font-bold text-orange-600 hover:underline"
          >
            Official Emails &amp; Contact Desk →
          </a>
        </div>

        <div className="bg-white border border-orange-200/80 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
          {page === 'privacy' ? (
            <>
              {/* Privacy Policy Header */}
              <div className="border-b border-slate-200 pb-6 space-y-3">
                <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Google OAuth &amp; User Data Compliance</span>
                </p>
                <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  Privacy Policy
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Last Updated &amp; Effective Date: {effectiveDate} · Application:{' '}
                  <strong>AddMeUp</strong> ({appOrigin})
                </p>
              </div>

              {/* Privacy Policy Sections */}
              <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
                <section className="space-y-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900">1. Overview</h2>
                  <p>
                    Welcome to <strong>AddMeUp</strong> ("we", "our", or "us"). AddMeUp operates
                    a social handle exchange and promotional discovery platform for Snapchat and
                    WhatsApp users. This Privacy Policy explains how we collect, use, store, and
                    protect your personal information when you sign in with Google Sign-In (Google
                    OAuth 2.0), Email/Password authentication, or interact with our services.
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    2. Information We Collect (Including Google Sign-In Data)
                  </h2>
                  <p>
                    When you register or sign in to AddMeUp, we collect only the minimum
                    information required to operate your account:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 font-medium text-slate-700">
                    <li>
                      <strong>Google Account Basic Profile Information:</strong> When you choose
                      "Continue with Google", we receive your basic Google profile details authorized
                      by you via Google OAuth (specifically your <strong>email address</strong>,{' '}
                      <strong>display name</strong>, <strong>profile picture URL</strong>, and
                      unique account identifier). We do not request access to your private Google
                      Workspace files, contacts, or emails.
                    </li>
                    <li>
                      <strong>Social Handles You Voluntarily Share:</strong> Any Snapchat username
                      or WhatsApp phone number you explicitly submit when posting an ad or updating
                      your profile.
                    </li>
                    <li>
                      <strong>Platform Activity &amp; Verification Data:</strong> Point balances,
                      daily streak check-ins, ad listings, and screenshot proof submissions uploaded
                      to verify handle additions.
                    </li>
                    <li>
                      <strong>Payment Metadata:</strong> When you purchase promotional points via
                      Paystack, payment processing is handled directly by Paystack. We only store
                      the transaction reference, amount paid, and points credited—never your card
                      details or banking credentials.
                    </li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    3. How We Use Your Information
                  </h2>
                  <p>We use the collected information strictly for the following purposes:</p>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                      To authenticate your identity and maintain your secure user session via
                      AddMeUp's encrypted authentication infrastructure.
                    </li>
                    <li>
                      To display your chosen display name, avatar, and social handle on ads you
                      intentionally publish to the AddMeUp feed.
                    </li>
                    <li>
                      To manage your promotional points wallet, referral bonuses, and ad boosts.
                    </li>
                    <li>
                      To send transactional account receipts and security notifications via{' '}
                      <strong>addmeup.ng</strong>.
                    </li>
                    <li>
                      To prevent spam, fraud, or abuse of the community verification system.
                    </li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    4. Google API Services User Data Policy Disclosure
                  </h2>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm space-y-2">
                    <p className="font-semibold text-slate-900 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Strict Protection of Google User Data</span>
                    </p>
                    <p>
                      AddMeUp's use and transfer of information received from Google APIs adhere
                      strictly to the{' '}
                      <a
                        href="https://developers.google.com/terms/api-services-user-data-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-600 font-bold underline"
                      >
                        Google API Services User Data Policy
                      </a>
                      , including the Limited Use requirements. We never sell, rent, or share your
                      Google email address or non-public personal data with third-party advertisers
                      or data brokers.
                    </p>
                  </div>
                </section>

                <section className="space-y-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    5. Data Storage, Security &amp; Retention
                  </h2>
                  <p>
                    Your account data is securely stored within AddMeUp's cloud database with
                    encrypted HTTPS transport, access controls, and security rules. Public feed
                    listings only show the social handle and display name you choose to publish.
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    6. Your Rights &amp; Data Deletion
                  </h2>
                  <p>
                    You may update your profile handles, remove your active ads at any time from the
                    "My Ads" dashboard, or request complete deletion of your account and associated
                    data by emailing{' '}
                    <a
                      href="mailto:support@addmeup.ng?subject=Account%20Data%20Deletion%20Request"
                      className="text-orange-600 font-bold underline"
                    >
                      support@addmeup.ng
                    </a>
                    .
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    7. Contact Us
                  </h2>
                  <p>
                    If you have questions about this Privacy Policy or wish to request account data
                    deletion, please contact us via email or WhatsApp:
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href="mailto:support@addmeup.ng"
                      className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 px-4 py-2.5 rounded-xl text-xs font-extrabold text-orange-950 hover:bg-orange-100 transition-colors"
                    >
                      <Mail className="w-4 h-4 text-orange-600" />
                      <span>support@addmeup.ng</span>
                    </a>
                    <a
                      href="mailto:security@addmeup.ng"
                      className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-extrabold text-slate-900 hover:bg-slate-200 transition-colors"
                    >
                      <Mail className="w-4 h-4 text-slate-700" />
                      <span>security@addmeup.ng</span>
                    </a>
                    <a
                      href={OFFICIAL_WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl text-xs font-extrabold text-emerald-950 hover:bg-emerald-100 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      <span>WhatsApp Support ({OFFICIAL_WHATSAPP_NUMBER})</span>
                    </a>
                  </div>
                </section>
              </div>
            </>
          ) : (
            <>
              {/* Terms of Service Header */}
              <div className="border-b border-slate-200 pb-6 space-y-3">
                <p className="text-xs font-bold text-orange-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-orange-600" />
                  <span>Platform Rules &amp; Terms of Use</span>
                </p>
                <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  Terms of Service
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Last Updated &amp; Effective Date: {effectiveDate} · Application:{' '}
                  <strong>AddMeUp</strong> ({appOrigin})
                </p>
              </div>

              {/* Terms of Service Sections */}
              <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
                <section className="space-y-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    1. Acceptance of Terms
                  </h2>
                  <p>
                    By accessing or using <strong>AddMeUp</strong>, signing in with Google or
                    Email, or posting social handles on our platform, you agree to be bound by these
                    Terms of Service and our Privacy Policy.
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    2. Description of Service
                  </h2>
                  <p>
                    AddMeUp is an independent social discovery and handle exchange directory that
                    allows users to share their Snapchat usernames and WhatsApp contact numbers,
                    discover other community members, and earn or purchase promotional points to
                    boost visibility on the feed. AddMeUp is not affiliated with, endorsed by, or
                    sponsored by Snap Inc. (Snapchat) or Meta Platforms, Inc. (WhatsApp).
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    3. User Conduct &amp; Fair Play Rules
                  </h2>
                  <p>To keep AddMeUp safe and authentic for all members, you agree NOT to:</p>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                      Post another person's Snapchat handle or WhatsApp phone number without their
                      explicit permission.
                    </li>
                    <li>
                      Submit fake, edited, or misleading verification screenshots to claim
                      promotional points without genuinely adding the user.
                    </li>
                    <li>
                      Publish illegal, adult/explicit, fraudulent, harassing, or scam content in ad
                      descriptions.
                    </li>
                    <li>
                      Use automated bots, scripts, or multiple fake accounts to exploit welcome
                      bonuses or referral rewards.
                    </li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    4. Promotional Points &amp; Payments
                  </h2>
                  <p>
                    AddMeUp Points ("Pts") are virtual promotional credits used solely within the
                    AddMeUp platform to publish or boost handle listings. Points have no cash value,
                    cannot be withdrawn for fiat currency, and are non-transferable outside the
                    platform. Deposits processed via Paystack are credited immediately upon
                    transaction verification.
                  </p>
                </section>

                <section className="space-y-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    5. Account Moderation &amp; Termination
                  </h2>
                  <p>
                    Administrators reserve the right to remove listings, reject fraudulent point
                    claims, or suspend accounts that violate our community guidelines or submit
                    false verification proofs.
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    6. Contact &amp; Support
                  </h2>
                  <p>
                    For support inquiries, billing assistance, partnerships, or abuse reports,
                    please contact:
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href="mailto:support@addmeup.ng"
                      className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 px-4 py-2.5 rounded-xl text-xs font-extrabold text-orange-950 hover:bg-orange-100 transition-colors"
                    >
                      <Mail className="w-4 h-4 text-orange-600" />
                      <span>support@addmeup.ng</span>
                    </a>
                    <a
                      href="mailto:partnerships@addmeup.ng"
                      className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-extrabold text-slate-900 hover:bg-slate-200 transition-colors"
                    >
                      <Mail className="w-4 h-4 text-slate-700" />
                      <span>partnerships@addmeup.ng</span>
                    </a>
                    <a
                      href={OFFICIAL_WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl text-xs font-extrabold text-emerald-950 hover:bg-emerald-100 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      <span>WhatsApp Support ({OFFICIAL_WHATSAPP_NUMBER})</span>
                    </a>
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </div>
    </PublicLayout>
  );
};
