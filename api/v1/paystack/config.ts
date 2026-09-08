export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const publicKey = (process.env.PAYSTACK_PUBLIC_KEY || process.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_c3ae489417af91c3b248891bbde5e721c1174227').trim();
  const hasSecret = Boolean((process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SK || '').trim());

  return res.json({
    success: true,
    configured: hasSecret,
    publicKey
  });
}
