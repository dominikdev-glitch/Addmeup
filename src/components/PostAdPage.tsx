import React, { useState } from 'react';
import { CategoryType, PlatformType, UserProfile, AdDurationConfig } from '../types';
import { AD_DURATIONS, publishAd } from '../lib/transactions';
import { DepositModal } from './DepositModal';
import { AlertCircle, ArrowRight, Clock, Plus, Coins } from 'lucide-react';
import { PlatformIcon } from './PlatformIcon';
import { AvatarPicker } from './AvatarPicker';
import { getEffectiveAvatar } from '../lib/avatar';

interface PostAdPageProps {
  userUid: string | null;
  profile: UserProfile | null;
  onNavigateFeed: () => void;
  onRequireAuth: () => void;
  onToast: (msg: string) => void;
}

export const PostAdPage: React.FC<PostAdPageProps> = ({
  userUid,
  profile,
  onNavigateFeed,
  onRequireAuth,
  onToast,
}) => {
  const [platform, setPlatform] = useState<PlatformType>('snapchat');
  const [title, setTitle] = useState('');
  const [targetHandleOrNumber, setTargetHandleOrNumber] = useState(
    platform === 'snapchat' ? (profile?.snapchatHandle || '') : (profile?.whatsappNumber || '')
  );
  const [category, setCategory] = useState<CategoryType>('Friends');
  const [selectedDuration, setSelectedDuration] = useState<AdDurationConfig>(AD_DURATIONS[0]);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(profile?.photoUrl || undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  const adCost = selectedDuration.costCredits;
  const userBalance = profile?.creditBalance || 0;
  const hasEnoughCredits = userBalance >= adCost;

  const categories: CategoryType[] = ['Friends', 'Business', 'Tech', 'Fashion', 'Services'];

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
      setErrorMessage(`You need ${adCost - userBalance} more credits for this duration.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const result = await publishAd({
        userId: userUid,
        title: title.trim(),
        category,
        platform,
        targetHandleOrNumber: targetHandleOrNumber.trim(),
        durationHours: selectedDuration.durationHours,
        costCredits: selectedDuration.costCredits,
        durationLabel: selectedDuration.label,
        userDisplayName: profile?.username || 'Social Member',
        avatarUrl: avatarUrl || undefined,
      });

      if (result.success) {
        onToast(`Your ad is live for ${selectedDuration.label}! 🎉`);
        onNavigateFeed();
      }
    } catch (err: any) {
      console.error("Publish ad error:", err);
      setErrorMessage(err.message || "Failed to publish ad. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md md:max-w-4xl lg:max-w-6xl mx-auto px-3.5 py-4 pb-20 space-y-4">
      
      {/* Page Title Header */}
      <div className="glass-card border border-orange-200/80 rounded-2xl p-3.5 shadow-2xs text-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-base shadow-xs shadow-orange-500/20">
            🚀
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 leading-tight">Post an Ad</h1>
            <p className="text-[11px] text-slate-500 font-medium">Get instant adds & followers</p>
          </div>
        </div>

        {/* Balance & Deposit Button */}
        <div className="flex items-center gap-1.5">
          <div className="font-extrabold text-[11px] text-amber-900 bg-amber-100/90 px-2.5 py-1 rounded-full border border-amber-200 shadow-2xs flex items-center gap-1">
            <span>🪙</span>
            <span>{userBalance.toLocaleString()} Cr</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Post Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 glass-card border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3.5 text-slate-800">
          
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
                    ? 'bg-yellow-400 text-slate-950 border-yellow-400 shadow-xs'
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
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
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
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
              3. Headline / Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                platform === 'snapchat'
                  ? "e.g. Add me for streaks & daily stories!"
                  : "e.g. Fresh Sneakers WhatsApp Support"
              }
              maxLength={80}
              className="w-full bg-white/80 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-all shadow-2xs font-medium"
            />
            <span className="text-[9px] text-slate-400 float-right mt-0.5 font-mono">
              {title.length}/80
            </span>
          </div>

          {/* Step 4: Handle or Phone Number */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
              4. {platform === 'snapchat' ? 'Snapchat Handle' : 'WhatsApp Number'}
            </label>
            <input
              type="text"
              value={targetHandleOrNumber}
              onChange={(e) => setTargetHandleOrNumber(e.target.value)}
              placeholder={
                platform === 'snapchat'
                  ? "@your_username"
                  : "+234 801 234 5678"
              }
              className="w-full bg-white/80 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold text-orange-600 placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-all shadow-2xs"
            />
          </div>

          {/* Step 5: Contact Photo & 3D Avatar */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              5. Profile Picture / Avatar
            </label>
            <AvatarPicker
              currentAvatarUrl={avatarUrl}
              seedName={targetHandleOrNumber || profile?.username || title || 'social'}
              platform={platform}
              onChangeAvatar={setAvatarUrl}
              label="Contact Profile Picture"
              description="Upload a photo from your phone or choose a 3D avatar"
            />
          </div>

          {/* Step 6: Category */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
              6. Category
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`py-1.5 px-1.5 rounded-lg text-[11px] font-bold border transition-all ${
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

          {/* Insufficient Credits Banner */}
          {!hasEnoughCredits && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl space-y-1.5 text-center">
              <p className="text-[11px] text-amber-900 font-bold">
                You have {userBalance} credits. You need {adCost - userBalance} more for {selectedDuration.label} ({adCost} Cr).
              </p>
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsDepositOpen(true)}
                  className="py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1 transition-all shadow-2xs"
                >
                  <Coins className="w-3 h-3" />
                  <span>Deposit (₦1,000)</span>
                </button>

                <button
                  type="button"
                  onClick={onNavigateFeed}
                  className="py-2 bg-amber-200/80 hover:bg-amber-300 border border-amber-300 text-amber-950 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1 transition-all shadow-2xs"
                >
                  <span>Earn Free on Feed</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !hasEnoughCredits}
            className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
              hasEnoughCredits
                ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20'
                : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none'
            }`}
          >
            <span>
              {isSubmitting
                ? 'Publishing Ad...'
                : `Post Ad (${selectedDuration.label}) • ${selectedDuration.costCredits} Credits`}
            </span>
          </button>

          <p className="text-[10px] text-slate-400 text-center font-medium">
            Your ad will be featured in the feed for exactly {selectedDuration.label}.
          </p>

        </form>

        {/* Right Column: Live Ad Preview (Desktop Only) */}
        <div className="hidden lg:block lg:col-span-5 sticky top-20 space-y-3">
          <div className="flex items-center justify-between text-xs font-extrabold text-slate-700 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live Ad Preview</span>
            </span>
            <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
              {selectedDuration.label}
            </span>
          </div>

          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-orange-200/90 shadow-sm space-y-3 transition-all">
            {/* Header: Profile Avatar + Info + Reward */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 border-2 border-orange-300 shadow-xs flex items-center justify-center">
                    <img
                      src={getEffectiveAvatar(avatarUrl, targetHandleOrNumber || profile?.username || 'user')}
                      alt="Preview Avatar"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-2xs border border-slate-200">
                    <PlatformIcon platform={platform} size="sm" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                        platform === 'snapchat'
                          ? 'bg-yellow-100/80 text-yellow-900 border-yellow-300/80'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300/80'
                      }`}
                    >
                      {platform === 'snapchat' ? 'Snapchat' : 'WhatsApp'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-bold">• {category}</span>
                  </div>
                  {profile?.username && (
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">by {profile.username}</p>
                  )}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 text-amber-900 px-2.5 py-1 rounded-full text-[11px] font-black flex items-center gap-1 shadow-2xs">
                <span>🪙</span>
                <span>+5 Credits</span>
              </div>
            </div>

            {/* Title */}
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm leading-snug">
                {title || 'Your Headline Will Appear Here...'}
              </h3>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-semibold">Username/Link:</span>
                <span className="font-mono text-xs font-bold text-slate-800 bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                  {targetHandleOrNumber || '@username_or_number'}
                </span>
              </div>
            </div>

            {/* Campaign Duration Indicator */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-orange-500" />
                  <span>Campaign Active: {selectedDuration.label}</span>
                </span>
                <span className="font-extrabold text-orange-600">{selectedDuration.costCredits} Credits</span>
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
              className={`w-full py-2.5 px-3 rounded-xl font-extrabold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5 shadow-sm ${
                platform === 'snapchat'
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              <span>Add on {platform === 'snapchat' ? 'Snapchat' : 'WhatsApp'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

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
