import React, { useState } from 'react';
import { 
  Sparkles, 
  Search, 
  Play, 
  Pause, 
  Flame, 
  Trash2, 
  Clock, 
  Eye, 
  MousePointerClick, 
  ThumbsUp, 
  ExternalLink,
  ShieldAlert,
  Calendar,
  LayoutGrid,
  List
} from 'lucide-react';
import { Ad } from '../../../types';
import { PlatformIcon } from '../../PlatformIcon';
import { getEffectiveAdCover } from '../../../lib/avatar';
import { AdminPagination } from '../AdminPagination';

interface AdminAdsPageProps {
  ads: Ad[];
  onTogglePause: (ad: Ad) => Promise<void>;
  onBoostAd: (ad: Ad) => Promise<void>;
  onDeleteAd: (ad: Ad) => Promise<void>;
  onPermanentDeleteAd: (ad: Ad) => Promise<void>;
  actionInProgress: string | null;
}

export const AdminAdsPage: React.FC<AdminAdsPageProps> = ({
  ads,
  onTogglePause,
  onBoostAd,
  onDeleteAd,
  onPermanentDeleteAd,
  actionInProgress,
}) => {
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'snapchat' | 'whatsapp'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'expired' | 'boosted'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const filteredAds = ads.filter(ad => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = (ad.title || '').toLowerCase().includes(q);
      const matchDesc = (ad.description || '').toLowerCase().includes(q);
      const matchAuthor = (ad.userDisplayName || '').toLowerCase().includes(q);
      const matchHandle = (ad.targetHandleOrNumber || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchAuthor && !matchHandle) return false;
    }

    if (platformFilter !== 'all' && ad.platform !== platformFilter) return false;

    if (statusFilter === 'active') return ad.status === 'active' && (!ad.expiresAt || ad.expiresAt > Date.now());
    if (statusFilter === 'paused') return ad.status === 'paused';
    if (statusFilter === 'expired') return ad.status === 'expired' || (ad.expiresAt && ad.expiresAt <= Date.now());
    if (statusFilter === 'boosted') return Boolean(ad.boostedUntil && ad.boostedUntil > Date.now());

    return true;
  });

  const paginatedAds = filteredAds.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const activeCount = ads.filter(a => a.status === 'active' && (!a.expiresAt || a.expiresAt > Date.now())).length;
  const pausedCount = ads.filter(a => a.status === 'paused').length;
  const boostedCount = ads.filter(a => a.boostedUntil && a.boostedUntil > Date.now()).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-slate-400 font-medium">Total Ads Created</p>
          <p className="text-2xl sm:text-3xl font-black text-white mt-1.5">{ads.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-slate-400 font-medium">Live Active</p>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1.5">{activeCount}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-slate-400 font-medium">Paused</p>
          <p className="text-2xl sm:text-3xl font-black text-amber-400 mt-1.5">{pausedCount}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-slate-400 font-medium">24h VIP Boosted</p>
          <p className="text-2xl sm:text-3xl font-black text-orange-400 mt-1.5">{boostedCount}</p>
        </div>
      </div>

      {/* Control Bar & Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status & Platform filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status pills */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'all' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({ads.length})
              </button>
              <button
                onClick={() => { setStatusFilter('active'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => { setStatusFilter('paused'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'paused' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Paused ({pausedCount})
              </button>
              <button
                onClick={() => { setStatusFilter('boosted'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'boosted' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Boosted ({boostedCount})
              </button>
            </div>

            {/* Platform pills */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => { setPlatformFilter('all'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  platformFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All Networks
              </button>
              <button
                onClick={() => { setPlatformFilter('snapchat'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  platformFilter === 'snapchat' ? 'bg-[#FFFC00] text-black font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Snapchat
              </button>
              <button
                onClick={() => { setPlatformFilter('whatsapp'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  platformFilter === 'whatsapp' ? 'bg-[#25D366] text-white font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                WhatsApp
              </button>
            </div>
          </div>

          {/* Search bar & Grid/Table Toggle */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search campaigns, handles..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                title="Compact Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* View Mode 1: Grid Cards */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {paginatedAds.map((ad) => {
              const isWorking = actionInProgress === ad.adId;
              const isBoosted = Boolean(ad.boostedUntil && ad.boostedUntil > Date.now());
              const isPaused = ad.status === 'paused';
              const isExpired = ad.status === 'expired' || (ad.expiresAt && ad.expiresAt <= Date.now());

              return (
                <div
                  key={ad.adId}
                  className={`bg-slate-950 border rounded-3xl p-4 flex flex-col justify-between space-y-3.5 transition-all ${
                    isBoosted
                      ? 'border-orange-500/50 shadow-md shadow-orange-500/10'
                      : isPaused
                      ? 'border-amber-500/30 opacity-90'
                      : isExpired
                      ? 'border-slate-800 opacity-60'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Header: Platform, author, status badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <PlatformIcon platform={ad.platform} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{ad.userDisplayName || 'User'}</p>
                        <p className="text-[11px] text-slate-400 font-mono truncate">{ad.targetHandleOrNumber}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isBoosted && (
                        <span className="bg-orange-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <Flame className="w-2.5 h-2.5" />
                          <span>VIP</span>
                        </span>
                      )}

                      {isPaused ? (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Paused
                        </span>
                      ) : isExpired ? (
                        <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Expired
                        </span>
                      ) : (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body: Ad Title, Description & Cover image */}
                  <div className="space-y-2.5">
                    <div className="flex gap-3">
                      <img
                        src={getEffectiveAdCover(ad)}
                        alt={ad.title}
                        className="w-16 h-16 rounded-2xl object-cover bg-slate-900 border border-slate-800 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black text-white line-clamp-1">{ad.title}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{ad.description}</p>
                      </div>
                    </div>

                    {/* Metrics bar */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 text-center">
                      <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        <span className="font-bold text-white">{ad.viewsCount || 0}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                        <MousePointerClick className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-bold text-white">{ad.clicksCount || 0}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                        <ThumbsUp className="w-3.5 h-3.5 text-purple-400" />
                        <span className="font-bold text-white">{ad.likesCount || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Controls */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onTogglePause(ad)}
                        disabled={isWorking}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-xs font-bold border border-slate-800"
                        title={isPaused ? "Resume Campaign" : "Pause Campaign"}
                      >
                        {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
                      </button>

                      <button
                        onClick={() => onBoostAd(ad)}
                        disabled={isWorking}
                        className="p-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 hover:text-orange-300 transition-all text-xs font-bold border border-orange-500/30"
                        title="Grant 24h VIP Boost"
                      >
                        <Flame className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onDeleteAd(ad)}
                        disabled={isWorking || isExpired}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all text-[11px] font-bold border border-rose-500/30 disabled:opacity-40"
                      >
                        Expire
                      </button>

                      <button
                        onClick={() => onPermanentDeleteAd(ad)}
                        disabled={isWorking}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-500 hover:text-rose-400 transition-all text-xs font-bold border border-slate-800 hover:border-rose-900"
                        title="Permanently Purge"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* View Mode 2: Compact Table */
          <div className="overflow-x-auto border border-slate-800/80 rounded-2xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Campaign</th>
                  <th className="py-3 px-4">Platform / Target</th>
                  <th className="py-3 px-4">Performance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {paginatedAds.map((ad) => {
                  const isWorking = actionInProgress === ad.adId;
                  const isBoosted = Boolean(ad.boostedUntil && ad.boostedUntil > Date.now());
                  const isPaused = ad.status === 'paused';
                  const isExpired = ad.status === 'expired' || (ad.expiresAt && ad.expiresAt <= Date.now());

                  return (
                    <tr key={ad.adId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={getEffectiveAdCover(ad)}
                            alt={ad.title}
                            className="w-10 h-10 rounded-xl object-cover bg-slate-800 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-white text-xs">{ad.title}</p>
                            <p className="text-[11px] text-slate-400">{ad.userDisplayName || 'User'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <PlatformIcon platform={ad.platform} size="sm" />
                          <span className="font-mono text-white text-xs">{ad.targetHandleOrNumber}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className="text-blue-400">{ad.viewsCount || 0} views</span> •{' '}
                        <span className="text-emerald-400">{ad.clicksCount || 0} clicks</span>
                      </td>

                      <td className="py-3 px-4">
                        {isPaused ? (
                          <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            Paused
                          </span>
                        ) : isExpired ? (
                          <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            Expired
                          </span>
                        ) : (
                          <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            Active
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onTogglePause(ad)}
                            disabled={isWorking}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold"
                          >
                            {isPaused ? 'Resume' : 'Pause'}
                          </button>
                          <button
                            onClick={() => onBoostAd(ad)}
                            disabled={isWorking}
                            className="p-1 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 rounded-lg text-[11px]"
                            title="VIP Boost"
                          >
                            <Flame className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onPermanentDeleteAd(ad)}
                            disabled={isWorking}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredAds.length === 0 && (
          <div className="text-center py-12 text-slate-500 space-y-2">
            <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-bold text-slate-300">No campaigns match your selected filters.</p>
          </div>
        )}

        {/* Pagination */}
        <AdminPagination
          currentPage={currentPage}
          totalItems={filteredAds.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};
