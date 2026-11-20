import React, { useEffect, useState } from 'react';
import { 
  Settings, 
  Coins, 
  Flame, 
  Clock, 
  ShieldAlert, 
  Gift, 
  CheckCircle2, 
  ExternalLink,
  Copy,
  Check,
  KeyRound,
  Zap,
  Mail,
  Send,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { UserProfile } from '../../../types';
import { sendDiagnosticTestEmail } from '../../../lib/emails';

interface AdminSettingsPageProps {
  currentProfile?: UserProfile;
  onToast?: (msg: string) => void;
}

export const AdminSettingsPage: React.FC<AdminSettingsPageProps> = ({
  currentProfile,
  onToast,
}) => {
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<{
    loading: boolean;
    resendEmail?: boolean;
    firebaseAdmin?: boolean;
    hasPaystackSecret?: boolean;
    serverReachable?: boolean;
  }>({ loading: true });

  const [testEmailTo, setTestEmailTo] = useState(currentProfile?.email || 'heisgag1@gmail.com');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/health')
      .then(async (r) => {
        const text = await r.text();
        const data = JSON.parse(text);
        if (active) {
          setHealthStatus({
            loading: false,
            resendEmail: Boolean(data.resendEmail),
            firebaseAdmin: Boolean(data.firebaseAdmin),
            hasPaystackSecret: Boolean(data.hasPaystackSecret),
            serverReachable: true,
          });
        }
      })
      .catch(() => {
        if (active) {
          setHealthStatus({ loading: false, serverReachable: false });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailTo.trim() || !testEmailTo.includes('@')) {
      setTestResult({ ok: false, message: 'Enter a valid email address.' });
      return;
    }
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await sendDiagnosticTestEmail(testEmailTo.trim());
      if (res.success || res.sent) {
        const msg = `Test email sent to ${testEmailTo.trim()}${res.id ? ` (ID: ${res.id})` : ''}. Check inbox or spam folder.`;
        setTestResult({ ok: true, message: msg });
        onToast?.('Test email sent via Resend!');
      } else {
        const reason = res.reason || res.message || 'RESEND_API_KEY not configured on the server.';
        setTestResult({
          ok: false,
          message: reason === 'RESEND_API_KEY not configured'
            ? 'RESEND_API_KEY is missing in your server environment variables. Add RESEND_API_KEY on Render (or AI Studio secrets) and redeploy.'
            : reason,
        });
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err?.message || 'Failed to contact email API.' });
    } finally {
      setSendingTest(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedDomain(text);
    setTimeout(() => setCopiedDomain(null), 2500);
  };

  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'ais-dev-vstm4wlpu75m6g23r5gqkz-72984926906.europe-west2.run.app';
  const sharedDomain = 'ais-pre-vstm4wlpu75m6g23r5gqkz-72984926906.europe-west2.run.app';

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Resend Transactional Email Diagnostics & Test Dispatch */}
      <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-7 space-y-5 shadow-lg shadow-emerald-500/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Resend Transactional Emails (addmeup.ng)</h3>
              <p className="text-xs text-slate-400">
                Live server readiness check &amp; 1-click delivery test from <code className="text-emerald-300">noreply@addmeup.ng</code>
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-black w-fit ${
              healthStatus.loading
                ? 'bg-slate-800 border-slate-700 text-slate-300'
                : healthStatus.resendEmail
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            {healthStatus.loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : healthStatus.resendEmail ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            <span>
              {healthStatus.loading
                ? 'Checking Server...'
                : healthStatus.resendEmail
                ? 'RESEND_API_KEY Active'
                : 'RESEND_API_KEY Not Set in Env'}
            </span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
            <span className="text-slate-400 font-semibold">Express Backend</span>
            <span className={`font-black ${healthStatus.serverReachable ? 'text-emerald-400' : 'text-rose-400'}`}>
              {healthStatus.loading ? '...' : healthStatus.serverReachable ? 'Connected' : 'Unreachable'}
            </span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
            <span className="text-slate-400 font-semibold">RESEND_API_KEY</span>
            <span className={`font-black ${healthStatus.resendEmail ? 'text-emerald-400' : 'text-amber-300'}`}>
              {healthStatus.loading ? '...' : healthStatus.resendEmail ? 'Configured' : 'Missing'}
            </span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
            <span className="text-slate-400 font-semibold">Firebase Admin (Reset Links)</span>
            <span className={`font-black ${healthStatus.firebaseAdmin ? 'text-emerald-400' : 'text-slate-400'}`}>
              {healthStatus.loading ? '...' : healthStatus.firebaseAdmin ? 'Active' : 'Client Fallback'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSendTestEmail} className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="email"
              value={testEmailTo}
              onChange={(e) => setTestEmailTo(e.target.value)}
              placeholder="Recipient email (e.g. heisgag1@gmail.com)"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={sendingTest}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{sendingTest ? 'Sending...' : 'Send Test Email'}</span>
            </button>
          </div>

          {testResult && (
            <div
              className={`rounded-xl px-3.5 py-2.5 text-xs border ${
                testResult.ok
                  ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-500/30 text-amber-200'
              }`}
            >
              {testResult.message}
            </div>
          )}

          {!healthStatus.loading && !healthStatus.resendEmail && (
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Next step: Copy your <strong className="text-slate-200">re_...</strong> API key from Resend Dashboard → API Keys and add it as <code className="text-amber-300">RESEND_API_KEY</code> in your Render Environment Variables (then redeploy <code className="text-slate-200">addmeup.ng</code>). Welcome, Deposit Receipt, Withdrawal, Password Reset, and Password Change emails will automatically send.
            </p>
          )}
        </form>
      </div>

      {/* Google Authentication & Firebase Console Setup */}
      <div className="bg-slate-900 border border-orange-500/30 rounded-3xl p-6 sm:p-7 space-y-5 shadow-lg shadow-orange-500/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Google Authentication & Domain Setup</h3>
              <p className="text-xs text-slate-400">
                Direct links & domain configuration for Project <span className="text-orange-400 font-mono font-bold">addmeup-95897</span>
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-black w-fit">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Configured & Ready</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Step 1: Enable Google Sign-In Provider */}
          <div className="bg-slate-950/90 p-5 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-md inline-block">
                Step 1 • Enable Google Provider
              </span>
              <h4 className="text-sm font-black text-white">Google Sign-In Provider</h4>
              <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>Click the button below to open your Sign-in Providers console.</li>
                <li>Click <strong className="text-slate-200">Add new provider</strong> (or select <strong className="text-slate-200">Google</strong>).</li>
                <li>Toggle <strong className="text-emerald-400">Enable</strong> on and pick your project support email (<code className="text-slate-200">heisgag1@gmail.com</code>).</li>
                <li>Click <strong className="text-slate-200">Save</strong>.</li>
              </ol>
            </div>

            <a
              href="https://console.firebase.google.com/project/addmeup-95897/authentication/providers"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <span>1. Open Sign-In Providers Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Step 2: Add Authorized Domains */}
          <div className="bg-slate-950/90 p-5 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
            <div className="space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md inline-block">
                Step 2 • Authorize App Domains
              </span>
              <h4 className="text-sm font-black text-white">Whitelist Your App URLs for Google Popup</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                In <strong className="text-slate-200">Authentication → Settings → Authorized domains</strong>, click <strong className="text-slate-200">Add domain</strong> and paste these domains:
              </p>

              {/* Copyable Domain 1 */}
              <div className="flex items-center justify-between gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                <code className="text-[11px] font-mono text-amber-300 truncate">{currentDomain}</code>
                <button
                  type="button"
                  onClick={() => copyText(currentDomain)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1 flex-shrink-0"
                >
                  {copiedDomain === currentDomain ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDomain === currentDomain ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Copyable Domain 2 */}
              {currentDomain !== sharedDomain && (
                <div className="flex items-center justify-between gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <code className="text-[11px] font-mono text-emerald-300 truncate">{sharedDomain}</code>
                  <button
                    type="button"
                    onClick={() => copyText(sharedDomain)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1 flex-shrink-0"
                  >
                    {copiedDomain === sharedDomain ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedDomain === sharedDomain ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}
            </div>

            <a
              href="https://console.firebase.google.com/project/addmeup-95897/authentication/settings"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <span>2. Open Firebase Authorized Domains</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
      {/* Economic Parameters Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">System Rules & Tokenomics Parameters</h3>
            <p className="text-xs text-slate-400">
              Core economic rates governing user rewards, campaign publishing fees and verification timers
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {/* Reward per Add */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Friend Add Reward
              </span>
              <Coins className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-400 font-mono">+5 Pts</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Credited automatically to the claimant upon verified addition of friend or business contact.
            </p>
          </div>

          {/* VIP Boost Cost */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                24h VIP Boost Rate
              </span>
              <Flame className="w-4 h-4 text-orange-400" />
            </div>
            <p className="text-2xl font-black text-orange-400 font-mono">30 Pts</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Pinning duration on the top featured VIP carousel with exclusive fire gradient badge.
            </p>
          </div>

          {/* Auto Approval Timer */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Auto-Approval Window
              </span>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-black text-blue-400 font-mono">24 Hours</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              If an ad poster does not manually dispute or verify within 24h, the claimant is credited.
            </p>
          </div>

          {/* Minimum Campaign */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Base Post Duration
              </span>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400 font-mono">10 Pts (6 Hours)</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Tiers: 15 Pts (12h), 25 Pts (24h), 50 Pts (7 days), 150 Pts (30 days maximum).
            </p>
          </div>

          {/* Daily Streak Bonus */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Daily Check-in Streaks
              </span>
              <Gift className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-black text-purple-400 font-mono">+1 to +10 Pts</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Ascending ladder bonus rewarding users every 24 hours for consistent logins.
            </p>
          </div>

          {/* Paystack Gateways */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Paystack Currency
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-white font-mono">NGN (₦)</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              All fiat top-up packages settle in Nigerian Naira through the active live Paystack gateway.
            </p>
          </div>
        </div>
      </div>

      {/* Security & Access Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">Privileged Admin Governance</h3>
            <p className="text-xs text-slate-400">
              Role-Based Access Control (RBAC) rules enforced across Firestore security rules
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800/90 space-y-2 text-xs text-slate-300 leading-relaxed">
          <p>
            Super administrator privileges are permanently bound to owner account <strong className="text-white font-mono">heisgag1@gmail.com</strong>.
          </p>
          <p className="text-slate-400">
            Admins have full authority to adjust point balances with audit trails, toggle account bans, unpublish offensive campaigns, and resolve community safety tickets. All actions are authenticated directly against Cloud Firestore security rules.
          </p>
        </div>
      </div>
    </div>
  );
};
