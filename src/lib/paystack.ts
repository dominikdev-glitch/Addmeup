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

// Default to user configured environment key, or the configured Paystack test public key
export const PAYSTACK_PUBLIC_KEY = 
  (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string) || 
  'pk_test_b4162ac7f718b0af776e78ae8665324284865b74';

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

  const ref = options.reference || `ADUP-PSTK-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  if (window.PaystackPop && window.PaystackPop.setup) {
    try {
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: options.email,
        amount: Math.round(options.amountNgn * 100), // Paystack accepts amount in Kobo
        currency: 'NGN',
        ref: ref,
        metadata: {
          custom_fields: [
            {
              display_name: 'App',
              variable_name: 'app_name',
              value: 'AddMeUp Growth',
            },
            {
              display_name: 'Credits To Add',
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
