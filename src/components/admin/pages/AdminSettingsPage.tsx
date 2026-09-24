import React from 'react';
import { 
  Settings, 
  Coins, 
  Flame, 
  Clock, 
  ShieldAlert, 
  Gift, 
  CheckCircle2, 
  Database,
  Lock,
  Zap
} from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
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
