import React from 'react';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  Coins, 
  CreditCard, 
  ShieldCheck, 
  Copy, 
  Check, 
  Download,
  Building2,
  Calendar,
  Mail,
  Hash
} from 'lucide-react';
import { Logo } from './Logo';

export interface ReceiptData {
  referenceId: string;
  amountNgn: number;
  credits: number;
  paymentMethod?: string;
  createdAt?: number;
  userEmail?: string;
  userId?: string;
}

interface DepositReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptData | null;
  onToast?: (msg: string) => void;
}

export const DepositReceiptModal: React.FC<DepositReceiptModalProps> = ({
  isOpen,
  onClose,
  receipt,
  onToast,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !receipt) return null;

  const dateStr = receipt.createdAt 
    ? new Date(receipt.createdAt).toLocaleString('en-NG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('en-NG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

  const handleCopyRef = () => {
    if (!receipt.referenceId) return;
    navigator.clipboard.writeText(receipt.referenceId);
    setCopied(true);
    if (onToast) onToast('Reference ID copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Bar (Screen Only) */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">Official Deposit Receipt</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Paper Container */}
        <div id="deposit-receipt-print-area" className="p-6 overflow-y-auto space-y-5 bg-white">
          
          {/* Receipt Brand Header */}
          <div className="flex flex-col items-center text-center pb-4 border-b border-dashed border-slate-200 space-y-2">
            <Logo size="md" showText={true} subtitle="Official Transaction Voucher" />
            
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-xs font-extrabold shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>PAYMENT VERIFIED & CREDITED</span>
            </div>
          </div>

          {/* Amount & Points Badge */}
          <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100/60 border border-orange-200/80 rounded-2xl p-4 text-center space-y-1">
            <p className="text-[11px] font-bold text-orange-700 uppercase tracking-wider">Total Amount Paid</p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ₦{(receipt.amountNgn || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs font-extrabold text-emerald-600 flex items-center justify-center gap-1">
              <Coins className="w-3.5 h-3.5 fill-current" />
              <span>+{receipt.credits} Points Credited to Balance</span>
            </p>
          </div>

          {/* Detailed Transaction Breakdown */}
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span>Reference</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-slate-800 text-[11px] truncate max-w-[170px]">
                  {receipt.referenceId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyRef}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 print:hidden"
                  title="Copy reference"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Date & Time</span>
              </span>
              <span className="font-semibold text-slate-800">{dateStr}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                <span>Channel</span>
              </span>
              <span className="font-semibold text-slate-800">
                {receipt.paymentMethod || 'Paystack Instant Payment'}
              </span>
            </div>

            {receipt.userEmail && (
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Customer Email</span>
                </span>
                <span className="font-semibold text-slate-800 truncate max-w-[190px]">
                  {receipt.userEmail}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Security</span>
              </span>
              <span className="font-semibold text-emerald-600">PCI-DSS Encrypted / Real Money</span>
            </div>
          </div>

          {/* Verification Notice */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-left">
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              💡 <strong>Instant Settlement:</strong> Your payment has been verified and points credited to your wallet balance. Keep this reference for support inquiries.
            </p>
          </div>

          {/* Footer note */}
          <div className="pt-2 text-center text-[10px] text-slate-400 space-y-0.5">
            <p className="font-semibold">AddMeUp Technologies Nigeria • https://addmeup.ng</p>
            <p>24/7 Agent Support (WhatsApp): +234 904 046 4774</p>
          </div>
        </div>

        {/* Action Buttons (Screen Only) */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex gap-2.5 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print / Save PDF</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95"
          >
            <span>Close Receipt</span>
          </button>
        </div>

      </div>
    </div>
  );
};
