export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { email, amount, refCode, orderId, metadata, channels, reference: customRef, callbackUrl } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ status: false, error: 'Valid customer email is required.' });
    }

    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ status: false, error: 'Valid payment amount is required.' });
    }

    const secretKey = (process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SK || '').trim();
    const publicKey = (process.env.PAYSTACK_PUBLIC_KEY || process.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_c3ae489417af91c3b248891bbde5e721c1174227').trim();

    const reference = customRef?.trim() || `PSTK_ORD_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const amountInKobo = Math.round(numAmount * 100);

    // Resolve callback URL
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'nexovira.com.ng';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const origin = req.headers.origin || `${protocol}://${host}`;
    const resolvedCallback = callbackUrl || `${origin}/payment/callback`;

    if (!secretKey) {
      // Return public key for client-side fallback
      return res.json({
        status: true,
        fallbackMode: true,
        reference,
        publicKey,
        message: 'Proceed with Paystack Inline Popup Gateway'
      });
    }

    const paystackPayload: Record<string, any> = {
      email: email.trim().toLowerCase(),
      amount: amountInKobo,
      reference,
      callback_url: resolvedCallback,
      metadata: {
        orderId: orderId || reference,
        refCode,
        ...(metadata || {})
      }
    };

    if (Array.isArray(channels) && channels.length > 0) {
      paystackPayload.channels = channels;
    }

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paystackPayload)
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      return res.status(400).json({
        status: false,
        error: data.message || 'Failed to initialize Paystack transaction with official gateway.'
      });
    }

    return res.json({
      status: true,
      message: data.message,
      authorization_url: data.data?.authorization_url,
      access_code: data.data?.access_code,
      reference: data.data?.reference || reference,
      publicKey,
      data: {
        authorization_url: data.data?.authorization_url,
        access_code: data.data?.access_code,
        reference: data.data?.reference || reference,
        publicKey
      }
    });
  } catch (err: any) {
    console.error('[Vercel Serverless Paystack Init Error]:', err);
    return res.status(500).json({
      status: false,
      error: err?.message || 'Server error initializing Paystack transaction.'
    });
  }
}
