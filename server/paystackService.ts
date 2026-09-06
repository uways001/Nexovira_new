/**
 * NEXOVIRA — Dedicated Server-Side Paystack Payment & Verification Service
 * 
 * Strict Security Rules:
 *  - Secret key is stored ONLY on server (process.env.PAYSTACK_SECRET_KEY).
 *  - Public key is exposed to client only for Paystack Pop inline modal.
 *  - Orders and enrollments are NEVER marked as paid without server-side verification.
 *  - All transactions communicate directly with Paystack's official API: https://api.paystack.co
 */

export interface PaystackInitializeOptions {
  email: string;
  amountInKobo: number;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
  channels?: string[];
}

export interface PaystackInitializeResult {
  success: boolean;
  authorizationUrl?: string;
  accessCode?: string;
  reference: string;
  message?: string;
  error?: string;
}

export interface PaystackVerifyResult {
  success: boolean;
  verified: boolean;
  status: 'success' | 'failed' | 'abandoned' | 'unprocessed';
  reference: string;
  amount: number; // in kobo
  amountNGN: number; // in Naira
  currency: string;
  paidAt?: string;
  channel?: string;
  gatewayResponse?: string;
  customer?: {
    email?: string;
    customer_code?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
  metadata?: Record<string, any>;
  message?: string;
  error?: string;
}

/**
 * Inspect server environment for Paystack credentials
 */
export function getPaystackSecretKey(): string | null {
  const key = (process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SK || '').trim();
  if (key && key.length > 8 && !key.startsWith('pk_')) {
    return key;
  }
  return null;
}

export function getPaystackPublicKey(): string {
  const pk = (
    process.env.PAYSTACK_PUBLIC_KEY || 
    process.env.VITE_PAYSTACK_PUBLIC_KEY || 
    process.env.PAYSTACK_PK || 
    ''
  ).trim();
  return pk;
}

export function isPaystackConfigured(): boolean {
  return Boolean(getPaystackSecretKey());
}

/**
 * 1. Initialize a transaction with Paystack official API
 * Endpoint: POST https://api.paystack.co/transaction/initialize
 */
export async function initializePaystackTransaction(
  options: PaystackInitializeOptions
): Promise<PaystackInitializeResult> {
  const secretKey = getPaystackSecretKey();

  if (!secretKey) {
    console.error('[Paystack] Missing PAYSTACK_SECRET_KEY in server environment.');
    return {
      success: false,
      reference: options.reference,
      error: 'Paystack Secret Key is not configured. Please set PAYSTACK_SECRET_KEY in environment variables.'
    };
  }

  if (!options.email || !options.email.includes('@')) {
    return {
      success: false,
      reference: options.reference,
      error: 'A valid customer email is required for Paystack transaction.'
    };
  }

  if (!options.amountInKobo || options.amountInKobo <= 0) {
    return {
      success: false,
      reference: options.reference,
      error: 'Valid payment amount in kobo is required.'
    };
  }

  try {
    const payload: Record<string, any> = {
      email: options.email.toLowerCase().trim(),
      amount: Math.round(options.amountInKobo),
      reference: options.reference,
      metadata: options.metadata || {}
    };

    if (options.callbackUrl) {
      payload.callback_url = options.callbackUrl;
    }

    if (options.channels && Array.isArray(options.channels) && options.channels.length > 0) {
      payload.channels = options.channels;
    }

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    let resJson: any = {};
    try {
      resJson = responseText ? JSON.parse(responseText) : {};
    } catch {
      return {
        success: false,
        reference: options.reference,
        error: `Paystack initialization returned an unparseable response: ${responseText.slice(0, 150)}`
      };
    }

    if (!response.ok || !resJson.status) {
      return {
        success: false,
        reference: options.reference,
        error: resJson.message || `Paystack API returned error status ${response.status}`
      };
    }

    const data = resJson.data || {};
    return {
      success: true,
      authorizationUrl: data.authorization_url,
      accessCode: data.access_code,
      reference: data.reference || options.reference,
      message: resJson.message || 'Transaction initialized successfully.'
    };
  } catch (err: any) {
    console.error('[Paystack Initialize Error]:', err);
    return {
      success: false,
      reference: options.reference,
      error: err?.message || 'Network error communicating with Paystack.'
    };
  }
}

/**
 * 2. Verify a transaction with Paystack official API
 * Endpoint: GET https://api.paystack.co/transaction/verify/:reference
 */
export async function verifyPaystackTransaction(
  reference: string
): Promise<PaystackVerifyResult> {
  const cleanRef = (reference || '').trim();
  if (!cleanRef) {
    return {
      success: false,
      verified: false,
      status: 'unprocessed',
      reference: '',
      amount: 0,
      amountNGN: 0,
      currency: 'NGN',
      error: 'Payment reference is required for verification.'
    };
  }

  const secretKey = getPaystackSecretKey();
  if (!secretKey) {
    console.error('[Paystack] Missing PAYSTACK_SECRET_KEY during verification attempt.');
    return {
      success: false,
      verified: false,
      status: 'unprocessed',
      reference: cleanRef,
      amount: 0,
      amountNGN: 0,
      currency: 'NGN',
      error: 'PAYSTACK_SECRET_KEY is not configured on the server. Cannot verify transaction securely.'
    };
  }

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(cleanRef)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    });

    const responseText = await response.text();
    let resJson: any = {};
    try {
      resJson = responseText ? JSON.parse(responseText) : {};
    } catch {
      return {
        success: false,
        verified: false,
        status: 'unprocessed',
        reference: cleanRef,
        amount: 0,
        amountNGN: 0,
        currency: 'NGN',
        error: `Invalid response received from Paystack verification endpoint: ${responseText.slice(0, 150)}`
      };
    }

    if (!response.ok || !resJson.status) {
      return {
        success: false,
        verified: false,
        status: 'failed',
        reference: cleanRef,
        amount: 0,
        amountNGN: 0,
        currency: 'NGN',
        error: resJson.message || 'Verification could not find transaction with this reference.'
      };
    }

    const data = resJson.data || {};
    const isSuccess = data.status === 'success';
    const amountKobo = Number(data.amount) || 0;
    const amountNGN = Math.round(amountKobo / 100);

    return {
      success: true,
      verified: isSuccess,
      status: data.status || (isSuccess ? 'success' : 'failed'),
      reference: data.reference || cleanRef,
      amount: amountKobo,
      amountNGN: amountNGN,
      currency: data.currency || 'NGN',
      paidAt: data.paid_at || new Date().toISOString(),
      channel: data.channel || 'card',
      gatewayResponse: data.gateway_response || '',
      customer: data.customer,
      metadata: data.metadata,
      message: resJson.message || (isSuccess ? 'Payment verified successfully.' : `Transaction status: ${data.status}`)
    };
  } catch (err: any) {
    console.error('[Paystack Verification Error]:', err);
    return {
      success: false,
      verified: false,
      status: 'unprocessed',
      reference: cleanRef,
      amount: 0,
      amountNGN: 0,
      currency: 'NGN',
      error: err?.message || 'Error communicating with Paystack verification endpoint.'
    };
  }
}
