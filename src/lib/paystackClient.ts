import { formatErrorMessage } from './errorUtils';

/**
 * Paystack Client Helper
 * Dynamically loads the official Paystack Inline JavaScript SDK (https://js.paystack.co/v1/inline.js)
 * and exports utility methods for opening secure checkout modals.
 */

export const DEFAULT_PAYSTACK_PUBLIC_KEY = 'pk_live_c3ae489417af91c3b248891bbde5e721c1174227';

export const loadPaystackScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if ((window as any).PaystackPop) {
      resolve(true);
      return;
    }

    let settled = false;
    const finish = (ok: boolean) => {
      if (!settled) {
        settled = true;
        resolve(ok);
      }
    };

    // Check periodically in case script was already loading or loaded
    const checkInterval = setInterval(() => {
      if ((window as any).PaystackPop) {
        clearInterval(checkInterval);
        finish(true);
      }
    }, 150);

    // Timeout safety net (max 4 seconds)
    setTimeout(() => {
      clearInterval(checkInterval);
      finish(Boolean((window as any).PaystackPop));
    }, 4000);

    const existing = document.getElementById('paystack-inline-js') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => {
        clearInterval(checkInterval);
        finish(true);
      });
      existing.addEventListener('error', () => {
        clearInterval(checkInterval);
        finish(false);
      });
      return;
    }

    const script = document.createElement('script');
    script.id = 'paystack-inline-js';
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => {
      clearInterval(checkInterval);
      finish(true);
    };
    script.onerror = () => {
      clearInterval(checkInterval);
      finish(false);
    };
    document.body.appendChild(script);
  });
};

export interface PaystackCheckoutOptions {
  publicKey?: string;
  email: string;
  amountInKobo: number;
  reference: string;
  authorizationUrl?: string;
  metadata?: Record<string, any>;
  onSuccess: (response: { reference: string; trxref?: string; status?: string; [key: string]: any }) => void;
  onClose?: () => void;
}

/**
 * Opens Paystack Inline popup with strict validation compliance.
 * 
 * CRITICAL FIX:
 * Paystack's inline.js validates callbacks using:
 * `"[object Function]" === {}.toString.call(callback)`
 * Passing an `async` function produces `"[object AsyncFunction]"`, which throws:
 * "Attribute callback must be a valid function".
 * 
 * By defining `callback` as a standard synchronous function (non-async),
 * this complies with Paystack's strict validator while allowing async work inside.
 */
export const openPaystackCheckout = async (options: PaystackCheckoutOptions): Promise<void> => {
  const isLoaded = await loadPaystackScript();
  const PaystackPop = typeof window !== 'undefined' ? (window as any).PaystackPop : null;
  const envKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_PAYSTACK_PUBLIC_KEY) || '';
  const cleanPublicKey = (options.publicKey || envKey || DEFAULT_PAYSTACK_PUBLIC_KEY).trim();

  if (isLoaded && PaystackPop && cleanPublicKey.length > 0) {
    // Plain synchronous function required by Paystack validator
    const syncCallback = function(response: any) {
      try {
        const finalRef = response?.reference || response?.trxref || options.reference;
        options.onSuccess({
          reference: finalRef,
          ...response
        });
      } catch (err) {
        console.error('[Paystack Callback Handler Error]:', formatErrorMessage(err));
      }
    };

    const syncOnClose = function() {
      if (typeof options.onClose === 'function') {
        try {
          options.onClose();
        } catch (err) {
          console.error('[Paystack OnClose Handler Error]:', formatErrorMessage(err));
        }
      }
    };

    const setupConfig: Record<string, any> = {
      key: cleanPublicKey,
      email: options.email.trim().toLowerCase(),
      amount: Math.round(Number(options.amountInKobo) || 0),
      ref: options.reference,
      callback: syncCallback,
      onClose: syncOnClose,
      metadata: options.metadata || {}
    };

    try {
      const handler = PaystackPop.setup(setupConfig);
      if (handler && typeof handler.openIframe === 'function') {
        handler.openIframe();
        return;
      }
    } catch (setupError) {
      console.warn('[PaystackPop.setup failed, attempting redirect fallback]:', formatErrorMessage(setupError));
    }
  }

  // Fallback: Redirect to Paystack standard hosted checkout page
  if (options.authorizationUrl) {
    // 1. Safe top navigation attempt (handles cross-origin SecurityError in iframe preview)
    try {
      let isSameOriginTop = false;
      try {
        isSameOriginTop = window.top !== null && window.top !== window && Boolean(window.top.location.href);
      } catch {
        isSameOriginTop = false;
      }

      if (isSameOriginTop && window.top) {
        window.top.location.href = options.authorizationUrl;
        return;
      }
    } catch {}

    // 2. Safe popup window attempt
    try {
      const opened = window.open(options.authorizationUrl, '_blank', 'noopener,noreferrer');
      if (opened) return;
    } catch {}

    // 3. Current window navigation fallback
    try {
      window.location.href = options.authorizationUrl;
      return;
    } catch {}
  }

  throw new Error('Paystack checkout could not be opened. Please check your internet connection or use the direct payment link.');
};
