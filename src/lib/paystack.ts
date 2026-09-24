declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number; // in kobo
        currency?: string;
        ref?: string;
        metadata?: Record<string, any>;
        channels?: string[];
        callback: (response: { reference: string; trxref?: string; status?: string; message?: string }) => void;
        onClose: () => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

// Cached dynamic public key (live key from server or Vite env)
let cachedPublicKey: string | null = null;

/**
 * Fetch the active live Paystack public key from server environment or Vite client env
 */
export async function getPaystackPublicKey(): Promise<string> {
  if (cachedPublicKey) return cachedPublicKey;

  // 1. Try runtime server config endpoint (useful on Render without rebuilding Vite)
  try {
    const res = await fetch('/api/paystack/config');
    if (res.ok) {
      const data = await res.json();
      if (data.publicKey && typeof data.publicKey === 'string' && data.publicKey.trim()) {
        cachedPublicKey = data.publicKey.trim();
        return cachedPublicKey;
      }
    }
  } catch {
    // In pure client or offline dev, ignore fetch error
  }

  // 2. Vite build-time environment variable
  const viteKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
  if (viteKey && typeof viteKey === 'string' && viteKey.trim()) {
    cachedPublicKey = viteKey.trim();
    return cachedPublicKey;
  }

  return '';
}

export const PAYSTACK_PUBLIC_KEY = 
  (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string) || '';

/**
 * Load Paystack Inline script dynamically if not present
 */
export async function loadPaystackScript(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (window.PaystackPop) return true;

  return new Promise((resolve) => {
    const existingScript = document.querySelector('script[src*="paystack.co"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('Failed to load Paystack inline.js from CDN');
      resolve(false);
    };
    document.head.appendChild(script);
  });
}

export interface PaystackCheckoutOptions {
  email: string;
  amountNgn: number;
  credits: number;
  userId: string;
  reference?: string;
  onSuccess: (reference: string) => void;
  onClose?: () => void;
  onError?: (err: any) => void;
}

/**
 * Trigger official Paystack Inline Checkout modal popup
 */
export async function triggerPaystackPayment(options: PaystackCheckoutOptions): Promise<boolean> {
  const isLoaded = await loadPaystackScript();
  const activeKey = await getPaystackPublicKey();

  if (!activeKey || !activeKey.trim()) {
    const errorMsg = "Paystack Public Key is not configured. Please set PAYSTACK_PUBLIC_KEY in your environment variables.";
    console.error('[Paystack]', errorMsg);
    if (options.onError) options.onError(new Error(errorMsg));
    return false;
  }

  const ref = options.reference || `ADUP-PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  if (window.PaystackPop && window.PaystackPop.setup) {
    try {
      const handler = window.PaystackPop.setup({
        key: activeKey,
        email: options.email,
        amount: Math.round(options.amountNgn * 100), // in Kobo
        currency: 'NGN',
        ref: ref,
        metadata: {
          user_uid: options.userId,
          credits_count: options.credits,
          custom_fields: [
            {
              display_name: 'App',
              variable_name: 'app_name',
              value: 'AddMeUp Growth',
            },
            {
              display_name: 'Points To Add',
              variable_name: 'credits_count',
              value: options.credits,
            },
            {
              display_name: 'User ID',
              variable_name: 'user_uid',
              value: options.userId,
            },
          ],
        },
        callback: (response) => {
          const finalRef = response.reference || response.trxref || ref;
          options.onSuccess(finalRef);
        },
        onClose: () => {
          if (options.onClose) {
            options.onClose();
          }
        },
      });

      handler.openIframe();
      return true;
    } catch (err) {
      console.error('Paystack popup launch error:', err);
      if (options.onError) options.onError(err);
      return false;
    }
  } else {
    console.warn('Paystack popup object not available');
    return false;
  }
}

/**
 * Verify transaction reference on server using PAYSTACK_SECRET_KEY
 * and atomically credit user via Firebase Admin SDK
 */
export async function verifyPaystackOnServer(params: {
  reference: string;
  userId: string;
  credits: number;
  amountNgn: number;
}): Promise<{
  success: boolean;
  verified: boolean;
  credited?: boolean;
  alreadyProcessed?: boolean;
  needsClientCredit?: boolean;
  message?: string;
}> {
  try {
    const response = await fetch('/api/paystack/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }

    const errData = await response.json().catch(() => ({}));
    return {
      success: false,
      verified: false,
      message: errData.message || `Verification failed with HTTP ${response.status}`,
    };
  } catch (err: any) {
    // If endpoint doesn't exist (e.g. running in client-only preview)
    console.warn('[Paystack Client] Server verification endpoint unreachable, fallback to client confirmation:', err.message);
    return {
      success: true,
      verified: false,
      needsClientCredit: true,
      message: 'Server unreachable, using client credit fallback.',
    };
  }
}
