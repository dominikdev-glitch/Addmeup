import React, { useState, useRef, useEffect } from 'react';
import { CategoryType, PlatformType, UserProfile, AdDurationConfig, Ad } from '../types';
import { AD_DURATIONS, publishAd } from '../lib/transactions';
import { DepositModal } from './DepositModal';
import { 
  AlertCircle, 
  ArrowRight, 
  Clock, 
  Plus, 
  Coins, 
  Upload, 
  Image as ImageIcon, 
  Check, 
  Save, 
  RotateCcw, 
  Trash2, 
  X, 
  Sparkles, 
  Eye, 
  MousePointerClick, 
  ThumbsUp, 
  FileText,
  History
} from 'lucide-react';
import { PlatformIcon } from './PlatformIcon';
import { AvatarPicker } from './AvatarPicker';
import { 
  getEffectiveAvatar, 
  PRESET_COVER_BANNERS, 
  compressCoverImageFile, 
  getEffectiveAdCover, 
  getEffectiveAdDescription 
} from '../lib/avatar';
import { normalizeWhatsAppNumber, parseSmartPhone, formatWhatsAppDisplay } from '../lib/phone';
import { triggerHaptic } from '../lib/device';
import { 
  saveAdDraft, 
  getAdDraft, 
  clearAdDraft, 
  getExpiredAdsFromLocalStorage, 
  removeExpiredAdFromLocalStorage, 
  saveExpiredAdToLocalStorage,
  AdDraft, 
  SavedExpiredAd 
} from '../lib/adDrafts';

interface PostAdPageProps {
  userUid: string | null;
  profile: UserProfile | null;
  onNavigateFeed: () => void;
  onRequireAuth: () => void;
  onToast: (msg: string) => void;
  initialAdData?: Partial<Ad> | null;
  onClearInitialAdData?: () => void;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const PostAdPage: React.FC<PostAdPageProps> = ({
  userUid,
  profile,
  onNavigateFeed,
  onRequireAuth,
  onToast,
  initialAdData,
  onClearInitialAdData,
}) => {
  const [platform, setPlatform] = useState<PlatformType>('snapchat');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [targetHandleOrNumber, setTargetHandleOrNumber] = useState(
    platform === 'snapchat' ? (profile?.snapchatHandle || '') : (profile?.whatsappNumber || '')
  );
  const [category, setCategory] = useState<CategoryType>('Friends');
  const [selectedDuration, setSelectedDuration] = useState<AdDurationConfig>(AD_DURATIONS[0]);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(profile?.photoUrl || undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  // Draft & Expired Ads State
  const [savedDraft, setSavedDraft] = useState<AdDraft | null>(null);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<number | null>(null);
  const [savedExpiredAds, setSavedExpiredAds] = useState<SavedExpiredAd[]>([]);
  const [showExpiredDrawer, setShowExpiredDrawer] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const coverFileInputRef = useRef<HTMLInputElement>(null);

  const adCost = selectedDuration.costCredits;
  const userBalance = profile?.creditBalance || 0;
  const hasEnoughCredits = userBalance >= adCost;

  const categories: CategoryType[] = ['Friends', 'Business', 'Tech', 'Fashion', 'Services'];

  // Refresh saved expired ads from localStorage
  const refreshExpiredAds = () => {
    const list = getExpiredAdsFromLocalStorage(userUid);
    setSavedExpiredAds(list);
  };

  useEffect(() => {
    refreshExpiredAds();
  }, [userUid]);

  // If initialAdData was passed (e.g. from clicking "Reuse with Points" in My Ads or Verifications), load it immediately
  useEffect(() => {
    if (initialAdData) {
      if (initialAdData.platform) setPlatform(initialAdData.platform);
      if (initialAdData.title) setTitle(initialAdData.title);
      if (initialAdData.description !== undefined) setDescription(initialAdData.description);
      if (initialAdData.targetHandleOrNumber) setTargetHandleOrNumber(initialAdData.targetHandleOrNumber);
      if (initialAdData.category) setCategory(initialAdData.category);
      if (initialAdData.imageUrl) setImageUrl(initialAdData.imageUrl);
      if (initialAdData.avatarUrl) setAvatarUrl(initialAdData.avatarUrl);

      // Save it as an expired ad in localStorage if full ad object
      if (initialAdData.adId && initialAdData.title && initialAdData.platform && initialAdData.targetHandleOrNumber && initialAdData.category) {
        saveExpiredAdToLocalStorage(userUid, initialAdData as Ad);
        refreshExpiredAds();
      }

      onToast(`Loaded "${initialAdData.title || 'ad'}" for reuse! Pick duration to launch.`);
      triggerHaptic('medium');

      if (onClearInitialAdData) {
        onClearInitialAdData();
      }
    }
  }, [initialAdData]);

  // Check for unsaved incomplete draft in localStorage on initial mount
  useEffect(() => {
    if (initialAdData) return;
    const existingDraft = getAdDraft(userUid);
    if (
      existingDraft &&
      (existingDraft.title?.trim() || existingDraft.description?.trim() || existingDraft.targetHandleOrNumber?.trim())
    ) {
      setSavedDraft(existingDraft);
      setLastSavedTimestamp(existingDraft.lastSavedAt);
    }
  }, [userUid, initialAdData]);

  // Resume draft action
  const handleResumeDraft = () => {
    if (!savedDraft) return;
    setPlatform(savedDraft.platform || 'snapchat');
    setTitle(savedDraft.title || '');
    setDescription(savedDraft.description || '');
    setTargetHandleOrNumber(savedDraft.targetHandleOrNumber || '');
    setCategory(savedDraft.category || 'Friends');
    setImageUrl(savedDraft.imageUrl);
    setAvatarUrl(savedDraft.avatarUrl);
    if (savedDraft.durationId) {
      const match = AD_DURATIONS.find(d => d.id === savedDraft.durationId);
      if (match) setSelectedDuration(match);
    }
    setLastSavedTimestamp(savedDraft.lastSavedAt);
    setSavedDraft(null);
    onToast("Draft resumed successfully! 📝");
    triggerHaptic('success');
  };

  // Discard draft action
  const handleDiscardDraft = () => {
    clearAdDraft(userUid);
    setSavedDraft(null);
    setLastSavedTimestamp(null);
    onToast("Draft discarded");
    triggerHaptic('light');
  };

  // Determine if there is incomplete content worthy of saving
  const hasContentToSave = Boolean(
    title.trim().length > 0 ||
    description.trim().length > 0 ||
    (targetHandleOrNumber.trim().length > 0 &&
      targetHandleOrNumber !== (platform === 'snapchat' ? profile?.snapchatHandle : profile?.whatsappNumber))
  );

  // Auto-save incomplete ad post to localStorage (debounced 750ms)
  useEffect(() => {
    if (!hasContentToSave) return;

    setIsAutoSaving(true);
    const timer = setTimeout(() => {
      saveAdDraft(userUid, {
        platform,
        title,
        description,
        targetHandleOrNumber,
        category,
        durationId: selectedDuration.id,
        imageUrl,
        avatarUrl,
      });
      setLastSavedTimestamp(Date.now());
      setIsAutoSaving(false);
    }, 750);

    return () => clearTimeout(timer);
  }, [platform, title, description, targetHandleOrNumber, category, selectedDuration, imageUrl, avatarUrl, userUid, hasContentToSave]);

  // Explicit manual Save Draft action
  const handleManualSaveDraft = () => {
    if (!hasContentToSave) {
      onToast("Enter a title or details before saving draft.");
      return;
    }
    saveAdDraft(userUid, {
      platform,
      title,
      description,
      targetHandleOrNumber,
      category,
      durationId: selectedDuration.id,
      imageUrl,
      avatarUrl,
    });
    setLastSavedTimestamp(Date.now());
    setIsAutoSaving(false);
    onToast("Ad draft saved to your device! 💾");
    triggerHaptic('success');
  };

  // Handle reuse of an expired ad from localStorage
  const handleApplyExpiredAd = (expired: SavedExpiredAd) => {
    setPlatform(expired.platform);
    setTitle(expired.title);
    setDescription(expired.description || '');
    setTargetHandleOrNumber(expired.targetHandleOrNumber);
    setCategory(expired.category);
    setImageUrl(expired.imageUrl);
    setAvatarUrl(expired.avatarUrl);
    setShowExpiredDrawer(false);
    onToast(`Applied "${expired.title}"! Pick duration and launch with new points. 🚀`);
    triggerHaptic('medium');
  };

  // Remove saved expired ad from localStorage
  const handleDeleteExpiredAd = (e: React.MouseEvent, adId: string) => {
    e.stopPropagation();
    removeExpiredAdFromLocalStorage(userUid, adId);
    refreshExpiredAds();
    onToast("Removed from saved ads");
    triggerHaptic('light');
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingCover(true);
      const { dataUrl } = await compressCoverImageFile(file);
      setImageUrl(dataUrl);
      onToast('Cover photo uploaded & optimized! 📸');
      triggerHaptic('success');
    } catch (err: any) {
      console.error('Cover upload error:', err);
      onToast(err.message || 'Could not process cover photo');
    } finally {
      setIsUploadingCover(false);
      if (coverFileInputRef.current) {
        coverFileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userUid) {
      onRequireAuth();
      return;
    }

    if (!title.trim()) {
      setErrorMessage("Please type a short headline for your ad.");
      return;
    }

    if (!targetHandleOrNumber.trim()) {
      setErrorMessage(`Please enter your ${platform === 'snapchat' ? 'Snapchat handle' : 'WhatsApp number'}.`);
      return;
    }

    if (!hasEnoughCredits) {
      setErrorMessage(`You need ${adCost - userBalance} more points for this duration.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const resolvedImageUrl = typeof imageUrl === 'string' && imageUrl.trim().length > 0
        ? imageUrl.trim()
        : (typeof imageUrl === 'object' && imageUrl !== null && (imageUrl as any).dataUrl
          ? (imageUrl as any).dataUrl
          : undefined);

      const resolvedAvatarUrl = typeof avatarUrl === 'string' && avatarUrl.trim().length > 0
        ? avatarUrl.trim()
        : (typeof avatarUrl === 'object' && avatarUrl !== null && (avatarUrl as any).dataUrl
          ? (avatarUrl as any).dataUrl
          : undefined);

      const normalizedHandleOrNumber = platform === 'whatsapp'
        ? normalizeWhatsAppNumber(targetHandleOrNumber)
        : targetHandleOrNumber.trim();

      const result = await publishAd({
        userId: userUid,
        title: title.trim(),
        description: description.trim() || undefined,
        imageUrl: resolvedImageUrl,
        category,
        platform,
        targetHandleOrNumber: normalizedHandleOrNumber,
        durationHours: selectedDuration.durationHours,
        costCredits: selectedDuration.costCredits,
        durationLabel: selectedDuration.label,
        userDisplayName: profile?.username || 'Social Member',
        avatarUrl: resolvedAvatarUrl,
      });

      if (result.success) {
        // Clear the draft from localStorage now that it is published!
        clearAdDraft(userUid);
        setLastSavedTimestamp(null);
        setSavedDraft(null);

        onToast(`Your ad is live for ${selectedDuration.label}! 🎉`);
        triggerHaptic('success');
        onNavigateFeed();
      }
    } catch (err: any) {
      console.error("Publish ad error:", err);
      setErrorMessage(err.message || "Failed to publish ad. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewEffectiveCover = imageUrl || getEffectiveAdCover({ imageUrl, category, platform });
  const previewEffectiveDescription = description.trim() || getEffectiveAdDescription({ description, category, platform });

  return (
    <div className="max-w-md md:max-w-4xl lg:max-w-6xl mx-auto px-3.5 py-4 pb-20 space-y-4">
      
      {/* Top Banner Header */}
      <div className="glass-card border border-orange-200/80 rounded-2xl p-3.5 shadow-2xs text-slate-800 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-base shadow-xs shadow-orange-500/20 flex-shrink-0">
            🚀
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-black text-slate-900 leading-tight truncate">Post an Ad</h1>
              {lastSavedTimestamp && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Check className="w-2.5 h-2.5 text-emerald-600" />
                  <span>Draft saved {formatTimeAgo(lastSavedTimestamp)}</span>
                </span>
              )}
              {isAutoSaving && (
                <span className="text-[10px] text-slate-400 animate-pulse font-medium">
                  Saving draft...
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Get instant adds & followers with points</p>
          </div>
        </div>

        {/* Right side controls: Expired Ads Drawer Trigger & Balance */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap ml-auto">
          {savedExpiredAds.length > 0 && (
            <button
              type="button"
              onClick={() => {
                refreshExpiredAds();
                setShowExpiredDrawer(true);
              }}
              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/90 text-[11px] font-extrabold rounded-xl shadow-2xs flex items-center gap-1.5 transition-all active:scale-95"
              title="Reuse previously expired ads"
            >
              <History className="w-3.5 h-3.5 text-amber-600" />
              <span>Reuse Expired ({savedExpiredAds.length})</span>
            </button>
          )}

          {/* Manual Save Draft Button */}
          {hasContentToSave && (
            <button
              type="button"
              onClick={handleManualSaveDraft}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-extrabold rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1 transition-all active:scale-95"
              title="Save current work as draft to resume later"
            >
              <Save className="w-3 h-3 text-slate-600" />
              <span className="hidden sm:inline">Save Draft</span>
            </button>
          )}

          {/* Balance & Deposit */}
          <div className="flex items-center gap-1.5">
            <div className="font-extrabold text-[11px] text-amber-900 bg-amber-100/90 px-2.5 py-1 rounded-full border border-amber-200 shadow-2xs flex items-center gap-1">
              <span>🪙</span>
              <span>{userBalance.toLocaleString()} Pts</span>
            </div>
            <button
              type="button"
              onClick={() => setIsDepositOpen(true)}
              className="px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-black rounded-full shadow-2xs flex items-center gap-1 transition-all active:scale-95"
            >
              <Plus className="w-3 h-3" />
              <span>Deposit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unsaved Draft Detection Alert Banner */}
      {savedDraft && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-300 rounded-2xl p-3 shadow-sm flex items-center justify-between gap-3 animate-fade-in flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0 text-slate-800">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-xs text-amber-950">Incomplete Draft Found</span>
                <span className="text-[10px] text-amber-800 bg-amber-200/70 px-1.5 py-0.2 rounded font-semibold">
                  Saved {formatTimeAgo(savedDraft.lastSavedAt)}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium truncate">
                "{savedDraft.title || 'Untitled Ad'}" ({savedDraft.platform === 'snapchat' ? 'Snapchat' : 'WhatsApp'} • {savedDraft.category})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleResumeDraft}
              className="flex-1 sm:flex-initial px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1 transition-all active:scale-95"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Resume Draft</span>
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="px-2.5 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all"
              title="Discard saved draft"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* Left Column: Post Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 glass-card border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3.5 text-slate-800">
          
          {/* Top Form Bar: Quick Tools */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>Campaign Setup</span>
            </span>

            <div className="flex items-center gap-2">
              {savedExpiredAds.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    refreshExpiredAds();
                    setShowExpiredDrawer(true);
                  }}
                  className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 hover:underline"
                >
                  <History className="w-3 h-3" />
                  <span>Use past expired ad ({savedExpiredAds.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Step 1: Select Platform */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              1. Platform
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPlatform('snapchat');
                  if (!targetHandleOrNumber && profile?.snapchatHandle) {
                    setTargetHandleOrNumber(profile.snapchatHandle);
                  }
                }}
                className={`py-2 px-3 rounded-xl border font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
                  platform === 'snapchat'
                    ? 'bg-yellow-400 text-slate-950 border-yellow-400 shadow-xs ring-1 ring-yellow-400/50'
                    : 'bg-white/70 text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                <PlatformIcon platform="snapchat" size="sm" />
                <span>Snapchat</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPlatform('whatsapp');
                  if (!targetHandleOrNumber && profile?.whatsappNumber) {
                    setTargetHandleOrNumber(profile.whatsappNumber);
                  }
                }}
                className={`py-2 px-3 rounded-xl border font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
                  platform === 'whatsapp'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-1 ring-emerald-600/50'
                    : 'bg-white/70 text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                <PlatformIcon platform="whatsapp" size="sm" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Step 2: Duration & Pricing Tiers */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">
                2. Ad Duration
              </label>
              <span className="text-[10px] font-bold text-orange-600 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Auto-expires after time</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {AD_DURATIONS.map((dur) => {
                const isSelected = selectedDuration.id === dur.id;
                return (
                  <button
                    key={dur.id}
                    type="button"
                    onClick={() => setSelectedDuration(dur)}
                    className={`relative p-2 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/90 shadow-xs ring-2 ring-orange-500/20'
                        : 'border-slate-200 bg-white/70 hover:border-slate-300'
                    }`}
                  >
                    {dur.tag && (
                      <span className={`absolute -top-1.5 right-1.5 text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full ${
                        dur.isPopular 
                          ? 'bg-orange-500 text-white' 
                          : 'bg-slate-800 text-white'
                      }`}>
                        {dur.tag}
                      </span>
                    )}

                    <div className="font-extrabold text-xs text-slate-900 leading-tight">
                      {dur.label}
                    </div>

                    <div className="font-mono text-[11px] font-black text-orange-600 mt-0.5 flex items-center gap-0.5">
                      <span>🪙 {dur.costCredits}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Headline / Title */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
              <span>3. Headline / Title *</span>
              <span className="text-[10px] text-slate-400 font-mono font-normal">{title.length}/80</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                platform === 'snapchat'
                  ? "e.g. Daily Streaks & Fun Snaps 🔥"
                  : "e.g. Fresh Sneakers & Streetwear Store 👟"
              }
              maxLength={80}
              className="w-full bg-white/90 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all shadow-2xs font-semibold"
            />
          </div>

          {/* Step 4: Ad Description / Pitch */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
              <span>4. Description & Pitch</span>
              <span className="text-[10px] text-slate-400 font-mono font-normal">{description.length}/240</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell people why to add you, what your content is, your business products, or streak rules! Makes your ad much more attractive..."
              rows={3}
              maxLength={240}
              className="w-full bg-white/90 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all shadow-2xs resize-none"
            />
          </div>

          {/* Step 5: Featured Ad Cover Banner / Image */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                5. Featured Cover Banner
              </label>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl(undefined)}
                  className="text-[10px] text-rose-500 font-bold hover:underline"
                >
                  Reset to category default
                </button>
              )}
            </div>
            
            {/* Custom Upload Button + Input */}
            <div className="flex items-center gap-2">
              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => coverFileInputRef.current?.click()}
                disabled={isUploadingCover}
                className="flex-1 py-2.5 px-3 rounded-xl border border-dashed border-orange-300 bg-orange-50/60 hover:bg-orange-100/70 text-orange-950 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Upload className="w-3.5 h-3.5 text-orange-600" />
                <span>{isUploadingCover ? 'Optimizing Banner...' : 'Upload Custom Cover Photo'}</span>
              </button>
            </div>

            {/* Quick Preset Covers */}
            <div>
              <p className="text-[10px] text-slate-400 font-semibold mb-1.5 flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-slate-400" />
                <span>Or pick a cover banner preset:</span>
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PRESET_COVER_BANNERS.map((preset) => {
                  const isSelected = imageUrl === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setImageUrl(preset.url)}
                      className={`relative rounded-xl overflow-hidden h-14 border-2 transition-all group ${
                        isSelected 
                          ? 'border-orange-500 ring-2 ring-orange-500/40 scale-102' 
                          : 'border-slate-200 hover:border-orange-300'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-end p-1">
                        <span className="text-[8px] font-bold text-white truncate drop-shadow-xs">
                          {preset.name}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-orange-500 text-white p-0.5 rounded-full shadow-2xs">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Step 6: Handle or Phone Number */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                6. {platform === 'snapchat' ? 'Snapchat Handle *' : 'WhatsApp Number *'}
              </label>
              {platform === 'whatsapp' && (
                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                  <span>⚡ Smart Nigerian Number Parser</span>
                </span>
              )}
            </div>
            
            <input
              type="text"
              value={targetHandleOrNumber}
              onChange={(e) => setTargetHandleOrNumber(e.target.value)}
              onBlur={() => {
                if (platform === 'whatsapp' && targetHandleOrNumber.trim()) {
                  const parsed = parseSmartPhone(targetHandleOrNumber);
                  if (parsed.isValid && parsed.formattedDisplay) {
                    setTargetHandleOrNumber(parsed.formattedDisplay);
                  }
                }
              }}
              placeholder={
                platform === 'snapchat'
                  ? "@your_username"
                  : "e.g. 08108237903, 8108237903, or +234 810..."
              }
              className={`w-full bg-white/90 border rounded-xl p-3 text-xs font-mono font-bold placeholder-slate-400 focus:outline-none focus:ring-1 transition-all shadow-2xs ${
                platform === 'whatsapp'
                  ? 'text-emerald-700 border-emerald-200/80 focus:border-emerald-500 focus:ring-emerald-500'
                  : 'text-orange-600 border-slate-200 focus:border-orange-500 focus:ring-orange-500'
              }`}
            />

            {platform === 'whatsapp' && targetHandleOrNumber.trim() && (() => {
              const smart = parseSmartPhone(targetHandleOrNumber);
              return (
                <div className="mt-2 p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-900 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <span className="font-bold flex items-center gap-1">
                      <span>{smart.isNigerian ? '🇳🇬' : '🌍'}</span>
                      <span>Formatted WhatsApp link:</span>
                      <code className="font-mono bg-white px-1.5 py-0.5 rounded text-emerald-700 border border-emerald-200 font-black">
                        {smart.formattedDisplay || '...'}
                      </code>
                    </span>
                    {smart.isValid && (
                      <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded-md text-[10px] font-black">
                        ✓ Verified Ready
                      </span>
                    )}
                  </div>
                  {smart.correctionApplied && (
                    <p className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                      <span>✨</span>
                      <span><strong>Smart Fix:</strong> {smart.correctionApplied}</span>
                    </p>
                  )}
                  <p className="text-[10px] text-emerald-600/90">
                    Direct link: <span className="font-mono underline">wa.me/{smart.normalized}</span> (opens chat directly in WhatsApp app with zero username errors).
                  </p>
                </div>
              );
            })()}

            {platform === 'whatsapp' && !targetHandleOrNumber.trim() && (
              <p className="mt-1 text-[11px] text-slate-500">
                Tip: You can type your 11-digit number with spaces or without the first zero (e.g. <code className="text-slate-700 font-bold">8108237903</code>) — our smart parser fixes it automatically for WhatsApp!
              </p>
            )}
          </div>

          {/* Step 7: Contact Photo & 3D Avatar */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
              7. Profile Picture / Avatar
            </label>
            <AvatarPicker
              currentAvatarUrl={avatarUrl}
              seedName={targetHandleOrNumber || profile?.username || title || 'social'}
              platform={platform}
              onChangeAvatar={setAvatarUrl}
              label="Contact Profile Picture"
              description="Upload your face photo or choose a high-res 3D avatar"
            />
          </div>

          {/* Step 8: Category */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
              8. Category
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`py-2 px-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                    category === cat
                      ? 'bg-orange-500 text-white border-orange-500 shadow-2xs'
                      : 'bg-white/70 text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Error Notification */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Insufficient Points Banner */}
          {!hasEnoughCredits && (
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl space-y-2 text-center">
              <p className="text-xs text-amber-900 font-bold">
                You have {userBalance} points. You need {adCost - userBalance} more for {selectedDuration.label} ({adCost} Pts).
              </p>
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsDepositOpen(true)}
                  className="py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Deposit (₦1,000)</span>
                </button>

                <button
                  type="button"
                  onClick={onNavigateFeed}
                  className="py-2.5 bg-amber-200/80 hover:bg-amber-300 border border-amber-300 text-amber-950 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                >
                  <span>Earn Free on Feed</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons: Post Ad + Save as Draft */}
          <div className="space-y-2 pt-1">
            <button
              type="submit"
              disabled={isSubmitting || !hasEnoughCredits}
              className={`w-full py-3.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                hasEnoughCredits
                  ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20'
                  : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none'
              }`}
            >
              <span>
                {isSubmitting
                  ? 'Publishing Ad...'
                  : `Post Ad (${selectedDuration.label}) • ${selectedDuration.costCredits} Points`}
              </span>
            </button>

            <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
              <button
                type="button"
                onClick={handleManualSaveDraft}
                disabled={!hasContentToSave}
                className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40"
              >
                <Save className="w-3 h-3 text-slate-500" />
                <span>Save Incomplete Post as Draft</span>
              </button>

              {lastSavedTimestamp && (
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold py-1 px-2 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  Clear Draft
                </button>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 text-center font-medium">
            Your ad will be featured in the live feed for exactly {selectedDuration.label}. Drafts and expired ads are saved locally on this device.
          </p>
        </form>

        {/* Right Column: Live Ad Preview (Desktop Only) */}
        <div className="hidden lg:block lg:col-span-5 sticky top-20 space-y-3">
          <div className="flex items-center justify-between text-xs font-extrabold text-slate-700 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live Card Preview</span>
            </span>
            <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
              {selectedDuration.label}
            </span>
          </div>

          {/* Attractive Large Preview Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden space-y-0 transition-all">
            {/* Cover Photo Banner */}
            <div className="relative w-full h-52 bg-slate-900 overflow-hidden">
              <img
                src={previewEffectiveCover}
                alt="Card Preview"
                className="w-full h-full object-cover brightness-[0.88]"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-black/40 pointer-events-none" />

              {/* Floating Badges */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                <div className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide shadow-md backdrop-blur-md ${
                    platform === 'snapchat'
                      ? 'bg-yellow-400 text-slate-950 border border-yellow-300'
                      : 'bg-emerald-600 text-white border border-emerald-400'
                  }`}>
                    <PlatformIcon platform={platform} size="sm" />
                    <span>{platform === 'snapchat' ? 'Snapchat' : 'WhatsApp'}</span>
                  </span>
                  <span className="px-2 py-0.8 rounded-full text-[10px] font-extrabold bg-black/50 text-white backdrop-blur-md border border-white/20">
                    {category}
                  </span>
                </div>

                <div className="bg-orange-500 text-white border border-orange-300/60 px-2.5 py-0.8 rounded-full text-[11px] font-black flex items-center gap-1 shadow-md backdrop-blur-md">
                  <span>🪙</span>
                  <span>+5 Pts</span>
                </div>
              </div>

              {/* Bottom Avatar & User Info */}
              <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 z-10">
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white border-2 border-white shadow-xl flex items-center justify-center">
                      <img
                        src={getEffectiveAvatar(avatarUrl, targetHandleOrNumber || profile?.username || 'user')}
                        alt="Preview Avatar"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-md border border-slate-100">
                      <PlatformIcon platform={platform} size="sm" />
                    </div>
                  </div>

                  <div className="text-white space-y-0.5">
                    <span className="font-mono font-black text-sm text-white drop-shadow-md">
                      {platform === 'whatsapp' 
                        ? (targetHandleOrNumber.trim() ? formatWhatsAppDisplay(targetHandleOrNumber) : '+234 810 823 7903')
                        : (targetHandleOrNumber || '@your_username')}
                    </span>
                    <p className="text-[11px] text-slate-300 font-medium">
                      by {profile?.username || 'You'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Content: Title, Description & Handle */}
            <div className="p-4 sm:p-5 space-y-3">
              <h3 className="font-black text-slate-900 text-base leading-snug">
                {title || 'Your Eye-Catching Headline Appears Here'}
              </h3>

              <div className="bg-slate-50/90 rounded-2xl p-3 border border-slate-100 text-slate-600 text-xs font-normal leading-relaxed">
                <p className="line-clamp-3">
                  {previewEffectiveDescription}
                </p>
              </div>

              {/* Campaign Duration Indicator */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-orange-500" />
                    <span>Duration: {selectedDuration.label}</span>
                  </span>
                  <span className="font-extrabold text-orange-600">{selectedDuration.costCredits} Points</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      platform === 'snapchat' ? 'bg-amber-400 w-full' : 'bg-emerald-500 w-full'
                    }`}
                  />
                </div>
              </div>

              {/* Preview Action Button */}
              <div
                className={`w-full py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider text-center flex items-center justify-center gap-2 shadow-md ${
                  platform === 'snapchat'
                    ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                }`}
              >
                <PlatformIcon platform={platform} size="sm" />
                <span>Tap to Add & Earn +5 Points</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Expired Ads Reuse Drawer/Modal */}
      {showExpiredDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Saved Expired Ads</h3>
                  <p className="text-[11px] text-slate-500">Pick any past ad to relaunch with new points</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExpiredDrawer(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {savedExpiredAds.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Sparkles className="w-8 h-8 mx-auto opacity-30 text-orange-500" />
                  <p className="text-xs font-bold text-slate-600">No saved expired ads found</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    When your active ads finish their duration or are renewed, they are saved here on your device for instant reuse!
                  </p>
                </div>
              ) : (
                savedExpiredAds.map((ad) => {
                  const isSnap = ad.platform === 'snapchat';
                  return (
                    <div
                      key={ad.adId}
                      className="p-3 rounded-2xl border border-slate-200 hover:border-orange-300 bg-slate-50/60 hover:bg-orange-50/20 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Avatar / Thumbnail */}
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 relative border border-slate-200">
                          <img
                            src={getEffectiveAdCover({ imageUrl: ad.imageUrl, category: ad.category, platform: ad.platform })}
                            alt={ad.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-0.5 right-0.5">
                            <PlatformIcon platform={ad.platform} size="sm" />
                          </div>
                        </div>

                        {/* Ad Details */}
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                              isSnap ? 'bg-yellow-400 text-slate-950' : 'bg-emerald-600 text-white'
                            }`}>
                              {isSnap ? 'Snap' : 'WhatsApp'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-200/70 px-1.5 py-0.2 rounded">
                              {ad.category}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Ended {formatTimeAgo(ad.expiredAt)}
                            </span>
                          </div>

                          <h4 className="text-xs font-black text-slate-900 truncate">
                            {ad.title}
                          </h4>

                          <p className="text-[11px] font-mono text-slate-600 truncate font-semibold">
                            {ad.targetHandleOrNumber}
                          </p>

                          {/* Historical stats if available */}
                          {ad.stats && (
                            <div className="flex items-center gap-3 pt-0.5 text-[10px] text-slate-400 font-medium">
                              <span className="flex items-center gap-0.5">
                                <Eye className="w-3 h-3 text-slate-400" />
                                <span>{ad.stats.views || 0}</span>
                              </span>
                              <span className="flex items-center gap-0.5">
                                <MousePointerClick className="w-3 h-3 text-slate-400" />
                                <span>{ad.stats.clicks || 0}</span>
                              </span>
                              <span className="flex items-center gap-0.5">
                                <ThumbsUp className="w-3 h-3 text-slate-400" />
                                <span>{ad.stats.likes || 0}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleApplyExpiredAd(ad)}
                          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black rounded-xl shadow-2xs flex items-center gap-1 transition-all active:scale-95"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Reuse Ad</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteExpiredAd(e, ad.adId)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete from saved templates"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{savedExpiredAds.length} expired ad templates saved</span>
              <button
                type="button"
                onClick={() => setShowExpiredDrawer(false)}
                className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        userUid={userUid}
        userEmail={profile?.email}
        onToast={onToast}
      />
    </div>
  );
};
