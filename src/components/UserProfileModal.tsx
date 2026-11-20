import React, { useState } from 'react';
import { UserProfile } from '../types';
import { X, LogOut, User, Save, ShieldAlert, Lock, ChevronDown, ChevronUp, Mail } from 'lucide-react';
import { PlatformIcon } from './PlatformIcon';
import { AvatarPicker } from './AvatarPicker';
import { normalizeWhatsAppNumber, parseSmartPhone } from '../lib/phone';

interface UserProfileModalProps {
  profile: UserProfile | null;
  onClose: () => void;
  onUpdateHandles: (snapchat: string, whatsapp: string, username?: string, photoUrl?: string) => Promise<void>;
  onChangePassword?: (currentPassword: string, newPassword: string) => Promise<void>;
  onSendPasswordReset?: (email: string) => Promise<void>;
  onSignOut: () => void;
  onToast: (msg: string) => void;
  onOpenAdmin?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  profile,
  onClose,
  onUpdateHandles,
  onChangePassword,
  onSendPasswordReset,
  onSignOut,
  onToast,
  onOpenAdmin,
}) => {
  const [username, setUsername] = useState(profile?.username || '');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(profile?.photoUrl || undefined);
  const [snapchatHandle, setSnapchatHandle] = useState(profile?.snapchatHandle || '');
  const [whatsappNumber, setWhatsappNumber] = useState(profile?.whatsappNumber || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const cleanedWhatsapp = whatsappNumber.trim() ? normalizeWhatsAppNumber(whatsappNumber) : '';
      await onUpdateHandles(snapchatHandle.trim(), cleanedWhatsapp, username.trim(), photoUrl);
      onToast("Profile & photo updated! ✅");
      onClose();
    } catch (err) {
      console.error("Save profile error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!onChangePassword) return;
    setPasswordNotice(null);
    if (newPassword.length < 6) {
      setPasswordNotice({ type: 'err', text: 'New password must be at least 6 characters.' });
      return;
    }
    try {
      setIsUpdatingPassword(true);
      await onChangePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setPasswordNotice({ type: 'ok', text: 'Password updated! Security alert sent to your email.' });
      onToast('Password updated! Security confirmation emailed.');
    } catch (err: any) {
      setPasswordNotice({ type: 'err', text: err?.message || 'Could not update password.' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!onSendPasswordReset || !profile?.email) return;
    setPasswordNotice(null);
    try {
      setIsUpdatingPassword(true);
      await onSendPasswordReset(profile.email);
      setPasswordNotice({ type: 'ok', text: `Reset link sent to ${profile.email}` });
      onToast(`Password reset email sent to ${profile.email}`);
    } catch (err: any) {
      setPasswordNotice({ type: 'err', text: err?.message || 'Could not send reset link.' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/40 backdrop-blur-md animate-fade-in overflow-y-auto modal-safe-overlay">
      <div className="glass-card border border-white/80 rounded-3xl p-5 sm:p-6 max-w-sm w-full text-slate-800 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/60 border border-slate-200/80 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 font-bold text-lg shadow-2xs">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Your Profile</h2>
            <p className="text-[11px] text-slate-500 font-medium">Default avatar & social handles</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-3.5">
          
          {/* Avatar Picker for User Profile */}
          <AvatarPicker
            currentAvatarUrl={photoUrl}
            seedName={username || profile?.username || 'user'}
            onChangeAvatar={setPhotoUrl}
            label="Your Profile Picture"
            description="Upload a photo from your phone or choose a 3D avatar"
          />

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Alex"
              className="w-full bg-white/80 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1.5">
              <PlatformIcon platform="snapchat" size="sm" />
              <span>Default Snapchat Handle</span>
            </label>
            <input
              type="text"
              value={snapchatHandle}
              onChange={(e) => setSnapchatHandle(e.target.value)}
              placeholder="@your_username"
              className="w-full bg-white/80 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold text-orange-600 placeholder-slate-400 focus:outline-none focus:border-orange-500 shadow-2xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <PlatformIcon platform="whatsapp" size="sm" />
                <span>Default WhatsApp Number</span>
              </label>
              <span className="text-[10px] font-bold text-emerald-600">⚡ Auto-Fix</span>
            </div>
            <input
              type="text"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              onBlur={() => {
                if (whatsappNumber.trim()) {
                  const smart = parseSmartPhone(whatsappNumber);
                  if (smart.isValid && smart.formattedDisplay) {
                    setWhatsappNumber(smart.formattedDisplay);
                  }
                }
              }}
              placeholder="e.g. 08108237903, 8108237903, or +234..."
              className="w-full bg-white/80 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold text-emerald-700 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
            />
            {whatsappNumber.trim() && (() => {
              const smart = parseSmartPhone(whatsappNumber);
              return (
                <div className="mt-1.5 p-2 rounded-lg bg-emerald-50/80 border border-emerald-200/80 text-[11px] text-emerald-900 space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold flex items-center gap-1 truncate">
                      <span>{smart.isNigerian ? '🇳🇬' : '🌍'}</span>
                      <span>Format: {smart.formattedDisplay}</span>
                    </span>
                    {smart.isValid && (
                      <span className="text-[9px] px-1 bg-emerald-600 text-white rounded font-bold">
                        OK
                      </span>
                    )}
                  </div>
                  {smart.correctionApplied && (
                    <p className="text-[10px] text-emerald-700 font-medium">
                      ✨ {smart.correctionApplied}
                    </p>
                  )}
                </div>
              );
            })()}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-95 mt-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </form>

        {/* Password & Security Collapsible Section */}
        {(onChangePassword || onSendPasswordReset) && (
          <div className="mt-3 pt-3 border-t border-slate-200/60">
            <button
              type="button"
              onClick={() => setShowSecurity((v) => !v)}
              className="w-full py-2 px-3 bg-white/80 hover:bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-between transition-all"
            >
              <span className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-orange-500" />
                <span>Password &amp; Security</span>
              </span>
              {showSecurity ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showSecurity && (
              <div className="mt-2.5 p-3 rounded-xl bg-slate-50/90 border border-slate-200 space-y-2.5">
                {passwordNotice && (
                  <div className={`p-2 rounded-lg text-[11px] font-semibold ${passwordNotice.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {passwordNotice.text}
                  </div>
                )}

                {onChangePassword && (
                  <>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Current password (if set)"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password (min 6 chars)"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                    />
                    <button
                      type="button"
                      disabled={isUpdatingPassword}
                      onClick={handlePasswordSubmit}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all"
                    >
                      {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                  </>
                )}

                {onSendPasswordReset && profile?.email && (
                  <button
                    type="button"
                    disabled={isUpdatingPassword}
                    onClick={handleSendResetEmail}
                    className="w-full py-1.5 bg-white hover:bg-orange-50 border border-slate-200 text-orange-600 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Mail className="w-3 h-3" />
                    <span>Email Password Reset Link</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Admin Dashboard Quick Launch for Admins */}
        {profile?.isAdmin && onOpenAdmin && (
          <div className="mt-3 pt-3 border-t border-slate-200/60">
            <button
              onClick={() => {
                onClose();
                onOpenAdmin();
              }}
              className="w-full py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:brightness-110 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Open Admin Dashboard</span>
            </button>
          </div>
        )}

        {/* Sign Out Button */}
        <div className="mt-4 pt-3 border-t border-slate-200/60">
          <button
            onClick={() => {
              onSignOut();
              onClose();
            }}
            className="w-full py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>

      </div>
    </div>
  );
};
