import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldCheck, 
  Check, 
  Trash2, 
  Search, 
  ExternalLink,
  Clock,
  UserX,
  CheckCircle2
} from 'lucide-react';
import { AdReport } from '../../../types';
import { AdminPagination } from '../AdminPagination';

interface AdminReportsPageProps {
  reports: AdReport[];
  onResolveReport: (report: AdReport, deleteAd?: boolean) => Promise<void>;
  actionInProgress: string | null;
}

export const AdminReportsPage: React.FC<AdminReportsPageProps> = ({
  reports,
  onResolveReport,
  actionInProgress,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('pending');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredReports = reports.filter(r => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchReason = (r.reason || '').toLowerCase().includes(q);
      const matchDetails = (r.details || '').toLowerCase().includes(q);
      const matchAd = (r.adId || '').toLowerCase().includes(q);
      const matchReporter = (r.reporterUid || '').toLowerCase().includes(q);
      if (!matchReason && !matchDetails && !matchAd && !matchReporter) return false;
    }

    if (filter === 'pending') return r.status === 'pending';
    if (filter === 'resolved') return r.status === 'reviewed' || r.status === 'dismissed';
    return true;
  });

  const paginatedReports = filteredReports.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const resolvedCount = reports.filter(r => r.status === 'reviewed' || r.status === 'dismissed').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-slate-400 font-medium">Total Reports Filed</p>
          <p className="text-2xl sm:text-3xl font-black text-white mt-1.5">{reports.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-slate-400 font-medium">Action Required</p>
          <p className={`text-2xl sm:text-3xl font-black mt-1.5 ${pendingCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
            {pendingCount}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-slate-400 font-medium">Resolved & Dismissed</p>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1.5">{resolvedCount}</p>
        </div>
      </div>

      {/* Reports Queue */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => { setFilter('pending'); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === 'pending'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => { setFilter('resolved'); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === 'resolved'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Resolved ({resolvedCount})
            </button>
            <button
              onClick={() => { setFilter('all'); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({reports.length})
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reason, details, ad ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>
        </div>

        {/* Reports List */}
        <div className="space-y-3">
          {paginatedReports.map((report) => {
            const isWorking = actionInProgress === report.reportId;
            const isPending = report.status === 'pending';

            return (
              <div
                key={report.reportId}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isPending
                    ? 'bg-slate-950 border-rose-500/30'
                    : 'bg-slate-950/60 border-slate-800/80 opacity-75'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Info */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-black uppercase tracking-wider">
                        {report.reason || 'Flagged Ad'}
                      </span>

                      {isPending ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                          Pending Review
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Resolved</span>
                        </span>
                      )}

                      <span className="text-[11px] text-slate-500">
                        {new Date(report.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white">
                      Target Ad ID: <span className="text-orange-400 font-mono">{report.adId}</span>
                    </h4>

                    {report.details && (
                      <p className="text-xs text-slate-300 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                        "{report.details}"
                      </p>
                    )}

                    <p className="text-[11px] text-slate-500">
                      Reported by user <span className="text-slate-400 font-mono">{report.reporterUid.slice(0, 10)}...</span>
                      {report.reportedUserId && (
                        <span> • Target user <span className="text-slate-400 font-mono">{report.reportedUserId.slice(0, 10)}...</span></span>
                      )}
                    </p>
                  </div>

                  {/* Right: Actions */}
                  {isPending && (
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => onResolveReport(report, false)}
                        disabled={isWorking}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all disabled:opacity-50"
                      >
                        Dismiss
                      </button>

                      <button
                        onClick={() => onResolveReport(report, true)}
                        disabled={isWorking}
                        className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-rose-600/20 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Take Down Ad</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filteredReports.length === 0 && (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <ShieldCheck className="w-9 h-9 text-emerald-500/60 mx-auto" />
              <p className="text-xs font-bold text-slate-300">All caught up! No reports pending action.</p>
              <p className="text-[11px] text-slate-500">Community flagged campaigns will appear here for administrative decision.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        <AdminPagination
          currentPage={currentPage}
          totalItems={filteredReports.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};
