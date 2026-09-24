import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Search, 
  Image as ImageIcon, 
  X, 
  Check, 
  AlertCircle,
  Coins
} from 'lucide-react';
import { Claim } from '../../../types';
import { AdminPagination } from '../AdminPagination';

interface AdminClaimsPageProps {
  claims: Claim[];
  onForceApproveClaim: (claim: Claim) => Promise<void>;
  actionInProgress: string | null;
  onToast: (msg: string) => void;
}

export const AdminClaimsPage: React.FC<AdminClaimsPageProps> = ({
  claims,
  onForceApproveClaim,
  actionInProgress,
  onToast,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const filteredClaims = claims.filter(c => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchEarner = (c.claimerDisplayName || '').toLowerCase().includes(q);
      const matchAd = (c.adTitle || '').toLowerCase().includes(q);
      const matchId = c.claimId.toLowerCase().includes(q);
      const matchHandle = (c.claimerSnapchatHandle || c.verificationCode || '').toLowerCase().includes(q);
      if (!matchEarner && !matchAd && !matchId && !matchHandle) return false;
    }

    if (statusFilter === 'pending') return c.status === 'pending';
    if (statusFilter === 'verified') return c.status === 'verified';
    return true;
  });

  const paginatedClaims = filteredClaims.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const pendingCount = claims.filter(c => c.status === 'pending').length;
  const verifiedCount = claims.filter(c => c.status === 'verified').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-slate-400 font-medium">Total Proof Submissions</p>
          <p className="text-2xl sm:text-3xl font-black text-white mt-1.5">{claims.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-slate-400 font-medium">Pending Review</p>
          <p className="text-2xl sm:text-3xl font-black text-amber-400 mt-1.5">{pendingCount}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-slate-400 font-medium">Verified & Rewarded</p>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1.5">{verifiedCount}</p>
        </div>
      </div>

      {/* Main Claims Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status filters */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'all' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Claims ({claims.length})
            </button>
            <button
              onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'pending' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => { setStatusFilter('verified'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'verified' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Verified ({verifiedCount})
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search earner, campaign, ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
        </div>

        {/* Claims Table */}
        <div className="overflow-x-auto border border-slate-800/80 rounded-2xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Earner</th>
                <th className="py-3 px-4">Campaign</th>
                <th className="py-3 px-4">Proof Attachment</th>
                <th className="py-3 px-4">Reward</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {paginatedClaims.map((claim) => {
                const isWorking = actionInProgress === claim.claimId;
                const isPending = claim.status === 'pending';

                return (
                  <tr key={claim.claimId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(claim.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-white text-xs">{claim.claimerDisplayName || 'Earner'}</p>
                      <p className="font-mono text-[10px] text-slate-500">
                        {claim.claimerSnapchatHandle || claim.verificationCode || claim.claimerUid.slice(0, 8)}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-white text-xs max-w-xs truncate">{claim.adTitle || 'Social Campaign'}</p>
                      <p className="text-[10px] text-slate-400 uppercase">{claim.platform}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      {claim.proofImageUrl ? (
                        <button
                          onClick={() => setPreviewImage(claim.proofImageUrl!)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 transition-colors"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-orange-400" />
                          <span>View Proof</span>
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[11px]">No image attached</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                      +{claim.creditsAwarded || 5} Pts
                    </td>

                    <td className="py-3.5 px-4">
                      {isPending ? (
                        <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <Clock className="w-3 h-3" />
                          <span>Pending</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <Check className="w-3 h-3" />
                          <span>Verified & Paid</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {isPending ? (
                        <button
                          onClick={() => onForceApproveClaim(claim)}
                          disabled={isWorking}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                          Force Approve
                        </button>
                      ) : (
                        <span className="text-slate-500 text-xs font-semibold">Completed</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredClaims.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-300">No proof claims match your filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <AdminPagination
          currentPage={currentPage}
          totalItems={filteredClaims.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Proof Screenshot Lightbox Modal */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-slate-950 border border-slate-800 rounded-3xl p-4 space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white">Attached Screenshot Proof</span>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-2xl border border-slate-800 flex items-center justify-center bg-black">
              <img
                src={previewImage}
                alt="Proof verification"
                className="max-w-full max-h-[65vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
