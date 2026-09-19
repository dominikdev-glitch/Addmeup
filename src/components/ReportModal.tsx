import React, { useState } from 'react';
import { ReportReason, Ad } from '../types';
import { reportAd } from '../lib/transactions';
import { X, Flag, AlertTriangle, CheckCircle2, ShieldAlert, RefreshCw } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  ad: Ad | null;
  reporterUid: string | null;
  onReportSubmitted: (adId: string) => void;
  onToast: (msg: string) => void;
}

const REPORT_REASONS: { id: ReportReason; label: string; description: string }[] = [
  {
    id: 'spam_bot',
    label: 'Spam, Fake Account, or Bot',
    description: 'The handle does not exist, uses bot automation, or posts duplicate spam.',
  },
  {
    id: 'broken_link',
    label: 'Broken Handle or Inactive Number',
    description: 'Snapchat username not found or WhatsApp number is dead / unreachable.',
  },
  {
    id: 'inappropriate_content',
    label: 'Inappropriate or Adult Content',
    description: 'Contains NSFW material, hate speech, or violates community safety.',
  },
  {
    id: 'harassment_fraud',
    label: 'Scam, Fraud, or Harassment',
    description: 'Attempts phishing, requesting money, or harassment.',
  },
  {
    id: 'other',
    label: 'Other Issue',
    description: 'Any other issue not covered above.',
  },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  ad,
  reporterUid,
  onReportSubmitted,
  onToast,
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason>('spam_bot');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen || !ad) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reporterUid) {
      onToast('Please sign in to report this ad.');
      return;
    }

    try {
      setIsSubmitting(true);
      await reportAd({
        adId: ad.adId,
        reportedUserId: ad.userId,
        reporterUid,
        reason: selectedReason,
        details,
      });

      setIsSubmitted(true);
      onReportSubmitted(ad.adId);
      onToast('Report received. Thank you for keeping our community safe!');
    } catch (err: any) {
      console.error('Report submission error:', err);
      onToast(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsSubmitted(false);
    setDetails('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div className="glass-card border border-white/80 rounded-2xl p-4 sm:p-5 max-w-sm w-full text-slate-800 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleClose}
          className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all z-10"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200 shadow-2xs">
                <Flag className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 leading-tight">Report Listing</h2>
                <p className="text-[11px] text-slate-500 font-medium truncate max-w-[200px]">
                  {ad.title} ({ad.targetHandleOrNumber})
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                Why are you reporting this ad?
              </label>

              <div className="space-y-1.5">
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedReason === r.id
                        ? 'border-rose-500 bg-rose-50/60 ring-1 ring-rose-500/20 text-slate-900 font-semibold'
                        : 'border-slate-200 bg-white/70 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={r.id}
                      checked={selectedReason === r.id}
                      onChange={() => setSelectedReason(r.id)}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <div className="font-extrabold text-[11px]">{r.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5">
                        {r.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Additional Details (Optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe what happened or why this listing violates terms..."
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="pt-1 flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-sm shadow-rose-600/25 flex items-center justify-center gap-1.5 transition-all disabled:bg-slate-300"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Report</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Report Submitted</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Our automated moderation and review team will examine this ad. We have hidden it from your feed.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
