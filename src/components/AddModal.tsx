import React, { useState, useEffect } from 'react';
import { Ad, UserProfile } from '../types';
import { 
  X, 
  ExternalLink, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle, 
  Copy, 
  Check, 
  Clock, 
  UserCheck,
  QrCode,
  Smartphone,
  Download
} from 'lucide-react';
import QRCode from 'qrcode';
import { submitClaimVerification, generateVerificationCode, recordAdClick } from '../lib/transactions';
import { PlatformIcon } from './PlatformIcon';
import { getEffectiveAvatar, getEffectiveAdCover, getEffectiveAdDescription } from '../lib/avatar';
import { triggerHaptic, openNativeAppOrWeb } from '../lib/device';
import { getCreatorBadge } from '../lib/badges';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AddModalProps {
  ad: Ad;
  userId: string | null;
  profile: UserProfile | null;
  onClose: () => void;
  onSuccessClaim: (rewardAmount: number) => void;
  onRequireAuth: () => void;
}

export const AddModal: React.FC<AddModalProps> = ({
  ad,
  userId,
  profile,
  onClose,
  onSuccessClaim,
  onRequireAuth,
}) => {
  const isSnapchat = ad.platform === 'snapchat';

  // State
  const [activeMode, setActiveMode] = useState<'direct' | 'qrcode'>('direct');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [creatorProfile, setCreatorProfile] = useState<UserProfile | null>(null);
  const [verificationCode] = useState<string>(() => generateVerificationCode());
  const [snapchatHandle, setSnapchatHandle] = useState<string>(() => {
    return profile?.snapchatHandle || localStorage.getItem('amu_snap_handle') || '';
  });
  const [copiedCode, setCopiedCode] = useState(false);
  const [hasOpenedApp, setHasOpenedApp] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(6);
  const [timerRunning, setTimerRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cleanTarget = ad.targetHandleOrNumber.replace('@', '').trim();
  const cleanPhone = ad.targetHandleOrNumber.replace(/[^0-9]/g, '');

  // Pre-filled WhatsApp message
  const waMessage = `Hi! I found you on AddMeUp. Verification Code: #${verificationCode}`;
  const encodedWaMessage = encodeURIComponent(waMessage);

  const waWebLink = `https://wa.me/${cleanPhone}?text=${encodedWaMessage}`;
  const snapWebLink = `https://snapchat.com/add/${cleanTarget}`;
  const targetLink = isSnapchat ? snapWebLink : waWebLink;

  // Load creator profile to display reliability badge
  useEffect(() => {
    if (ad.userId) {
      getDoc(doc(db, 'users', ad.userId)).then((snap) => {
        if (snap.exists()) {
          setCreatorProfile(snap.data() as UserProfile);
        }
      }).catch(console.error);
    }
  }, [ad.userId]);

  // Generate QR code for instant scanning
  useEffect(() => {
    QRCode.toDataURL(targetLink, {
      width: 280,
      margin: 2,
      color: {
        dark: isSnapchat ? '#0f172a' : '#047857',
        light: '#ffffff',
      },
    })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [targetLink, isSnapchat]);

  const creatorBadge = getCreatorBadge(
    creatorProfile?.approvedClaimsCount || 0,
    creatorProfile?.totalClaimsCount || 0
  );

  const handleCopyCode = () => {
    triggerHaptic('light');
    navigator.clipboard.writeText(`#${verificationCode}`);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleOpenLink = () => {
    if (!userId) {
      triggerHaptic('warning');
      onRequireAuth();
      return;
    }

    if (isSnapchat && !snapchatHandle.trim()) {
      triggerHaptic('warning');
      setErrorMessage("Please enter your Snapchat username below so the ad creator can verify your add.");
      return;
    }

    if (isSnapchat && snapchatHandle.trim()) {
      localStorage.setItem('amu_snap_handle', snapchatHandle.trim());
    }

    triggerHaptic('medium');
    setHasOpenedApp(true);
    setTimerRunning(true);
    setSecondsLeft(6);
    setErrorMessage(null);

    // Increment click metric
    recordAdClick(ad.adId);

    // Launch native mobile app directly with deep linking (snapchat:// or whatsapp://)
    openNativeAppOrWeb(ad.platform, ad.targetHandleOrNumber, isSnapchat ? undefined : waMessage);
  };

  const handleScanReady = () => {
    if (!userId) {
      triggerHaptic('warning');
      onRequireAuth();
      return;
    }

    if (isSnapchat && !snapchatHandle.trim()) {
      triggerHaptic('warning');
      setErrorMessage("Please enter your Snapchat username below so the ad creator can verify your add.");
      return;
    }

    if (isSnapchat && snapchatHandle.trim()) {
      localStorage.setItem('amu_snap_handle', snapchatHandle.trim());
    }

    triggerHaptic('medium');
    setHasOpenedApp(true);
    setTimerRunning(true);
    setSecondsLeft(6);
    setErrorMessage(null);

    // Increment click metric
    recordAdClick(ad.adId);
  };

  useEffect(() => {
    let timer: any = null;
    if (timerRunning && secondsLeft > 0) {
      timer = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      setTimerRunning(false);
    }
    return () => clearInterval(timer);
  }, [timerRunning, secondsLeft]);

  const handleSubmitVerification = async () => {
    if (!userId) {
      onRequireAuth();
      return;
    }

    if (isSnapchat && !snapchatHandle.trim()) {
      setErrorMessage("Please enter your Snapchat username so the creator can verify you.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const result = await submitClaimVerification({
        ad,
        claimerUid: userId,
        claimerDisplayName: profile?.username || 'Social Member',
        verificationCode: isSnapchat ? undefined : verificationCode,
        claimerSnapchatHandle: isSnapchat ? snapchatHandle.trim() : undefined,
      });

      if (result.success) {
        triggerHaptic('success');
        setIsSubmittedSuccess(true);
        onSuccessClaim(result.creditsAwarded);
      }
    } catch (err: any) {
      triggerHaptic('warning');
      console.error("Verification submit error:", err);
      setErrorMessage(err.message || "Could not submit verification claim.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in modal-safe-overlay">
      <div className="glass-card-dark border border-white/20 rounded-2xl p-4 sm:p-5 max-w-sm w-full text-white shadow-2xl relative overflow-hidden max-h-[92vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all z-10"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Modal Hero Cover & Header */}
        <div className="-mx-5 -mt-5 mb-4 rounded-t-3xl overflow-hidden relative">
          <div className="relative w-full h-32 bg-slate-900 overflow-hidden">
            <img
              src={getEffectiveAdCover(ad)}
              alt={ad.title}
              className="w-full h-full object-cover brightness-[0.75]"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/50" />
            
            <div className="absolute top-3 left-3 flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide shadow-md ${
                isSnapchat ? 'bg-yellow-400 text-slate-950' : 'bg-emerald-600 text-white'
              }`}>
                <PlatformIcon platform={ad.platform} size="sm" />
                <span>{isSnapchat ? 'Snapchat' : 'WhatsApp'}</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/50 text-white backdrop-blur-md">
                {ad.category}
              </span>
            </div>
          </div>

          {/* Avatar and Creator Profile Info Overlay */}
          <div className="px-5 -mt-8 relative z-10 flex items-end justify-between gap-3">
            <div className="flex items-end gap-3">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 border-2 border-white shadow-xl flex items-center justify-center">
                  <img
                    src={getEffectiveAvatar(ad.avatarUrl, ad.targetHandleOrNumber || ad.userDisplayName || ad.title)}
                    alt={ad.userDisplayName || 'Contact'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-slate-900 p-0.5 rounded-full shadow-xs border border-white/20">
                  <PlatformIcon platform={ad.platform} size="sm" />
                </div>
              </div>

              <div className="mb-0.5">
                <h2 className="text-base font-black text-white leading-tight">
                  {isSnapchat ? 'Add on Snapchat' : 'Message on WhatsApp'}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-xs font-bold text-amber-300">
                    {ad.targetHandleOrNumber}
                  </span>
                  {creatorBadge && (
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-black border ${creatorBadge.bgClass} ${creatorBadge.colorClass} ${creatorBadge.borderClass}`}>
                      <span>{creatorBadge.icon}</span>
                      <span>{creatorBadge.shortLabel}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-orange-500 text-white px-2.5 py-1 rounded-full text-[11px] font-black shadow-md flex items-center gap-1 mb-1">
              <span>🪙</span>
              <span>+{ad.rewardPerAdd || 5} Cr</span>
            </div>
          </div>

          <div className="px-5 mt-2.5">
            <h3 className="text-sm font-bold text-slate-200 leading-snug">
              {ad.title}
            </h3>
            <p className="text-xs text-slate-300 font-normal leading-relaxed mt-1 bg-white/5 border border-white/10 rounded-xl p-2.5">
              {getEffectiveAdDescription(ad)}
            </p>
          </div>
        </div>

        {/* SUCCESS CONFIRMATION SCREEN */}
        {isSubmittedSuccess ? (
          <div className="space-y-3 text-center py-2 animate-fade-in">
            <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-400/50 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-sm font-black text-white">
                Verification Submitted!
              </h3>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                {isSnapchat ? (
                  <>The creator will verify friend request from <span className="font-mono text-amber-300 font-bold">@{snapchatHandle.replace('@', '')}</span> in their Snapchat app.</>
                ) : (
                  <>The creator will verify code <span className="font-mono text-amber-300 font-bold">#{verificationCode}</span> in their WhatsApp chat.</>
                )}
              </p>
            </div>

            <div className="bg-white/10 border border-white/15 p-2.5 rounded-xl text-left space-y-1">
              <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>Approval & Protection</span>
              </div>
              <p className="text-[10px] text-slate-300 leading-snug">
                Once approved, <span className="font-bold text-white">+{ad.rewardPerAdd || 5} Points</span> are credited to your wallet. If the creator takes longer than 24h, claims are auto-approved.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all"
            >
              Done & Return to Feed
            </button>
          </div>
        ) : (
          /* VERIFICATION STEPS SCREEN */
          <div className="space-y-3">
            
            {/* Mode Switcher: Direct App vs QR Code */}
            <div className="flex bg-slate-900/90 p-0.5 rounded-xl border border-white/15 text-[11px] font-extrabold">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setActiveMode('direct');
                }}
                className={`flex-1 py-1 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeMode === 'direct'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                <span>Open in App</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setActiveMode('qrcode');
                }}
                className={`flex-1 py-1 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeMode === 'qrcode'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-3 h-3" />
                <span>Scan QR Code</span>
              </button>
            </div>

            {/* Target Account Badge */}
            <div className="bg-white/10 rounded-xl p-2 border border-white/15 text-center">
              <span className="text-[9px] text-slate-300 uppercase tracking-widest font-bold block mb-0.5">
                Target {isSnapchat ? 'Snapchat Handle' : 'WhatsApp Number'}
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-amber-300 bg-slate-900/80 px-2.5 py-0.5 rounded-md border border-white/10 inline-block">
                {ad.targetHandleOrNumber}
              </span>
            </div>

            {/* Platform-Specific Verification Inputs */}
            {isSnapchat ? (
              /* SNAPCHAT: Earner enters their Snapchat handle */
              <div className="bg-white/5 border border-white/15 rounded-xl p-2.5 space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-200 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-amber-400" />
                  <span>Your Snapchat Username (to verify add):</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono font-bold">@</span>
                  <input
                    type="text"
                    value={snapchatHandle.replace('@', '')}
                    onChange={(e) => setSnapchatHandle(e.target.value.replace(/[@\s]/g, ''))}
                    placeholder="your_snapchat_name"
                    className="w-full bg-slate-900/80 border border-white/20 rounded-lg pl-6 pr-2.5 py-1.5 text-xs font-mono font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 space-y-1 text-slate-300 text-[10px]">
                  <p className="font-semibold text-amber-300 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>How it works:</span>
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    When you tap <strong>"Open Snapchat Profile"</strong>, you'll be redirected directly to <strong>@{cleanTarget}</strong>. Once you add them, their app notifies them in <strong>"Added Me"</strong> with your username <strong>@{snapchatHandle ? snapchatHandle.replace('@', '') : 'your_handle'}</strong> to release your points.
                  </p>
                </div>
              </div>
            ) : (
              /* WHATSAPP: Auto-generated code */
              <div className="bg-white/5 border border-white/15 rounded-xl p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Your WhatsApp Verification Code:</span>
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="text-[9px] bg-white/15 hover:bg-white/25 px-1.5 py-0.5 rounded text-amber-300 font-bold flex items-center gap-1"
                  >
                    {copiedCode ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="bg-slate-900/90 border border-emerald-500/30 rounded-lg p-2 text-center">
                  <span className="text-base font-black font-mono tracking-wider text-emerald-400">
                    #{verificationCode}
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 leading-tight">
                  Pre-filled in chat. The creator checks this code in their WhatsApp inbox to verify.
                </p>
              </div>
            )}

            {/* DIRECT MODE OR QR CODE MODE */}
            {activeMode === 'qrcode' ? (
              /* QR CODE QUICK SCAN */
              <div className="bg-white/10 border border-white/15 rounded-2xl p-3 text-center space-y-2.5">
                <div className="bg-white p-2.5 rounded-xl inline-block shadow-inner mx-auto">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Quick Scan QR Code"
                      className="w-40 h-40 sm:w-44 sm:h-44 rounded-lg mx-auto object-contain"
                    />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center text-slate-400 text-xs">
                      Generating QR...
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-amber-300">
                    Scan with your phone camera or {isSnapchat ? 'Snapchat app' : 'WhatsApp'}
                  </p>
                  <p className="text-[9px] text-slate-300">
                    Add or message <span className="font-mono font-bold text-white">{ad.targetHandleOrNumber}</span> directly!
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {qrDataUrl && (
                    <a
                      href={qrDataUrl}
                      download={`amu_${isSnapchat ? 'snap' : 'wa'}_${cleanTarget}.png`}
                      className="py-1.5 px-2 bg-white/15 hover:bg-white/25 rounded-xl text-[10px] font-extrabold text-slate-200 flex items-center justify-center gap-1 transition-all"
                    >
                      <Download className="w-3 h-3" />
                      <span>Save QR</span>
                    </a>
                  )}

                  <button
                    onClick={handleScanReady}
                    className="flex-1 py-2 px-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95"
                  >
                    I Scanned It → Continue
                  </button>
                </div>
              </div>
            ) : !hasOpenedApp ? (
              /* Step 1: Open App Button */
              <div className="space-y-2">
                <button
                  onClick={handleOpenLink}
                  className={`w-full py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 ${
                    isSnapchat
                      ? 'bg-yellow-400 hover:bg-yellow-300 text-slate-950 shadow-yellow-400/20'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  }`}
                >
                  <PlatformIcon platform={ad.platform} size="sm" />
                  <span>{isSnapchat ? 'Open Snapchat to Add' : 'Send Code on WhatsApp'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <p className="text-[9px] text-slate-300 text-center leading-relaxed">
                  Tap above to perform the add. Then return here to submit verification!
                </p>
              </div>
            ) : null}

            {/* Step 2: Timer & Submit Verification Button */}
            {hasOpenedApp && (
              <div className="space-y-2.5">
                {secondsLeft > 0 ? (
                  <div className="bg-white/10 border border-white/15 p-2.5 rounded-xl text-center space-y-1">
                    <div className="relative w-8 h-8 mx-auto flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-white/20"
                          strokeWidth="3"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className={isSnapchat ? 'text-amber-400' : 'text-emerald-400'}
                          strokeDasharray={`${(secondsLeft / 6) * 100}, 100`}
                          strokeWidth="3"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute font-black text-[10px] text-white">
                        {secondsLeft}s
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-white">
                      Confirming your engagement...
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={handleSubmitVerification}
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5 transform active:scale-95 transition-all"
                  >
                    <span>
                      {isSubmitting ? 'Submitting...' : `Submit Verification (+${ad.rewardPerAdd || 5} Cr)`}
                    </span>
                  </button>
                )}

                {/* Re-open Link Option */}
                <button
                  onClick={handleOpenLink}
                  className="w-full text-center text-[9px] text-slate-300 hover:text-white underline underline-offset-2 py-0.5 font-medium"
                >
                  Didn't open properly? Tap to retry
                </button>
              </div>
            )}

            {/* Error Message if any */}
            {errorMessage && (
              <div className="bg-rose-500/20 border border-rose-400/40 text-rose-200 p-2 rounded-lg text-[10px] font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-300 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Fair-Play Footnote */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-center gap-1 text-[9px] text-slate-400">
              <ShieldCheck className="w-2.5 h-2.5 text-slate-300" />
              <span>Hybrid Anti-Fraud • 24h Auto-Approval Guarantee</span>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
