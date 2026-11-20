import React, { useEffect, useState } from 'react';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { notifyPasswordChangedEmail } from '../lib/emails';
import { Logo } from './Logo';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';

interface ResetPasswordModalProps {
  oobCode: string;
  onClose: () => void;
  onSuccessSignIn?: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  oobCode,
  onClose,
  onSuccessSignIn,
}) => {
  const [verifying, setVerifying] = useState(true);
  const [accountEmail, setAccountEmail] = useState<string>('');
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    setVerifying(true);
    setVerifyError(null);

    verifyPasswordResetCode(auth, oobCode)
      .then((email) => {
        if (active) {
          setAccountEmail(email);
          setVerifying(false);
        }
      })
      .catch((err: any) => {
        if (active) {
          const code = err?.code || '';
          if (code === 'auth/expired-action-code') {
            setVerifyError('This password reset link has expired. Please request a new reset link.');
          } else if (code === 'auth/invalid-action-code') {
            setVerifyError('This password reset link is invalid or has already been used.');
          } else {
            setVerifyError(err?.message || 'Could not verify this password reset link.');
          }
          setVerifying(false);
        }
      });

    return () => {
      active = false;
    };
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (newPassword.length < 6) {
      setSubmitError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPass) {
      setSubmitError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      if (accountEmail) {
        notifyPasswordChangedEmail({
          toEmail: accountEmail,
          userName: accountEmail.split('@')[0],
        }).catch(() => {});
      }
      setDone(true);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/expired-action-code' || code === 'auth/invalid-action-code') {
        setSubmitError('This reset link has expired or already been used. Request a fresh link.');
      } else if (code === 'auth/weak-password') {
        setSubmitError('Please choose a stronger password (at least 6 characters).');
      } else {
        setSubmitError(err?.message || 'Could not update your password. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-sm w-full text-slate-800 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-5">
          <div className="flex justify-center mb-3">
            <Logo size="lg" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Set New Password</h2>
          {accountEmail && !verifyError && (
            <p className="text-xs text-slate-500 mt-1 font-medium">
              For <strong className="text-slate-800">{accountEmail}</strong>
            </p>
          )}
        </div>

        {verifying ? (
          <div className="py-8 flex flex-col items-center gap-3 text-xs font-semibold text-slate-500">
            <RefreshCw className="w-6 h-6 text-orange-500 animate-spin" />
            <span>Verifying reset link...</span>
          </div>
        ) : verifyError ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{verifyError}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onSuccessSignIn?.();
              }}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl text-xs"
            >
              Return to Sign In
            </button>
          </div>
        ) : done ? (
          <div className="text-center space-y-4 py-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">Password Updated</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your new password is active. You can now sign in with <strong>{accountEmail}</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onSuccessSignIn?.();
              }}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-2xl text-xs"
            >
              Sign In Now
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {submitError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-11 py-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">Confirm New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold rounded-2xl text-xs shadow-md"
            >
              {submitting ? 'Updating Password...' : 'Save New Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
