/**
 * Paystack Client Helper
 * Dynamically loads the official Paystack Inline JavaScript SDK (https://js.paystack.co/v1/inline.js)
 * and exports utility methods for opening secure checkout modals.
 */

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
    const existing = document.getElementById('paystack-inline-js');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.id = 'paystack-inline-js';
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
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

  if (isLoaded && PaystackPop && options.publicKey && options.publicKey.trim().length > 0) {
    // Plain synchronous function required by Paystack validator
    const syncCallback = function(response: any) {
      try {
        const finalRef = response?.reference || response?.trxref || options.reference;
        options.onSuccess({
          reference: finalRef,
          ...response
        });
      } catch (err) {
        console.error('[Paystack Callback Handler Error]:', err);
      }
    };

    const syncOnClose = function() {
      if (typeof options.onClose === 'function') {
        try {
          options.onClose();
        } catch (err) {
          console.error('[Paystack OnClose Handler Error]:', err);
        }
      }
    };

    const setupConfig: Record<string, any> = {
      key: options.publicKey.trim(),
      email: options.email.trim(),
      amount: Math.round(options.amountInKobo),
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
      console.warn('[PaystackPop.setup failed, attempting redirect fallback]:', setupError);
    }
  }

  // Fallback: Redirect to Paystack standard hosted checkout page
  if (options.authorizationUrl) {
    window.location.href = options.authorizationUrl;
    return;
  }

  throw new Error('Paystack checkout could not be opened. Please verify your internet connection.');
};
