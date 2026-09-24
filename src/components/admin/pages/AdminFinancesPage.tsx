import React, { useState } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  CreditCard, 
  ShieldCheck, 
  AlertCircle, 
  Search, 
  Calendar, 
  Receipt, 
  ArrowUpRight, 
  ExternalLink,
  CheckCircle2,
  Copy,
  Banknote
} from 'lucide-react';
import { Transaction } from '../../../types';
import { AdminPagination } from '../AdminPagination';

interface AdminFinancesPageProps {
  financialStats: {
    grossRevenueNgn: number;
    netProfitNgn: number;
    paystackFeesNgn: number;
    liveDepositsCount: number;
    paidCreditsIssued: number;
    averageDepositNgn: number;
    testDepositsCount: number;
    liveDeposits: Transaction[];
  };
  onToast: (msg: string) => void;
}

export const AdminFinancesPage: React.FC<AdminFinancesPageProps> = ({
  financialStats,
  onToast,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'high_value'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    onToast(`Copied ${label} to clipboard!`);
  };

  const filteredDeposits = financialStats.liveDeposits.filter(t => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchRef = (t.referenceId || '').toLowerCase().includes(q);
      const matchUser = (t.userId || '').toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      if (!matchRef && !matchUser && !matchDesc) return false;
    }

    if (filterType === 'high_value') {
      return Number(t.amountNgn || 0) >= 3000;
    }

    return true;
  });

  const paginatedDeposits = filteredDeposits.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const profitMarginPercent = financialStats.grossRevenueNgn > 0
    ? ((financialStats.netProfitNgn / financialStats.grossRevenueNgn) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-white">Live Paystack Production Clearinghouse</h2>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                Active Gateway
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Real-time settlement profit calculations. Sandbox tests have been removed from accounting ledgers so your net margins reflect real revenue deposited through your Paystack account.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/80 px-4 py-3 rounded-2xl border border-slate-800 self-start md:self-center">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Currency</span>
            <span className="text-sm font-black text-emerald-400 font-mono">NGN (₦)</span>
          </div>
        </div>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2 group">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Gross Revenue</span>
            <Banknote className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono tracking-tight">
            ₦{financialStats.grossRevenueNgn.toLocaleString('en-NG')}
          </div>
          <p className="text-[11px] text-slate-400">
            Collected across <strong className="text-slate-200">{financialStats.liveDepositsCount}</strong> live deposits
          </p>
        </div>

        {/* Net Profit */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2 group">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Estimated Net Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
            ₦{financialStats.netProfitNgn.toLocaleString('en-NG')}
          </div>
          <p className="text-[11px] text-slate-400">
            Margin: <strong className="text-emerald-400 font-black">{profitMarginPercent}%</strong> of gross revenue
          </p>
        </div>

        {/* Processing Fees */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2 group">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Paystack Gateway Fees</span>
            <Receipt className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-300 font-mono tracking-tight">
            ₦{financialStats.paystackFeesNgn.toLocaleString('en-NG')}
          </div>
          <p className="text-[11px] text-slate-400">
            Standard 1.5% + ₦100 fee per deposit
          </p>
        </div>

        {/* Average Deposit */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2 group">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Average Ticket Size</span>
            <CreditCard className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-300 font-mono tracking-tight">
            ₦{financialStats.averageDepositNgn.toLocaleString('en-NG')}
          </div>
          <p className="text-[11px] text-slate-400">
            +{financialStats.paidCreditsIssued.toLocaleString()} total points sold
          </p>
        </div>
      </div>

      {/* Financial Operations & Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-white">Live Paystack Settlement Ledger</h3>
            <p className="text-xs text-slate-400">
              Audit log of verified customer credit purchases with reference IDs
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Filter buttons */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => { setFilterType('all'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterType === 'all'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({financialStats.liveDeposits.length})
              </button>
              <button
                onClick={() => { setFilterType('high_value'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterType === 'high_value'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Large (≥₦3,000)
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Reference or User..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto border border-slate-800/80 rounded-2xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer UID</th>
                <th className="py-3 px-4">Amount Paid (NGN)</th>
                <th className="py-3 px-4">Points Added</th>
                <th className="py-3 px-4">Gateway</th>
                <th className="py-3 px-4">Paystack Reference</th>
                <th className="py-3 px-4 text-right">Settlement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {paginatedDeposits.map((t) => (
                <tr key={t.transactionId} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                    {new Date(t.createdAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-slate-200" title={t.userId}>
                        {t.userId.slice(0, 10)}...
                      </span>
                      <button
                        onClick={() => copyToClipboard(t.userId, 'User UID')}
                        className="text-slate-500 hover:text-white transition-colors"
                        title="Copy User ID"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-black text-emerald-400 text-sm">
                    ₦{(t.amountNgn || 0).toLocaleString('en-NG')}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                    +{t.amount} Pts
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0ba4db] bg-[#0ba4db]/10 px-2 py-0.5 rounded-full border border-[#0ba4db]/20">
                      Paystack
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                      <span>{t.referenceId || 'N/A'}</span>
                      {t.referenceId && (
                        <button
                          onClick={() => copyToClipboard(t.referenceId!, 'Reference')}
                          className="text-slate-500 hover:text-white transition-colors"
                          title="Copy reference code"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-flex items-center gap-1 bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-1 rounded-full text-[10px] font-extrabold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Live Succeeded</span>
                    </span>
                  </td>
                </tr>
              ))}

              {filteredDeposits.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 space-y-3">
                    <Banknote className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-sm font-bold text-slate-300">No live transactions found.</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      {search ? 'Try clearing your search query to see all deposits.' : 'Live transactions from Paystack will appear here with automated profit analysis as users top up their wallets.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <AdminPagination
          currentPage={currentPage}
          totalItems={filteredDeposits.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};
