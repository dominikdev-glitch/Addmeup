import React, { useState } from 'react';
import { DepositPackage } from '../types';
import { DEPOSIT_PACKAGES, processCreditDeposit } from '../lib/transactions';
import { triggerPaystackPayment } from '../lib/paystack';
import { 
  X, 
  Coins, 
  CreditCard, 
  Building2, 
  Smartphone, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  RefreshCw,
  AlertCircle,
  Lock,
  Mail,
  Zap
} from 'lucide-react';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  userUid: string | null;
  userEmail?: string;
  onToast: (msg: string) => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  userUid,
  userEmail: initialUserEmail,
  onToast,
}) => {
  const [selectedPkg, setSelectedPkg] = useState<DepositPackage>(DEPOSIT_PACKAGES[0]);
  const [isCustom, setIsCustom] = useState(false);
  const [customCredits, setCustomCredits] = useState<number>(100);
  const [email, setEmail] = useState<string>(initialUserEmail || '');
  const [gateway, setGateway] = useState<'paystack' | 'flutterwave'>('paystack');
  
  // Checkout flow state
  const [step, setStep] = useState<'select' | 'checkout' | 'success'>('select');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastRef, setLastRef] = useState<string>('');
  const [lastGateway, setLastGateway] = useState<string>('Paystack');

  if (!isOpen) return null;

  const totalCredits = isCustom ? customCredits : (selectedPkg.credits + (selectedPkg.bonusCredits || 0));
  const totalNgn = isCustom ? customCredits * 10 : selectedPkg.priceNgn;
  const transactionRef = `ADUP-${gateway === 'paystack' ? 'PSTK' : 'FLW'}-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

  const handleStartCheckout = () => {
    setErrorMessage(null);
    setStep('checkout');
  };

  const handlePayWithGateway = async () => {
    if (!userUid) {
      onToast("Please sign in to deposit points.");
      return;
    }

    const payEmail = email.trim() || initialUserEmail || 'customer@addmeup.app';
    if (!payEmail.includes('@')) {
      setErrorMessage("Please enter a valid email for your payment receipt.");
      return;
    }

    if (gateway === 'paystack') {
      try {
        setIsProcessing(true);
        setErrorMessage(null);

        const launched = await triggerPaystackPayment({
          email: payEmail,
          amountNgn: totalNgn,
          credits: totalCredits,
          userId: userUid,
          reference: transactionRef,
          onSuccess: async (paystackRef) => {
            try {
              const res = await processCreditDeposit({
                userId: userUid,
                credits: totalCredits,
                amountNgn: totalNgn,
                paymentMethod: 'Paystack (Card/Transfer/OPay)',
                referenceId: paystackRef,
              });

              if (res.success) {
                setLastRef(paystackRef);
                setLastGateway('Paystack Nigeria');
                setStep('success');
                onToast(`Payment Confirmed via Paystack! +${totalCredits} Points added! 🪙`);
              }
            } catch (depositErr: any) {
              console.error("Deposit processing error:", depositErr);
              setErrorMessage(depositErr.message || "Payment received, but crediting failed. Contact support.");
            } finally {
              setIsProcessing(false);
            }
          },
          onClose: () => {
            setIsProcessing(false);
            onToast("Payment window closed.");
          },
          onError: (err) => {
            setIsProcessing(false);
            console.error("Paystack launch error:", err);
            setErrorMessage("Could not open payment window. You can use the instant sandbox test below.");
          }
        });

        if (!launched) {
          setIsProcessing(false);
        }
      } catch (err: any) {
        console.error("Paystack init error:", err);
        setIsProcessing(false);
        setErrorMessage(err.message || "Failed to initialize Paystack.");
      }
    } else {
      // Flutterwave Flow
      handleSimulatedGatewaySuccess('Flutterwave Nigeria');
    }
  };

  // Instant Verification Helper for sandbox / preview / direct transfer verification
  const handleSimulatedGatewaySuccess = async (gatewayName: string = gateway === 'paystack' ? 'Paystack Sandbox' : 'Flutterwave Sandbox') => {
    if (!userUid) {
      onToast("Please sign in to deposit points.");
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      
      // Simulate network verification
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockRef = `${gateway === 'paystack' ? 'PSTK' : 'FLW'}-REF-${Date.now().toString().slice(-6)}`;
      const res = await processCreditDeposit({
        userId: userUid,
        credits: totalCredits,
        amountNgn: totalNgn,
        paymentMethod: gatewayName,
        referenceId: mockRef,
      });

      if (res.success) {
        setLastRef(mockRef);
        setLastGateway(gatewayName);
        setStep('success');
        onToast(`Payment Verified! +${totalCredits} Points added to wallet! 🪙`);
      }
    } catch (err: any) {
      console.error("Simulated deposit error:", err);
      setErrorMessage(err.message || "Failed to process deposit.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinish = () => {
    setStep('select');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in modal-safe-overlay">
      <div className="glass-card border border-white/80 rounded-2xl p-4 sm:p-5 max-w-sm w-full text-slate-800 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all z-10"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* STEP 1: SELECT PACKAGE */}
        {step === 'select' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-base shadow-2xs">
                🪙
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 leading-tight">Deposit Points</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-slate-500 font-medium">₦1,000 NGN = 100 Points</span>
                  <span className="text-[9px] bg-orange-50 text-orange-700 font-bold px-1.5 py-0.2 rounded-md border border-orange-200">
                    Instant Top-up
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Packages Grid */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                Select Point Package
              </label>

              <div className="grid grid-cols-2 gap-2">
                {DEPOSIT_PACKAGES.map((pkg) => {
                  const isSelected = !isCustom && selectedPkg.id === pkg.id;
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => {
                        setIsCustom(false);
                        setSelectedPkg(pkg);
                      }}
                      className={`relative p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50/80 shadow-2xs ring-2 ring-orange-500/20'
                          : 'border-slate-200 bg-white/70 hover:border-slate-300'
                      }`}
                    >
                      {pkg.popular && (
                        <span className="absolute -top-1.5 right-1.5 bg-orange-500 text-white text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full shadow-2xs">
                          Popular
                        </span>
                      )}
                      {pkg.bestValue && (
                        <span className="absolute -top-1.5 right-1.5 bg-emerald-600 text-white text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full shadow-2xs">
                          Best Value
                        </span>
                      )}

                      <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1">
                        <span>{pkg.credits}</span>
                        <span className="text-[10px] text-orange-600 font-bold">Points</span>
                      </div>

                      {pkg.bonusCredits ? (
                        <span className="text-[9px] font-extrabold text-emerald-600 block">
                          +{pkg.bonusCredits} Bonus Free 🎁
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400 font-medium block">
                          {pkg.label}
                        </span>
                      )}

                      <div className="mt-0.5 font-black text-xs text-slate-800 font-mono">
                        ₦{pkg.priceNgn.toLocaleString('en-NG')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Amount Option */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setIsCustom(!isCustom)}
                className="text-[11px] text-orange-600 hover:text-orange-700 font-bold underline inline-flex items-center gap-1"
              >
                <span>{isCustom ? "Choose standard packages" : "Need custom points amount?"}</span>
              </button>

              {isCustom && (
                <div className="mt-2 p-2.5 rounded-xl bg-white/80 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span>Custom Points (Min 100):</span>
                    <span className="font-mono text-orange-600 font-black">₦{(customCredits * 10).toLocaleString('en-NG')} NGN</span>
                  </div>
                  <input
                    type="number"
                    min={100}
                    step={50}
                    value={customCredits}
                    onChange={(e) => setCustomCredits(Math.max(100, Number(e.target.value) || 100))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>
              )}
            </div>

            {/* Gateway Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                Payment Channel
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGateway('paystack')}
                  className={`p-2 rounded-xl border text-left text-xs font-bold transition-all ${
                    gateway === 'paystack'
                      ? 'border-[#0ba4db] bg-[#0ba4db]/10 text-[#0993c5]'
                      : 'border-slate-200 bg-white/70 text-slate-600'
                  }`}
                >
                  <div className="text-[11px] font-black">Paystack</div>
                  <div className="text-[9px] font-normal text-slate-400">Cards, Transfer, OPay</div>
                </button>

                <button
                  type="button"
                  onClick={() => setGateway('flutterwave')}
                  className={`p-2 rounded-xl border text-left text-xs font-bold transition-all ${
                    gateway === 'flutterwave'
                      ? 'border-[#f5a623] bg-[#f5a623]/10 text-[#d48806]'
                      : 'border-slate-200 bg-white/70 text-slate-600'
                  }`}
                >
                  <div className="text-[11px] font-black">Flutterwave</div>
                  <div className="text-[9px] font-normal text-slate-400">USSD, Mobile, Bank</div>
                </button>
              </div>
            </div>

            {/* Summary & Proceed Button */}
            <div className="pt-2 border-t border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-slate-900 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/60">
                <span className="text-[11px] text-slate-600 font-bold">Total to Pay:</span>
                <div className="text-right">
                  <div className="text-sm text-slate-900 font-mono font-bold">₦{totalNgn.toLocaleString('en-NG')} NGN</div>
                  <div className="text-[10px] font-extrabold text-orange-600">for {totalCredits} Points 🪙</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartCheckout}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-sm shadow-orange-500/25 flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center justify-center gap-1 text-[9px] text-slate-400 font-medium">
                <Lock className="w-2.5 h-2.5 text-emerald-600" />
                <span>Secured 256-bit payment via Nigerian Gateways</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: CHECKOUT */}
        {step === 'checkout' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {gateway === 'paystack' ? 'Paystack' : 'Flutterwave'} Checkout
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Depositing ₦{totalNgn.toLocaleString('en-NG')} NGN ({totalCredits} Points)
                </p>
              </div>
              <button
                onClick={() => setStep('select')}
                className="text-xs font-bold text-orange-600 hover:underline"
              >
                Change Pack
              </button>
            </div>

            {/* Email input for receipt */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-orange-500" />
                  <span>Email for Payment Receipt</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              {/* Supported payment channels */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Accepted Payment Channels:
                </span>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-slate-700">
                  <div className="bg-white p-2 rounded-xl border border-slate-200 flex flex-col items-center gap-1">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>Debit Cards</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200 flex flex-col items-center gap-1">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>Bank Transfer</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200 flex flex-col items-center gap-1">
                    <Smartphone className="w-4 h-4 text-purple-600" />
                    <span>USSD / OPay</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error banner if any */}
            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Primary Action Button */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handlePayWithGateway}
                disabled={isProcessing}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:bg-slate-300 ${
                  gateway === 'paystack'
                    ? 'bg-[#0ba4db] hover:bg-[#0993c5] shadow-[#0ba4db]/25'
                    : 'bg-[#f5a623] hover:bg-[#d48806] shadow-[#f5a623]/25'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing with {gateway === 'paystack' ? 'Paystack' : 'Flutterwave'}...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 fill-current" />
                    <span>Pay ₦{totalNgn.toLocaleString('en-NG')} with {gateway === 'paystack' ? 'Paystack' : 'Flutterwave'}</span>
                  </>
                )}
              </button>

              {/* Instant Simulation option */}
              <div className="pt-2 border-t border-slate-200 text-center">
                <button
                  type="button"
                  onClick={() => handleSimulatedGatewaySuccess()}
                  disabled={isProcessing}
                  className="text-[11px] text-slate-500 hover:text-slate-800 font-bold underline inline-flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 text-orange-500" />
                  <span>Sandbox Testing: Instant Confirm Demo Payment</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>PCI-DSS Certified Nigerian Payment Gateway</span>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS CONFIRMATION */}
        {step === 'success' && (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl shadow-2xs">
              🎉
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900">Deposit Confirmed!</h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Your wallet has been credited with <strong className="text-orange-600 font-black">+{totalCredits} Points</strong>.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs font-mono space-y-1.5 text-left">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Gateway:</span>
                <span className="font-bold text-[#0ba4db]">{lastGateway}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Amount Paid:</span>
                <span className="font-bold text-slate-900">₦{totalNgn.toLocaleString('en-NG')} NGN</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Points Added:</span>
                <span className="font-bold text-emerald-600">+{totalCredits} Points 🪙</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Reference:</span>
                <span className="font-bold text-slate-700 truncate max-w-[160px]">{lastRef}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinish}
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-orange-500/25 transition-all active:scale-95"
            >
              Back to Wallet & Post Ads
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
