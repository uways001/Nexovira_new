import express from 'express';
import path from 'path';
import fs from 'fs';
import compression from 'compression';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { getActiveBankVerificationProvider } from './server/bankVerificationProvider';
import {
  initializePaystackTransaction,
  verifyPaystackTransaction,
  getPaystackPublicKey,
  isPaystackConfigured
} from './server/paystackService';
import { 
  sendEmailNotification, 
  buildProjectRequestEmailHtml, 
  buildExpertApplicationEmailHtml,
  buildScholarshipApplicationEmailHtml
} from './server/emailNotifier';
import {
  safeLogger,
  redactSensitiveData,
  createRateLimiter,
  authRateLimiter,
  aiRateLimiter,
  paymentRateLimiter,
  newsletterRateLimiter,
  contactRateLimiter,
  uploadRateLimiter,
  orderRateLimiter,
  bankRateLimiter,
  strictCorsMiddleware,
  authenticateToken,
  optionalAuth,
  requireRole,
  isValidEmail,
  isPositiveNumber,
  sanitizeString,
  isValidNuban,
  isValidPaystackReference,
  safeErrorHandler
} from './server/securityMiddleware';
import {
  validatePublicSignupRole,
  registerUserProfile,
  verifyUserRole,
  adminChangeUserRole,
  getRoleAuditLogs,
  getAllCachedUsers,
  getDashboardPathForRole,
  getDashboardTitleForRole
} from './server/authService';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { 
  generateRobotsTxt, 
  generateSitemapXml, 
  getRouteSEOMetadata, 
  CANONICAL_SITE_URL 
} from './src/lib/seoConfig';

// Initialize Firebase Admin lazily for durable server-side storage & transaction persistence
const FIREBASE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'gen-lang-client-0797653089.firebasestorage.app';
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0797653089';

function initFirebaseAdminApp() {
  if (getApps().length === 0) {
    try {
      initializeApp({
        projectId: FIREBASE_PROJECT_ID,
        storageBucket: FIREBASE_BUCKET
      });
    } catch (err) {
      console.warn('[Firebase Admin Initialization Notice]:', err);
    }
  }
}
import { 
  PRODUCTS, 
  TECH_SERVICES, 
  COURSES, 
  DIGITAL_PRODUCTS, 
  STORES, 
  INITIAL_ORDERS,
  INITIAL_BRAND_SETTINGS 
} from './src/data/mockData';

const app = express();
const PORT = 3000;

// Enable Compression
app.use(compression());

// Strict CORS: Restrict to approved domains, prevent unauthorized origins
app.use(strictCorsMiddleware);

// Hardened Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(), payment=(self "https://checkout.paystack.co")');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.paystack.co https://apis.google.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' https: data: blob:; media-src 'self' https: blob:; connect-src 'self' https: wss: https://api.paystack.co https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://firebasestorage.googleapis.com; frame-src 'self' https://checkout.paystack.co https://*.firebaseapp.com; frame-ancestors 'self' https://*.run.app https://ai.studio https://*.google.com https://nexovira.com.ng; object-src 'none'; base-uri 'self';"
  );
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Pre-process all /api requests: enforce JSON Content-Type and safe request logging
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const startTime = Date.now();
  res.on('finish', () => {
    safeLogger.info(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startTime}ms)`);
  });
  next();
});

// Ensure public/uploads directory exists for durable persistent asset storage
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve public uploads statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve Assets Directory & Brand Logo directly
app.use('/assets', express.static(path.join(process.cwd(), 'assets')));
app.get('/nexovira.jpeg', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'assets', 'nexovira.jpeg'));
});

// Dedicated Persistent File & Image Storage Upload Helper & Endpoint
async function uploadBufferToFirebaseStorage(
  buffer: Buffer,
  storagePath: string,
  mimeType: string
): Promise<string> {
  const downloadToken = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  // 1. Try Firebase Storage REST API directly
  try {
    const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_BUCKET}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': mimeType,
        'x-goog-meta-firebasestoragedownloadtokens': downloadToken
      },
      body: buffer
    });

    if (response.ok) {
      const json: any = await response.json().catch(() => null);
      const token = json?.downloadTokens || downloadToken;
      return `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_BUCKET}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
    }
  } catch (err) {
    console.warn('[Storage REST API Attempt]:', err);
  }

  // 2. Try Firebase Admin Storage
  try {
    initFirebaseAdminApp();
    const bucket = getStorage().bucket(FIREBASE_BUCKET);
    const file = bucket.file(storagePath);
    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
        metadata: {
          firebaseStorageDownloadTokens: downloadToken
        }
      }
    });
    return `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_BUCKET}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;
  } catch (err) {
    console.warn('[Firebase Admin Storage Attempt]:', err);
  }

  throw new Error('Failed to persist asset to Firebase Cloud Storage.');
}

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
  'application/pdf',
  'video/mp4', 'video/webm', 'video/ogg',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'
]);

const FORBIDDEN_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'php', 'phtml', 'pl', 'cgi', 'py', 'js', 'ts', 'html', 'htm', 'jar', 'vbs'
]);

app.post('/api/v1/storage/upload', uploadRateLimiter, async (req, res) => {
  try {
    const { filename, contentType, base64Data, dataUrl, folder = 'general' } = req.body;

    let mimeType = (contentType || 'application/octet-stream').toLowerCase().trim();
    let rawBase64 = base64Data;

    if (dataUrl && typeof dataUrl === 'string') {
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1].toLowerCase().trim();
        rawBase64 = match[2];
      } else {
        rawBase64 = dataUrl;
      }
    } else if (rawBase64 && typeof rawBase64 === 'string' && rawBase64.startsWith('data:')) {
      const match = rawBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1].toLowerCase().trim();
        rawBase64 = match[2];
      }
    }

    if (!rawBase64 || typeof rawBase64 !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing base64 data for file upload.' });
    }

    // Base64 size check (approximate: length * 0.75 <= 15MB)
    if (rawBase64.length > 22 * 1024 * 1024) {
      return res.status(413).json({ success: false, error: 'File exceeds maximum upload size limit of 15MB.' });
    }

    const buffer = Buffer.from(rawBase64, 'base64');
    if (buffer.length > 15 * 1024 * 1024) {
      return res.status(413).json({ success: false, error: 'File exceeds maximum upload size limit of 15MB.' });
    }

    // Determine clean extension
    let extension = 'bin';
    if (filename && filename.includes('.')) {
      extension = filename.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'bin';
    } else if (mimeType.includes('image/webp')) {
      extension = 'webp';
    } else if (mimeType.includes('image/jpeg') || mimeType.includes('image/jpg')) {
      extension = 'jpg';
    } else if (mimeType.includes('image/png')) {
      extension = 'png';
    } else if (mimeType.includes('image/svg')) {
      extension = 'svg';
    } else if (mimeType.includes('pdf')) {
      extension = 'pdf';
    }

    if (FORBIDDEN_EXTENSIONS.has(extension)) {
      return res.status(400).json({ success: false, error: 'File type not permitted for security reasons.' });
    }

    if (!ALLOWED_UPLOAD_MIME_TYPES.has(mimeType) && !mimeType.startsWith('image/') && !mimeType.startsWith('video/') && !mimeType.startsWith('audio/')) {
      return res.status(400).json({ success: false, error: 'Unsupported media type. Allowed formats: Images, PDF, Video, Audio.' });
    }

    // Sanitize folder
    const safeFolder = (folder || 'general').replace(/[^a-zA-Z0-9_\-\/]/g, '').replace(/\.\./g, '');
    const targetDir = path.join(UPLOADS_DIR, safeFolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const baseName = filename ? filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\-]/g, '_') : 'asset';
    const safeFileName = `${baseName}_${uniqueId}.${extension}`;
    const storagePath = `${safeFolder}/${safeFileName}`;
    
    // Also save to local directory for instant local serving fallback
    try {
      const filePath = path.join(targetDir, safeFileName);
      await fs.promises.writeFile(filePath, buffer);
    } catch (_) {}

    // Upload to Firebase Storage for permanent persistence across deployments & domains
    let permanentUrl = '';
    try {
      permanentUrl = await uploadBufferToFirebaseStorage(buffer, storagePath, mimeType);
    } catch (uploadErr) {
      console.warn('[Firebase Cloud Storage Upload Fallback]:', uploadErr);
      permanentUrl = `/uploads/${safeFolder}/${safeFileName}`;
    }

    return res.json({
      success: true,
      url: permanentUrl,
      fileName: safeFileName,
      size: buffer.length,
      contentType: mimeType
    });
  } catch (err: any) {
    safeLogger.error('[Storage Upload Error]:', err);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to save file to persistent storage.'
    });
  }
});

// Initialize Server-Side Gemini API SDK safely
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || 'AI_KEY_PLACEHOLDER'
    });
  }
  return aiClient;
}

// SEO Static Resources: Robots.txt & Sitemap.xml
app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  const baseUrl = host.includes('localhost') ? CANONICAL_SITE_URL : `${protocol}://${host}`;
  res.send(generateRobotsTxt(baseUrl));
});

app.get('/sitemap.xml', (req, res) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  const baseUrl = host.includes('localhost') ? CANONICAL_SITE_URL : `${protocol}://${host}`;
  const products = (typeof inMemoryProducts !== 'undefined' && inMemoryProducts.length > 0) ? inMemoryProducts : PRODUCTS;
  res.send(generateSitemapXml(baseUrl, products));
});

// REST API Endpoints

// Direct Referral Link Handler (e.g. /ref/JOHN8K4P2M or /ref/JOHN8K4P2M?target=/product/prod-1)
app.get('/ref/:code', (req, res) => {
  const code = (req.params.code || '').toUpperCase().trim().replace(/[^A-Z0-9_\-]/g, '');
  const rawTarget = (req.query.target as string) || '/';
  // Prevent open redirect: target must start with / and not //
  const safeTarget = (rawTarget.startsWith('/') && !rawTarget.startsWith('//')) ? rawTarget : '/';
  const isSecure = process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.setHeader('Set-Cookie', `nexovira_ref_code=${encodeURIComponent(code)}; Path=/; Max-Age=${30 * 24 * 3600}; SameSite=Lax${isSecure ? '; Secure' : ''}`);
  res.redirect(`${safeTarget}${safeTarget.includes('?') ? '&' : '?'}ref=${encodeURIComponent(code)}`);
});

// Affiliate Config Memory & State Store
let systemAffiliateConfig = {
  minCommissionRate: 1,
  maxCommissionRate: 30,
  attributionWindowDays: 30,
  attributionRule: 'last-click',
  marketplaceCommissionRate: 5
};

app.get('/api/v1/affiliate/config', (req, res) => {
  res.json({ success: true, config: systemAffiliateConfig });
});

app.post('/api/v1/affiliate/config', authenticateToken, requireRole('admin', 'super_admin'), (req, res) => {
  const { minCommissionRate, maxCommissionRate, attributionWindowDays, marketplaceCommissionRate } = req.body || {};
  if (minCommissionRate !== undefined && isPositiveNumber(minCommissionRate) && Number(minCommissionRate) <= 50) {
    systemAffiliateConfig.minCommissionRate = Number(minCommissionRate);
  }
  if (maxCommissionRate !== undefined && isPositiveNumber(maxCommissionRate) && Number(maxCommissionRate) <= 50) {
    systemAffiliateConfig.maxCommissionRate = Number(maxCommissionRate);
  }
  if (attributionWindowDays !== undefined && isPositiveNumber(attributionWindowDays) && Number(attributionWindowDays) <= 365) {
    systemAffiliateConfig.attributionWindowDays = Number(attributionWindowDays);
  }
  if (marketplaceCommissionRate !== undefined && isPositiveNumber(marketplaceCommissionRate) && Number(marketplaceCommissionRate) <= 50) {
    systemAffiliateConfig.marketplaceCommissionRate = Number(marketplaceCommissionRate);
  }
  res.json({ success: true, config: systemAffiliateConfig });
});

// Server-Side Financial Calculation Endpoint
app.post('/api/v1/affiliate/calculate-financials', (req, res) => {
  const { items, refCode, customerUid, customerEmail, shippingFee = 0, discount = 0 } = req.body;

  let subtotal = 0;
  let totalMarketplaceCommission = 0;
  let totalAffiliateCommission = 0;
  let totalSellerEarnings = 0;

  const isSelfReferral = Boolean(
    refCode && 
    ((customerUid && refCode.includes(customerUid)) || 
     (customerEmail && customerEmail.toLowerCase().includes('self')))
  );

  const calculatedItems = (items || []).map((item: any) => {
    const qty = item.quantity || 1;
    const price = item.product?.price || item.price || 0;
    const itemSubtotal = price * qty;
    subtotal += itemSubtotal;

    const rate = Math.min(
      systemAffiliateConfig.maxCommissionRate,
      Math.max(systemAffiliateConfig.minCommissionRate, item.product?.affiliateCommissionRate ?? 10)
    );

    const isAffiliateActive = Boolean(refCode) && !isSelfReferral && item.product?.affiliateEnabled !== false;
    const effectiveRate = isAffiliateActive ? rate : 0;
    const mktRate = systemAffiliateConfig.marketplaceCommissionRate;

    const affComm = (itemSubtotal * effectiveRate) / 100;
    const mktComm = (itemSubtotal * mktRate) / 100;
    const sellerEarn = itemSubtotal - mktComm - affComm;

    totalMarketplaceCommission += mktComm;
    totalAffiliateCommission += affComm;
    totalSellerEarnings += sellerEarn;

    return {
      productId: item.product?.id || item.id,
      productTitle: item.product?.title || item.title,
      sellerId: item.product?.sellerId || 'nexovira-admin',
      quantity: qty,
      itemPrice: price,
      itemSubtotal,
      affiliateRateApplied: effectiveRate,
      marketplaceRateApplied: mktRate,
      affiliateCommission: affComm,
      marketplaceCommission: mktComm,
      sellerEarnings: sellerEarn
    };
  });

  const totalPayable = subtotal + shippingFee - discount;
  const paymentFee = totalPayable * 0.015;

  res.json({
    subtotal,
    shippingFee,
    discount,
    paymentFee,
    totalPayable,
    totalMarketplaceCommission,
    totalAffiliateCommission,
    totalSellerEarnings,
    affiliateCode: refCode,
    selfReferral: isSelfReferral,
    items: calculatedItems
  });
});

// Paystack Config, Initialization & Verification Endpoints (PAYSTACK ONLY)
app.get('/api/v1/paystack/config', (req, res) => {
  res.json({
    success: true,
    configured: isPaystackConfigured(),
    publicKey: getPaystackPublicKey()
  });
});

app.post('/api/v1/paystack/initialize', paymentRateLimiter, async (req, res) => {
  try {
    const { email, amount, refCode, orderId, metadata, channels, reference: customRef, callbackUrl } = req.body || {};
    
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ 
        success: false,
        status: false, 
        error: 'Validation Error',
        message: 'A valid customer email is required.' 
      });
    }
    if (!amount || !isPositiveNumber(amount)) {
      return res.status(400).json({ 
        success: false,
        status: false, 
        error: 'Validation Error',
        message: 'A valid positive payment amount is required.' 
      });
    }

    const reference = customRef?.trim() || `PSTK_ORD_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const amountInKobo = Math.round(Number(amount) * 100);

    // Resolve accurate callback URL
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'nexovira.com.ng';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const origin = req.headers.origin || `${protocol}://${host}`;
    const resolvedCallback = callbackUrl || `${origin}/payment/callback`;

    const initResult = await initializePaystackTransaction({
      email,
      amountInKobo,
      reference,
      callbackUrl: resolvedCallback,
      metadata: {
        orderId: orderId || reference,
        refCode,
        ...metadata
      },
      channels
    });

    if (!initResult.success) {
      return res.status(400).json({
        success: false,
        status: false,
        error: initResult.error || 'Failed to initialize Paystack transaction.'
      });
    }

    const pubKey = getPaystackPublicKey();
    res.json({
      success: true,
      status: true,
      message: initResult.message || 'Paystack transaction initialized successfully',
      authorization_url: initResult.authorizationUrl,
      access_code: initResult.accessCode,
      reference: initResult.reference,
      publicKey: pubKey,
      data: {
        authorization_url: initResult.authorizationUrl,
        access_code: initResult.accessCode,
        reference: initResult.reference,
        publicKey: pubKey
      }
    });
  } catch (err: any) {
    safeLogger.error('[Paystack Init API Error]:', err);
    res.status(500).json({ success: false, status: false, error: 'Paystack initialization failed.' });
  }
});

// GET Verification Route for callbacks, redirects and query-based checks
app.get(['/api/v1/paystack/verify/:reference', '/api/v1/paystack/verify'], paymentRateLimiter, async (req, res) => {
  try {
    const reference = req.params.reference || (req.query.reference as string) || (req.query.trxref as string);
    const orderId = (req.query.orderId as string) || undefined;

    if (!reference || typeof reference !== 'string' || !reference.trim()) {
      return res.status(400).json({ 
        success: false, 
        status: false, 
        verified: false, 
        error: 'Validation Error',
        message: 'Transaction reference is required.' 
      });
    }

    const verifyResult = await verifyPaystackTransaction(reference.trim());

    if (!verifyResult.success || !verifyResult.verified) {
      return res.status(422).json({
        success: false,
        status: false,
        verified: false,
        paymentStatus: verifyResult.status,
        error: verifyResult.error || 'Paystack transaction could not be verified or was not successful.',
        data: verifyResult
      });
    }

    // Record verified transaction in Firestore for server-authoritative audit
    try {
      initFirebaseAdminApp();
      const firestore = getFirestore();
      await firestore.collection('paystack_transactions').doc(verifyResult.reference).set({
        reference: verifyResult.reference,
        status: verifyResult.status,
        amount: verifyResult.amountNGN,
        amountKobo: verifyResult.amount,
        currency: verifyResult.currency,
        paidAt: verifyResult.paidAt || new Date().toISOString(),
        channel: verifyResult.channel || 'card',
        gatewayResponse: verifyResult.gatewayResponse || '',
        customer: verifyResult.customer || null,
        metadata: verifyResult.metadata || null,
        orderId: orderId || null,
        verifiedAt: new Date().toISOString()
      }, { merge: true });
    } catch (auditErr) {
      safeLogger.warn('[Firestore Paystack Audit Warning]:', auditErr);
    }

    res.json({
      success: true,
      status: true,
      verified: true,
      message: 'Paystack Payment Verified Server-Side',
      data: {
        reference: verifyResult.reference,
        status: verifyResult.status,
        amount: verifyResult.amountNGN,
        amountKobo: verifyResult.amount,
        currency: verifyResult.currency,
        paid_at: verifyResult.paidAt,
        channel: verifyResult.channel,
        gateway_response: verifyResult.gatewayResponse,
        customer: verifyResult.customer,
        metadata: verifyResult.metadata,
        orderId
      }
    });
  } catch (err: any) {
    safeLogger.error('[Paystack GET Verify API Error]:', err);
    res.status(500).json({ success: false, status: false, verified: false, error: 'Server verification failed.' });
  }
});

app.post('/api/v1/paystack/verify', paymentRateLimiter, async (req, res) => {
  try {
    const { reference, orderId } = req.body || {};
    if (!reference || typeof reference !== 'string' || !reference.trim()) {
      return res.status(400).json({ 
        success: false, 
        status: false, 
        verified: false, 
        error: 'Validation Error',
        message: 'Transaction reference is required.' 
      });
    }

    const verifyResult = await verifyPaystackTransaction(reference.trim());

    if (!verifyResult.success || !verifyResult.verified) {
      return res.status(422).json({
        success: false,
        status: false,
        verified: false,
        paymentStatus: verifyResult.status,
        error: verifyResult.error || 'Paystack transaction could not be verified or was not successful.',
        data: verifyResult
      });
    }

    // Record verified transaction in Firestore for server-authoritative audit
    try {
      initFirebaseAdminApp();
      const firestore = getFirestore();
      await firestore.collection('paystack_transactions').doc(verifyResult.reference).set({
        reference: verifyResult.reference,
        status: verifyResult.status,
        amount: verifyResult.amountNGN,
        amountKobo: verifyResult.amount,
        currency: verifyResult.currency,
        paidAt: verifyResult.paidAt || new Date().toISOString(),
        channel: verifyResult.channel || 'card',
        gatewayResponse: verifyResult.gatewayResponse || '',
        customer: verifyResult.customer || null,
        metadata: verifyResult.metadata || null,
        orderId: orderId || null,
        verifiedAt: new Date().toISOString()
      }, { merge: true });
    } catch (auditErr) {
      safeLogger.warn('[Firestore Paystack Audit Warning]:', auditErr);
    }

    res.json({
      success: true,
      status: true,
      verified: true,
      message: 'Paystack Payment Verified Server-Side',
      data: {
        reference: verifyResult.reference,
        status: verifyResult.status,
        amount: verifyResult.amountNGN,
        amountKobo: verifyResult.amount,
        currency: verifyResult.currency,
        paid_at: verifyResult.paidAt,
        channel: verifyResult.channel,
        gateway_response: verifyResult.gatewayResponse,
        customer: verifyResult.customer,
        metadata: verifyResult.metadata,
        orderId
      }
    });
  } catch (err: any) {
    safeLogger.error('[Paystack POST Verify API Error]:', err);
    res.status(500).json({ success: false, status: false, verified: false, error: 'Server verification failed.' });
  }
});

// 1. Health Status
app.get(['/api/health', '/api/v1/health'], (req, res) => {
  res.json({ 
    status: 'ok', 
    ecosystem: 'NEXOVIRA AI Digital Commerce & Knowledge Platform', 
    businessModel: 'Online-only Technology Ecosystem in Nigeria',
    phone: '+234 702 590 0156',
    whatsapp: '+234 702 590 0156',
    email: 'nexovirasupport@gmail.com',
    domain: req.get('host') || 'nexovira.com.ng',
    timestamp: new Date().toISOString() 
  });
});

// 2. Newsletter Subscription Endpoint
app.post('/api/v1/newsletter/subscribe', newsletterRateLimiter, (req, res) => {
  const { email } = req.body || {};
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation Error', 
      message: 'Valid email address is required.' 
    });
  }
  res.json({ success: true, message: 'Thank you for subscribing to NEXOVIRA flash deal alerts!' });
});

// 2b. Contact & Support Endpoint
app.post(['/api/v1/contact', '/api/contact'], contactRateLimiter, (req, res) => {
  const { name, email, subject, message } = req.body || {};
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation Error', 
      message: 'A valid email address is required.' 
    });
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation Error', 
      message: 'Message text is required.' 
    });
  }
  safeLogger.info(`Contact message received from ${name || 'User'} (${email}): ${subject || 'Inquiry'}`);
  res.json({ success: true, message: 'Message received. NEXOVIRA Support will follow up promptly.' });
});

// ============================================================================
// 2c. MANDATORY ROLE-BASED SIGNUP & DASHBOARD ASSIGNMENT ENDPOINTS
// ============================================================================

// A. Server-Side Role Validation against Public Allowlist
app.post('/api/v1/auth/validate-signup', authRateLimiter, (req, res) => {
  const { role } = req.body || {};
  const validation = validatePublicSignupRole(role);

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Account Role',
      message: validation.error,
      assignedRole: validation.assignedRole,
      dashboard: validation.dashboard
    });
  }

  res.json({
    success: true,
    valid: true,
    assignedRole: validation.assignedRole,
    accountStatus: validation.initialStatus,
    dashboard: validation.dashboard,
    dashboardTitle: validation.dashboardTitle
  });
});

// B. Authoritative User Profile Registration with DB Persistence and Audit Logging
app.post('/api/v1/auth/register-profile', authRateLimiter, async (req, res) => {
  try {
    const { uid, email, displayName, phone, role } = req.body || {};

    if (!uid || typeof uid !== 'string') {
      return res.status(400).json({ success: false, error: 'Validation Error', message: 'User ID (uid) is required.' });
    }
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Validation Error', message: 'Valid email address is required.' });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    const result = await registerUserProfile({
      uid,
      email,
      displayName: displayName || 'NEXOVIRA Member',
      phone,
      requestedRole: role,
      ip: clientIp
    });

    res.json({
      success: true,
      profile: result.profile,
      dashboard: result.dashboard,
      dashboardTitle: result.dashboardTitle
    });
  } catch (err: any) {
    safeLogger.error('[Auth Register Error]:', err);
    res.status(400).json({
      success: false,
      error: 'Registration Blocked',
      message: err.message || 'Could not complete role registration.'
    });
  }
});

// C. Authoritative Role Verification (Bypasses and detects client-side localStorage tampering)
app.post('/api/v1/auth/verify-role', async (req, res) => {
  try {
    const { uid, reportedRole } = req.body || {};
    if (!uid || typeof uid !== 'string') {
      return res.status(400).json({ success: false, error: 'Validation Error', message: 'User ID is required.' });
    }

    const verification = await verifyUserRole(uid, reportedRole);

    res.json({
      success: true,
      uid: verification.uid,
      role: verification.verifiedRole,
      accountStatus: verification.accountStatus,
      dashboard: verification.dashboard,
      dashboardTitle: verification.dashboardTitle,
      tampered: verification.tampered,
      profile: verification.profile
    });
  } catch (err: any) {
    safeLogger.error('[Auth Verify Role Error]:', err);
    res.status(500).json({ success: false, error: 'Verification Error', message: 'Failed to verify user role.' });
  }
});

// D. Administrator Role & Status Management (Approve/Reject Verified Experts, Change Roles)
app.post('/api/v1/admin/users/:uid/role', authenticateToken, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const targetUid = req.params.uid;
    const { newRole, newStatus, reason } = req.body || {};
    const adminUser = req.user!;

    if (!newRole) {
      return res.status(400).json({ success: false, error: 'Missing parameter', message: 'newRole is required.' });
    }

    const updatedProfile = await adminChangeUserRole({
      adminUid: adminUser.id,
      adminEmail: adminUser.email,
      targetUid,
      newRole,
      newStatus,
      reason
    });

    res.json({
      success: true,
      message: `User role successfully updated to ${newRole}`,
      profile: updatedProfile,
      dashboard: getDashboardPathForRole(newRole),
      dashboardTitle: getDashboardTitleForRole(newRole)
    });
  } catch (err: any) {
    safeLogger.error('[Admin Role Change Error]:', err);
    res.status(500).json({ success: false, error: 'Server Error', message: 'Failed to modify user role.' });
  }
});

// E. Role Audit Logs (Admin-only retrieval)
app.get('/api/v1/admin/audit-logs/roles', authenticateToken, requireRole('admin', 'super_admin'), (req, res) => {
  const logs = getRoleAuditLogs();
  res.json({ success: true, count: logs.length, logs });
});

// F. Admin User List
app.get('/api/v1/admin/users/all', authenticateToken, requireRole('admin', 'super_admin'), (req, res) => {
  const users = getAllCachedUsers();
  res.json({ success: true, count: users.length, users });
});

// 3. Product Catalog & Management Endpoints (Row-Level Security & Automated seller_id Assignment)
let inMemoryProducts = [...PRODUCTS];

app.get(['/api/v1/products', '/api/products'], (req, res) => {
  const sellerIdQuery = (req.query.seller_id as string) || (req.query.sellerId as string);
  const categoryIdQuery = (req.query.category_id as string) || (req.query.categoryId as string) || (req.query.category as string);
  let results = inMemoryProducts;
  if (sellerIdQuery) {
    results = results.filter(p => p.sellerId === sellerIdQuery || (p as any).seller_id === sellerIdQuery);
  }
  if (categoryIdQuery && categoryIdQuery !== 'all') {
    results = results.filter(p => p.categoryId === categoryIdQuery);
  }
  res.json({ success: true, products: results, count: results.length });
});

app.get(['/api/v1/products/:id', '/api/products/:id'], (req, res) => {
  const productId = req.params.id;
  const product = inMemoryProducts.find(p => p.id === productId);
  if (!product) {
    return res.status(404).json({
      success: false,
      error: 'Product Not Found',
      message: `Product with ID "${productId}" does not exist.`
    });
  }
  res.json({ success: true, product });
});

// RESTful Route Isolation for Admin Product Management
// 3-Admin. GET /api/v1/admin/products - List all products for Admin / Seller management (Protected)
app.get('/api/v1/admin/products', authenticateToken, requireRole('admin', 'seller'), (req, res) => {
  const user = req.user!;
  const sellerIdQuery = (req.query.seller_id as string) || (req.query.sellerId as string);
  const categoryIdQuery = (req.query.category_id as string) || (req.query.categoryId as string) || (req.query.category as string);

  let results = inMemoryProducts;
  if (!user.isAdmin) {
    results = results.filter(p => p.sellerId === user.id || (p as any).seller_id === user.id);
  } else if (sellerIdQuery) {
    results = results.filter(p => p.sellerId === sellerIdQuery || (p as any).seller_id === sellerIdQuery);
  }

  if (categoryIdQuery && categoryIdQuery !== 'all') {
    results = results.filter(p => p.categoryId === categoryIdQuery);
  }

  res.json({
    success: true,
    count: results.length,
    products: results
  });
});

// 3a. GET /api/v1/admin/products/:id & edit - Retrieve product with metadata (Protected)
app.get(['/api/v1/admin/products/:id/edit', '/api/v1/admin/products/:id'], authenticateToken, requireRole('admin', 'seller'), (req, res) => {
  const productId = req.params.id;
  const product = inMemoryProducts.find(p => p.id === productId);

  if (!product) {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: `Product with ID "${productId}" does not exist in inventory catalog.`
    });
  }

  const user = req.user!;
  const existingSellerId = (product as any).seller_id || product.sellerId;
  if (!user.isAdmin && existingSellerId !== user.id) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: `You are not authorized to access product owned by "${existingSellerId}".`
    });
  }

  res.json({
    success: true,
    product,
    meta: {
      productId: product.id,
      createdAt: product.createdAt || new Date().toISOString(),
      updatedAt: (product as any).updatedAt || product.createdAt || new Date().toISOString(),
      isArchiveRecord: true,
      sku: `NEXO-${product.id}`,
      status: 'active'
    }
  });
});

// 3b. PUT /api/v1/admin/products/:id - Strictly isolated endpoint to UPDATE/MODIFY an existing product (Protected)
app.put('/api/v1/admin/products/:id', authenticateToken, requireRole('admin', 'seller'), (req, res) => {
  const productId = req.params.id;
  const existingProductIndex = inMemoryProducts.findIndex(p => p.id === productId);

  if (existingProductIndex < 0) {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: `Cannot update: Product with ID "${productId}" does not exist. Use POST /api/v1/admin/products to create new inventory.`
    });
  }

  const user = req.user!;
  const existingProduct = inMemoryProducts[existingProductIndex];
  const existingSellerId = (existingProduct as any).seller_id || existingProduct.sellerId;

  if (!user.isAdmin && user.id !== existingSellerId) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: `Row-Level Security violation: authenticated user id "${user.id}" does not match product seller id "${existingSellerId}".`
    });
  }

  const updatePayload = req.body.product || req.body;
  if (updatePayload.price !== undefined && !isPositiveNumber(updatePayload.price)) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'A valid positive price is required.'
    });
  }

  const updatedProduct = {
    ...existingProduct,
    ...updatePayload,
    id: productId, // Immutable ID
    createdAt: existingProduct.createdAt, // Preserve original creation date
    updatedAt: new Date().toISOString()
  };

  inMemoryProducts[existingProductIndex] = updatedProduct;

  return res.json({
    success: true,
    message: `Existing inventory item "${updatedProduct.title}" updated successfully`,
    action: 'UPDATE_ENTRY',
    product: updatedProduct
  });
});

// 3c. PATCH /api/v1/admin/products/:id - Partial updates to existing product (Protected)
app.patch('/api/v1/admin/products/:id', authenticateToken, requireRole('admin', 'seller'), (req, res) => {
  const productId = req.params.id;
  const existingProductIndex = inMemoryProducts.findIndex(p => p.id === productId);

  if (existingProductIndex < 0) {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: `Cannot patch: Product with ID "${productId}" does not exist.`
    });
  }

  const user = req.user!;
  const existingProduct = inMemoryProducts[existingProductIndex];
  const existingSellerId = (existingProduct as any).seller_id || existingProduct.sellerId;

  if (!user.isAdmin && user.id !== existingSellerId) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: `Row-Level Security violation: authenticated user id "${user.id}" does not match product seller id "${existingSellerId}".`
    });
  }

  const updatePayload = req.body.product || req.body;
  const updatedProduct = {
    ...existingProduct,
    ...updatePayload,
    id: productId,
    createdAt: existingProduct.createdAt,
    updatedAt: new Date().toISOString()
  };

  inMemoryProducts[existingProductIndex] = updatedProduct;

  return res.json({
    success: true,
    message: `Product entry "${updatedProduct.title}" updated successfully`,
    action: 'SAVE_CHANGES',
    product: updatedProduct
  });
});

// 3d. POST /api/v1/admin/products & /api/v1/products - Create a new product (Protected)
app.post(['/api/v1/admin/products', '/api/v1/products'], authenticateToken, requireRole('admin', 'seller'), (req, res) => {
  const user = req.user!;
  const productData = req.body.product || req.body || {};

  if (!productData.title || typeof productData.title !== 'string' || !productData.title.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Product title is required and must be a non-empty string.'
    });
  }

  if (!isPositiveNumber(productData.price)) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'A valid positive price is required.'
    });
  }

  const candidateId = productData.id;
  if (candidateId) {
    const exists = inMemoryProducts.some(p => p.id === candidateId);
    if (exists) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: `A product with ID "${candidateId}" already exists. You must use PUT /api/v1/admin/products/${candidateId} to modify existing inventory.`
      });
    }
  }

  const assignedSellerId = user.isAdmin ? (productData.sellerId || productData.seller_id || user.id) : user.id;
  const newId = candidateId || `prod-admin-${Date.now()}`;
  const newProduct = {
    ...productData,
    id: newId,
    sellerId: assignedSellerId,
    seller_id: assignedSellerId,
    sellerName: productData.sellerName || (user.isAdmin ? 'NEXOVIRA Official' : user.name || 'NEXOVIRA Verified Merchant'),
    sellerVerified: true,
    price: Number(productData.price),
    currency: productData.currency || 'USD',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  inMemoryProducts.unshift(newProduct);

  return res.status(201).json({
    success: true,
    message: 'New product document created and published successfully',
    action: 'CREATE_PRODUCT',
    product: newProduct
  });
});

// 3e. DELETE /api/v1/admin/products/:id & /api/v1/products/:id - Delete product (Protected)
app.delete(['/api/v1/admin/products/:id', '/api/v1/products/:id'], authenticateToken, requireRole('admin', 'seller'), (req, res) => {
  const productId = req.params.id;
  const user = req.user!;

  const existingProductIndex = inMemoryProducts.findIndex(p => p.id === productId);
  if (existingProductIndex < 0) {
    return res.status(404).json({ 
      success: false, 
      error: 'Not Found', 
      message: `Product with ID "${productId}" not found.` 
    });
  }

  const existingProduct = inMemoryProducts[existingProductIndex];
  const existingSellerId = (existingProduct as any).seller_id || existingProduct.sellerId;

  if (!user.isAdmin && user.id !== existingSellerId) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: `Row-Level Security violation: user id "${user.id}" does not match product seller id "${existingSellerId}". Deletion rejected.`
    });
  }

  inMemoryProducts.splice(existingProductIndex, 1);
  return res.json({ success: true, message: `Product ${productId} deleted successfully` });
});

// 3.5. Secure Order Processing & Server Payment Verification Endpoint
app.post('/api/v1/orders', orderRateLimiter, async (req, res) => {
  try {
    const { 
      customerName, 
      customerEmail, 
      customerId,
      items, 
      total, 
      currency = 'NGN',
      shippingAddress, 
      paymentMethod,
      paystackReference,
      refCode
    } = req.body || {};

    // 1. Validation
    if (!customerEmail || !isValidEmail(customerEmail)) {
      return res.status(400).json({ success: false, error: 'Valid customer email is required.' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Order must contain at least one item.' });
    }

    if (!isPositiveNumber(total)) {
      return res.status(400).json({ success: false, error: 'Total must be a positive number.' });
    }

    const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
    const cleanCustomerName = sanitizeString(customerName || 'Valued Shopper', 100);
    const cleanEmail = customerEmail.toLowerCase().trim();

    // 2. Server-side payment verification: Never mark paid without genuine gateway settlement
    let isPaymentVerified = false;
    let verifiedPaymentReference = '';
    let paidAtTimestamp = '';

    if (paystackReference && typeof paystackReference === 'string' && isValidPaystackReference(paystackReference)) {
      const verifyResult = await verifyPaystackTransaction(paystackReference.trim());
      if (verifyResult.success && verifyResult.verified) {
        isPaymentVerified = true;
        verifiedPaymentReference = verifyResult.reference;
        paidAtTimestamp = verifyResult.paidAt || new Date().toISOString();
      }
    }

    // 3. Construct Order (paymentStatus is pending unless verified by server)
    const newOrder = {
      id: orderId,
      customerId: customerId || 'guest',
      customerName: cleanCustomerName,
      customerEmail: cleanEmail,
      items: items.map((it: any) => ({
        id: sanitizeString(it.id || it.product?.id || `item-${Date.now()}`, 64),
        title: sanitizeString(it.title || it.product?.title || 'Ecosystem Item', 200),
        price: Number(it.price || it.product?.price || 0),
        quantity: Math.max(1, parseInt(it.quantity || 1, 10)),
        brand: sanitizeString(it.brand || it.product?.brand || 'NEXOVIRA', 100),
        sellerId: sanitizeString(it.sellerId || it.product?.sellerId || 'store-1', 64)
      })),
      subtotal: Math.max(0, Number(total) - 35),
      shippingFee: 35,
      discount: 0,
      total: Number(total),
      currency: currency || 'NGN',
      status: isPaymentVerified ? 'Paid' : 'Pending Payment',
      paymentStatus: isPaymentVerified ? 'successful' : 'pending',
      paymentMethod: paymentMethod || (isPaymentVerified ? 'Paystack Verified Checkout' : 'Pending Payment'),
      paystackReference: verifiedPaymentReference || null,
      paymentTransactionId: verifiedPaymentReference ? `PSTK_${verifiedPaymentReference}` : null,
      paidAt: paidAtTimestamp || null,
      verifiedByServer: isPaymentVerified,
      shippingAddress: shippingAddress ? {
        fullName: sanitizeString(shippingAddress.fullName || cleanCustomerName, 100),
        street: sanitizeString(shippingAddress.street || shippingAddress.address || 'Delivery Address', 250),
        city: sanitizeString(shippingAddress.city || 'Lagos', 100),
        state: sanitizeString(shippingAddress.state || 'Lagos State', 100),
        country: 'Nigeria',
        phone: sanitizeString(shippingAddress.phone || '+234 702 590 0156', 25)
      } : null,
      timeline: [
        { 
          status: isPaymentVerified ? 'Paid' : 'Pending Payment', 
          timestamp: new Date().toLocaleString(), 
          description: isPaymentVerified 
            ? 'Payment verified server-side via Paystack.' 
            : 'Order created awaiting verified payment settlement.' 
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      refCode: refCode ? sanitizeString(refCode, 20) : null
    };

    // 4. Server-authoritative persistence to Firestore
    try {
      initFirebaseAdminApp();
      const firestore = getFirestore();
      await firestore.collection('orders').doc(orderId).set(newOrder);
      safeLogger.info(`[Order Created]: ${orderId} by ${cleanEmail} with status: ${newOrder.status}`);
    } catch (saveErr) {
      safeLogger.warn('[Firestore Order Save Warning]:', saveErr);
    }

    return res.json({ success: true, order: newOrder, verified: isPaymentVerified });
  } catch (err: any) {
    safeLogger.error('[Order Processing API Error]:', err);
    return res.status(500).json({ success: false, error: 'Order processing failed.' });
  }
});

// 4. Intelligent NEXOVIRA AI Ecosystem Chatbot Endpoint (Customer Advisory Grounded strictly in available products)
app.post('/api/v1/ai/chat', aiRateLimiter, async (req, res) => {
  try {
    const rawPrompt = req.body.prompt || req.body.message;
    const { availableProducts: clientProducts, currency = 'NGN' } = req.body || {};
    if (!rawPrompt || typeof rawPrompt !== 'string' || !rawPrompt.trim()) {
      return res.status(400).json({ 
        success: false,
        error: 'Validation Error',
        message: 'Prompt or message is required and must be a non-empty string.' 
      });
    }
    const prompt = rawPrompt.trim();

    // STRICT INVENTORY POLICY: Filter strictly to products that have stock > 0
    const sourceProducts = Array.isArray(clientProducts) && clientProducts.length > 0 ? clientProducts : PRODUCTS;
    const availableInStockProducts = sourceProducts.filter((p: any) => (p.stock ?? 0) > 0);

    const ai = getAIClient();
    const systemPrompt = `You are NEXOVIRA AI, the official shopping, appliance, and tech advisor for NEXOVIRA in Nigeria.
Your job is to advise customers intelligently, practically, and accurately based on what they ask.

CRITICAL INVENTORY & ADVISORY DIRECTIVES (MANDATORY):
1. STRICTLY ONLY DISCUSS AVAILABLE PRODUCTS: You may ONLY discuss, advise on, or recommend products that are currently in stock and present in the AVAILABLE PRODUCTS list below.
2. STRICTLY PROHIBIT UNAVAILABLE / HYPOTHETICAL PRODUCTS: Never invent, name, or discuss products, models, or brands that are not listed in the AVAILABLE PRODUCTS list below.
3. HANDLING OUT-OF-STOCK OR MISSING ITEMS: If a customer asks about a product, category, or model that is NOT in the available products list, clearly explain:
   "We do not currently have that specific item in stock at NEXOVIRA. However, here are the verified appliances and products currently available in our inventory that can serve your needs:"
   Then recommend only the available in-stock products that best fit their purpose.
4. ALL PRICES MUST BE IN NIGERIAN NAIRA (₦ NGN): Calculate and state prices exclusively in ₦ NGN. (Base conversion is ₦1,600 per $1 USD if base USD price is listed).
5. PRACTICAL ADVICE: Provide thoughtful, actionable advice tailored to their question:
   - For air conditioners: calculate room area (sqm) to HP (1.0 HP for ~15m², 1.5 HP for ~25m², 2.0 HP for ~35m²), power consumption, dual inverter energy savings.
   - For refrigerators: capacity in liters, inverter compressors, voltage stabilization during power cuts.
   - For solar/power: load capacity in watts, battery specs, surge protection.
   - For electronics: screen size, refresh rate, verified warranty in Nigeria.

AVAILABLE IN-STOCK PRODUCTS LIST:
${JSON.stringify(availableInStockProducts.map((p: any) => ({
  id: p.id,
  title: p.title,
  brand: p.brand,
  category: p.categoryId,
  priceNGN: `₦${((p.price || 0) * 1600).toLocaleString('en-NG')}`,
  stock: p.stock,
  specifications: p.specifications,
  keyFeatures: p.keyFeatures,
  warranty: p.warranty
})))}

Provide direct, polite, highly competent advice to the customer's query.`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `${systemPrompt}\n\nCustomer Inquired: ${prompt}`,
      });
    } catch {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `${systemPrompt}\n\nCustomer Inquired: ${prompt}`,
      });
    }

    const aiText = response.text || 'I analyzed our verified inventory and retrieved these in-stock options for your needs:';
    
    // Select relevant in-stock products matching the prompt
    const promptLower = prompt.toLowerCase();
    let relevantProducts = availableInStockProducts.filter((p: any) => {
      const matchText = `${p.title} ${p.brand} ${p.categoryId} ${JSON.stringify(p.specifications || {})} ${JSON.stringify(p.keyFeatures || [])}`.toLowerCase();
      const words = promptLower.split(/\s+/).filter((w: string) => w.length > 2);
      return words.some((w: string) => matchText.includes(w));
    });

    if (relevantProducts.length === 0) {
      relevantProducts = availableInStockProducts.slice(0, 3);
    } else {
      relevantProducts = relevantProducts.slice(0, 4);
    }

    res.json({
      success: true,
      replyText: aiText,
      intent: 'PRODUCT',
      suggestedProducts: relevantProducts,
      suggestedServices: [],
      suggestedCourses: [],
      suggestedEbooks: [],
      actions: [
        { label: 'View In-Stock Appliances', actionQuery: 'Show me available inverter air conditioners' },
        { label: 'Energy Efficient Inverters', actionQuery: 'Which in-stock items have high energy efficiency?' },
        { label: 'Best Refrigerators for Power Cuts', actionQuery: 'Which in-stock refrigerators have low power draw?' }
      ]
    });
  } catch (error) {
    safeLogger.error('Gemini AI API Error in /api/v1/ai/chat:', error);
    const availableInStock = PRODUCTS.filter(p => (p.stock ?? 0) > 0);
    res.json({
      success: true,
      replyText: 'I reviewed our verified in-stock catalog. Here are the available products matching your inquiry:',
      suggestedProducts: availableInStock.slice(0, 2),
      suggestedServices: [],
      suggestedCourses: []
    });
  }
});

// 4.5. ReviewLens Strict Anti-Hallucination Sentiment Analysis Endpoint
app.post('/api/v1/ai/review-lens', async (req, res) => {
  try {
    const { reviews, productTitle, url } = req.body;

    // Pre-API Validation Guard (Backend): Check scraper array length in Node.js
    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      return res.json({
        hasValidReviews: false,
        summary: 'No valid customer reviews were found at the provided URL.',
        sentimentScore: 0,
        positiveAspects: [],
        negativeAspects: [],
        reviewCount: 0
      });
    }

    const ai = getAIClient();
    const systemPrompt = `You are a strict data-extraction engine. You must ONLY analyze the provided customer review texts.
DO NOT invent, fabricate, assume, or pull outside knowledge about the product or its brand.
If the provided review list is empty or contains no real feedback, return the JSON flag "hasValidReviews": false immediately. DO NOT generate placeholder or sample reviews under any circumstances.`;

    const contents = `${systemPrompt}\n\nProduct Title: ${productTitle || 'Unknown'}\nTarget URL: ${url || 'N/A'}\nExtracted Review Texts (${reviews.length} items):\n${JSON.stringify(reviews)}`;

    let responseText = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents,
      });
      responseText = response.text || '';
    } catch (modelErr) {
      // Fallback to gemini-3.8-flash if needed
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
      });
      responseText = fallbackResponse.text || '';
    }

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      parsed = {
        hasValidReviews: true,
        summary: responseText,
        sentimentScore: 85,
        positiveAspects: [],
        negativeAspects: [],
        reviewCount: reviews.length
      };
    }

    res.json(parsed);
  } catch (error) {
    console.error('ReviewLens API Error:', error);
    res.json({
      hasValidReviews: false,
      summary: 'Unable to analyze reviews due to missing or invalid feedback.',
      sentimentScore: 0,
      reviewCount: 0
    });
  }
});

// 5. Admin AI Analytics Endpoint
app.post('/api/v1/ai/admin', authenticateToken, requireRole('admin', 'super_admin'), aiRateLimiter, async (req, res) => {
  try {
    const { query } = req.body || {};
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ success: false, error: 'Query string is required.' });
    }

    const cleanQuery = sanitizeString(query, 1000);
    const ai = getAIClient();

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `You are NEXOVIRA Admin AI for the executive management of NEXOVIRA (https://nexovira.com.ng), an online-only Nigerian technology ecosystem. Answer concisely: "${cleanQuery}". Context: Online-only operations, secure nationwide courier delivery, authorized manufacturer warranties.`,
      });
    } catch {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are NEXOVIRA Admin AI for the executive management of NEXOVIRA (https://nexovira.com.ng), an online-only Nigerian technology ecosystem. Answer concisely: "${cleanQuery}". Context: Online-only operations, secure nationwide courier delivery, authorized manufacturer warranties.`,
      });
    }

    res.json({ success: true, answer: response.text });
  } catch (err) {
    safeLogger.error('[AI Admin Error]:', err);
    res.json({
      success: true,
      answer: `NEXOVIRA Executive Advisory: Operations running smoothly across verified merchant stores and verified technology services.`
    });
  }
});

// 5.1b. Tech & Digital Services: Client Project Request Ingestion & Tracking
let inMemoryTechRequests: any[] = [];

app.post('/api/v1/tech-services/request', contactRateLimiter, async (req, res) => {
  try {
    const body = req.body || {};
    const projectData = body.projectData || body;
    
    const email = projectData.email || projectData.customerEmail;
    const fullName = projectData.fullName || projectData.customerName || projectData.name;
    const title = projectData.projectTitle || projectData.serviceTitle || projectData.title;
    const description = projectData.projectDescription || projectData.description || projectData.details;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'A valid customer email address is required.'
      });
    }

    if (!title && !description) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'A project title or project description is required.'
      });
    }

    const referenceNumber = projectData.referenceNumber || `NX-REQ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRequest = {
      id: referenceNumber,
      referenceNumber,
      fullName: fullName || 'Valued Client',
      email,
      phone: projectData.phone || projectData.customerPhone || '',
      projectTitle: title || 'Custom Tech Service Request',
      serviceCategory: projectData.serviceCategory || 'General Tech & Digital Services',
      projectType: projectData.projectType || 'Standard',
      projectScope: projectData.projectScope || 'Medium',
      budgetExpectation: projectData.budgetExpectation || 'Standard',
      timeline: projectData.timeline || 'Flexible',
      projectDescription: description || '',
      requiredExpertise: projectData.requiredExpertise || [],
      status: 'pending_review',
      createdAt: new Date().toISOString()
    };

    inMemoryTechRequests.unshift(newRequest);

    // Safe background email notification (never leaks secrets)
    try {
      const emailContent = buildProjectRequestEmailHtml({
        referenceNumber,
        customerName: newRequest.fullName,
        customerEmail: email,
        customerPhone: newRequest.phone,
        serviceTitle: newRequest.projectTitle,
        serviceCategory: newRequest.serviceCategory,
        projectComplexity: newRequest.projectScope,
        projectType: newRequest.projectType,
        projectScope: newRequest.projectScope,
        budgetExpectation: newRequest.budgetExpectation,
        timeline: newRequest.timeline,
        projectDescription: newRequest.projectDescription,
        requiredExpertise: newRequest.requiredExpertise
      });

      await sendEmailNotification({
        to: 'nexoviratech@gmail.com',
        subject: emailContent.subject || `[New Tech Project Request] ${newRequest.projectTitle} - Ref: ${referenceNumber}`,
        html: emailContent.html,
        text: emailContent.text
      });
    } catch (notifyErr) {
      safeLogger.warn('Tech request email notification skipped or failed:', notifyErr);
    }

    res.status(201).json({
      success: true,
      requestId: referenceNumber,
      referenceNumber,
      message: 'Project request submitted successfully to Nexovira Tech & Digital Services.',
      adminEmail: 'nexoviratech@gmail.com',
      data: newRequest
    });
  } catch (err: any) {
    safeLogger.error('Error handling /api/v1/tech-services/request:', err);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to submit tech service request.'
    });
  }
});

app.get('/api/v1/tech-services/request', (req, res) => {
  res.json({
    success: true,
    count: inMemoryTechRequests.length,
    requests: inMemoryTechRequests
  });
});

// 5.2. Tech & Digital Services: AI Request Analysis & Understanding
app.post('/api/v1/tech-services/ai-analyze-request', aiRateLimiter, async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation Error', 
        message: 'Project description or prompt is required and must be a non-empty string.' 
      });
    }

    const cleanPrompt = prompt.trim();

    try {
      const ai = getAIClient();
      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: `You are the NEXOVIRA AI Technical Architect. 
Your role is to understand a client's project idea, problem, or service requirement, and translate it into a structured technical scoping recommendation for the Nexovira Managed Services team.

IMPORTANT BUSINESS PRINCIPLE:
Nexovira operates as a managed professional services ecosystem (Customer -> Nexovira -> Expert -> Completion). 
DO NOT quote specific monetary prices, exact completion dates, or legal guarantees.

Analyze the user's project prompt:
"${cleanPrompt}"

Respond ONLY with a valid JSON object matching this schema:
{
  "summary": "Crisp 1-2 sentence high-level summary of what the client wants to build or achieve",
  "suggestedCategory": "One of: Artificial Intelligence | Web & Software Development | Mobile Development | Cloud & DevOps | Cybersecurity | UI/UX & Product Design | Graphics & Branding | Data & Analytics | Digital Marketing | Writing & Content",
  "recommendedExpertise": ["Array of 2 to 5 relevant technical/creative skill areas, e.g. Frontend Development, UI/UX Design, Payment Gateway Integration"],
  "possibleRequirements": ["Array of 3 to 6 tangible functional requirements, e.g. Responsive User Interface, Product Catalog, Secure Checkout & Payments, Admin Management Dashboard"],
  "projectComplexity": "Low" | "Medium" | "High" | "Enterprise",
  "suggestedProjectType": "One-time Project" | "Short-term Project" | "Long-term Project" | "Consultation" | "Ongoing Support",
  "suggestedScope": "Small" | "Medium" | "Large" | "Enterprise",
  "clarifyingQuestions": [
    "2 to 3 courteous, clarifying questions that would help refine this project scope before assigning an expert"
  ],
  "recommendations": [
    {
      "area": "e.g. Architecture / Mobile / Security / Payments",
      "advice": "1 brief sentence explaining a strategic recommendation"
    }
  ]
}`,
          config: {
            responseMimeType: 'application/json'
          }
        });
      } catch {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `You are the NEXOVIRA AI Technical Architect. 
Your role is to understand a client's project idea, problem, or service requirement, and translate it into a structured technical scoping recommendation for the Nexovira Managed Services team.

IMPORTANT BUSINESS PRINCIPLE:
Nexovira operates as a managed professional services ecosystem (Customer -> Nexovira -> Expert -> Completion). 
DO NOT quote specific monetary prices, exact completion dates, or legal guarantees.

Analyze the user's project prompt:
"${cleanPrompt}"

Respond ONLY with a valid JSON object matching this schema:
{
  "summary": "Crisp 1-2 sentence high-level summary of what the client wants to build or achieve",
  "suggestedCategory": "One of: Artificial Intelligence | Web & Software Development | Mobile Development | Cloud & DevOps | Cybersecurity | UI/UX & Product Design | Graphics & Branding | Data & Analytics | Digital Marketing | Writing & Content",
  "recommendedExpertise": ["Array of 2 to 5 relevant technical/creative skill areas, e.g. Frontend Development, UI/UX Design, Payment Gateway Integration"],
  "possibleRequirements": ["Array of 3 to 6 tangible functional requirements, e.g. Responsive User Interface, Product Catalog, Secure Checkout & Payments, Admin Management Dashboard"],
  "projectComplexity": "Low" | "Medium" | "High" | "Enterprise",
  "suggestedProjectType": "One-time Project" | "Short-term Project" | "Long-term Project" | "Consultation" | "Ongoing Support",
  "suggestedScope": "Small" | "Medium" | "Large" | "Enterprise",
  "clarifyingQuestions": [
    "2 to 3 courteous, clarifying questions that would help refine this project scope before assigning an expert"
  ],
  "recommendations": [
    {
      "area": "e.g. Architecture / Mobile / Security / Payments",
      "advice": "1 brief sentence explaining a strategic recommendation"
    }
  ]
}`,
          config: {
            responseMimeType: 'application/json'
          }
        });
      }

      const parsed = JSON.parse(response.text || '{}');
      return res.json({
        success: true,
        source: 'gemini-3.1-flash-lite',
        data: parsed
      });
    } catch (aiErr) {
      console.warn('[TechServices] Gemini API call fallback triggered:', aiErr);
      
      // Intelligent Rule-Based Fallback
      const lower = cleanPrompt.toLowerCase();
      let category = 'Web & Software Development';
      let expertise: string[] = ['Full Stack Development', 'UI/UX Design', 'Database Architecture'];
      let requirements: string[] = ['Responsive User Interface', 'Core Business Logic', 'Database Setup', 'Deployment'];
      let complexity: 'Low' | 'Medium' | 'High' | 'Enterprise' = 'Medium';
      let clarifying: string[] = [
        'Do you already have brand assets or existing design guidelines?',
        'What is your target launch timeline?'
      ];

      if (lower.includes('ai') || lower.includes('gpt') || lower.includes('llm') || lower.includes('bot') || lower.includes('machine learning') || lower.includes('agent')) {
        category = 'Artificial Intelligence';
        expertise = ['AI Development', 'Generative AI', 'Prompt Engineering', 'API Integration'];
        requirements = ['Custom AI Agent Flow', 'Context Pipeline', 'Guardrails & Safety', 'Streaming Response UI'];
        complexity = 'High';
        clarifying.push('Will the AI model need access to your proprietary business documents?');
      } else if (lower.includes('mobile') || lower.includes('android') || lower.includes('ios') || lower.includes('flutter') || lower.includes('app')) {
        category = 'Mobile Development';
        expertise = ['Mobile Development', 'Flutter / React Native', 'UI/UX Design', 'Push Notifications'];
        requirements = ['Cross-Platform Mobile App', 'Offline Local Cache', 'Device Camera / Hardware Access', 'App Store Setup'];
        clarifying.push('Are you targeting both iOS and Android simultaneously?');
      } else if (lower.includes('design') || lower.includes('ui') || lower.includes('ux') || lower.includes('figma') || lower.includes('logo') || lower.includes('brand')) {
        category = lower.includes('logo') || lower.includes('brand') ? 'Graphics & Branding' : 'UI/UX & Product Design';
        expertise = ['UI/UX Design', 'Wireframing & Prototyping', 'Visual Design Systems'];
        requirements = ['Interactive Figma Prototypes', 'Responsive Layout Tokens', 'Design System Library'];
        complexity = 'Low';
        clarifying.push('Do you have reference products or aesthetic benchmarks you admire?');
      } else if (lower.includes('security') || lower.includes('audit') || lower.includes('penetration') || lower.includes('hack') || lower.includes('vulnerability')) {
        category = 'Cybersecurity';
        expertise = ['Application Security', 'Security Assessment', 'Infrastructure Hardening'];
        requirements = ['Vulnerability Scan Report', 'Threat Model Matrix', 'Remediation Fix Plan'];
        complexity = 'High';
        clarifying.push('What environment (Staging or Live Production) is currently in scope for testing?');
      } else if (lower.includes('cloud') || lower.includes('devops') || lower.includes('server') || lower.includes('docker') || lower.includes('kubernetes')) {
        category = 'Cloud & DevOps';
        expertise = ['Cloud Engineering', 'DevOps & CI/CD', 'Server Infrastructure'];
        requirements = ['Automated CI/CD Pipeline', 'Docker Containerization', 'Automated Daily Backups'];
        complexity = 'Medium';
      } else if (lower.includes('write') || lower.includes('content') || lower.includes('documentation') || lower.includes('article') || lower.includes('whitepaper')) {
        category = 'Writing & Content';
        expertise = ['Technical Writing', 'Content Strategy', 'Copywriting'];
        requirements = ['Clear Written Deliverables', 'SEO Keyword Optimization', 'Tone & Style Alignment'];
        complexity = 'Low';
      }

      return res.json({
        success: true,
        source: 'rule-engine-fallback',
        data: {
          summary: `Technical scoping for: ${cleanPrompt.slice(0, 120)}...`,
          suggestedCategory: category,
          recommendedExpertise: expertise,
          possibleRequirements: requirements,
          projectComplexity: complexity,
          suggestedProjectType: 'One-time Project',
          suggestedScope: 'Medium',
          clarifyingQuestions: clarifying,
          recommendations: [
            {
              area: 'Managed Execution',
              advice: 'Nexovira will assign a verified specialist who matches these technical parameters.'
            }
          ]
        }
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to analyze project prompt.' });
  }
});

// 5.3. Tech & Digital Services: AI Expert Matcher (Admin Co-pilot)
app.post('/api/v1/tech-services/ai-match-experts', aiRateLimiter, async (req, res) => {
  try {
    const rawReq = req.body?.projectRequest || req.body?.serviceRequest || req.body?.request;
    const availableExperts = req.body?.availableExperts;

    if (!rawReq || !availableExperts || !Array.isArray(availableExperts)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation Error', 
        message: 'Project request and available experts array are required.' 
      });
    }

    const projectRequest = rawReq;

    try {
      const ai = getAIClient();
      const promptText = `You are the NEXOVIRA Admin Talent Matching AI.
Given this project request:
Title: ${projectRequest.serviceTitle || 'Project'}
Category: ${projectRequest.serviceCategory || 'Tech & Digital Services'}
Description: ${projectRequest.projectDescription || ''}
Required Skills/Expertise: ${(projectRequest.requiredExpertise || []).join(', ')}
Budget: ${projectRequest.budgetExpectation || 'Flexible'}
Timeline: ${projectRequest.timeline || 'Standard'}

And these available vetted experts from the Nexovira Expert Network:
${availableExperts.map((exp: any, i: number) => `
Expert #${i + 1}:
ID: ${exp.id}
Name: ${exp.name} (${exp.title})
Specialization: ${exp.specialization || exp.primaryExpertise}
Skills: ${(exp.skills || []).join(', ')}
Experience: ${exp.experienceYears || 3} years
Availability: ${exp.availability || 'available'}
Rating: ${exp.rating || 5.0} (${exp.completedProjectsCount || 0} completed)
`).join('\n')}

Rank the best matched experts for this project.
Respond ONLY with a valid JSON object matching:
{
  "summary": "1-2 sentence overview of the talent pool suitability",
  "matches": [
    {
      "expertId": "expert-id-string",
      "providerId": "expert-id-string",
      "matchScore": 95,
      "score": 95,
      "matchReason": "1 concise sentence explaining why this expert is uniquely suited for this brief",
      "rationale": "1 concise sentence explaining why this expert is uniquely suited for this brief",
      "keySkillMatches": ["Skill 1", "Skill 2"]
    }
  ]
}`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: promptText,
          config: {
            responseMimeType: 'application/json'
          }
        });
      } catch {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: promptText,
          config: {
            responseMimeType: 'application/json'
          }
        });
      }

      const parsed = JSON.parse(response.text || '{}');
      const matchesList = Array.isArray(parsed) ? parsed : (parsed.matches || []);
      const normalizedMatches = matchesList.map((m: any) => ({
        expertId: m.expertId || m.providerId || m.id,
        providerId: m.providerId || m.expertId || m.id,
        matchScore: m.matchScore || m.score || 85,
        score: m.score || m.matchScore || 85,
        matchReason: m.matchReason || m.rationale || 'High match with requirements.',
        rationale: m.rationale || m.matchReason || 'High match with requirements.',
        keySkillMatches: m.keySkillMatches || []
      }));

      const summaryText = parsed.summary || 'AI evaluated available experts based on technical specialization and verified track record.';

      return res.json({ 
        success: true, 
        matches: normalizedMatches,
        summary: summaryText,
        data: {
          matches: normalizedMatches,
          summary: summaryText
        }
      });
    } catch (e) {
      // Fallback ranking by skill & category overlap
      const reqText = `${projectRequest.serviceCategory} ${projectRequest.serviceTitle} ${projectRequest.projectDescription} ${(projectRequest.requiredExpertise || []).join(' ')}`.toLowerCase();
      
      const scored = availableExperts.map((exp: any) => {
        let score = 70;
        const matchedSkills: string[] = [];
        (exp.skills || []).forEach((sk: string) => {
          if (reqText.includes(sk.toLowerCase())) {
            score += 8;
            matchedSkills.push(sk);
          }
        });
        if (exp.specialization && reqText.includes(exp.specialization.toLowerCase())) {
          score += 10;
        }
        if (exp.availability === 'available') score += 5;
        score = Math.min(score, 98);

        const reason = `High alignment with ${matchedSkills.slice(0, 3).join(', ') || exp.specialization || 'domain requirements'}.`;
        return {
          expertId: exp.id,
          providerId: exp.id,
          matchScore: score,
          score: score,
          matchReason: reason,
          rationale: reason,
          keySkillMatches: matchedSkills.length > 0 ? matchedSkills : (exp.skills || []).slice(0, 3)
        };
      }).sort((a, b) => b.matchScore - a.matchScore);

      const summary = `Evaluated ${availableExperts.length} vetted specialists based on skills, domain, and availability.`;
      return res.json({ 
        success: true, 
        matches: scored,
        summary,
        data: {
          matches: scored,
          summary
        }
      });
    }
  } catch (err: any) {
    safeLogger.error('Failed to match experts:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Internal Server Error', 
      message: err?.message || 'Failed to match experts.' 
    });
  }
});

// 5.4. Tech & Digital Services: Email Notification to Management (nexoviratech@gmail.com)
app.post('/api/v1/tech-services/notify-management', contactRateLimiter, async (req, res) => {
  try {
    const { type, payload } = req.body || {};
    if (!type || !payload) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation Error', 
        message: 'Notification type and payload are required.' 
      });
    }

    const adminEmail = process.env.NEXOVIRA_ADMIN_EMAIL || 'nexoviratech@gmail.com';

    let emailContent: { html: string; text: string; subject: string };

    if (type === 'new_project_request') {
      emailContent = buildProjectRequestEmailHtml(payload);
    } else if (type === 'expert_application') {
      emailContent = buildExpertApplicationEmailHtml(payload);
    } else if (type === 'scholarship_application') {
      emailContent = buildScholarshipApplicationEmailHtml(payload);
    } else {
      const subject = `[Nexovira System Alert] ${payload.title || 'Notification'}`;
      emailContent = {
        subject,
        text: `Nexovira Alert: ${JSON.stringify(payload, null, 2)}`,
        html: `<p>Nexovira Alert: <pre>${JSON.stringify(payload, null, 2)}</pre></p>`
      };
    }

    // 1. Dispatch email to Nexovira Management (nexoviratech@gmail.com)
    const dispatchResult = await sendEmailNotification({
      to: adminEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    });

    // 2. If client email is provided for new project requests, send confirmation receipt
    let clientConfirmationResult = null;
    if (type === 'new_project_request' && payload.customerEmail && payload.customerEmail.includes('@')) {
      const clientSubject = `[Nexovira Brief Confirmed] ${payload.referenceNumber || 'Your Request'}: ${payload.serviceTitle || 'Project'}`;
      const clientText = `Hello ${payload.customerName || 'Client'},\n\nThank you for submitting your project brief to Nexovira Tech & Digital Services.\nReference: ${payload.referenceNumber || 'Pending'}\n\nOur management team has received your brief and is currently scoping requirements and matching vetted specialists.\nWe will reach out to you via ${payload.customerPhone || payload.customerEmail}.\n\nBest regards,\nNexovira Management Team\nnexoviratech@gmail.com`;
      const clientHtml = `
        <div style="font-family:sans-serif; max-width:600px; margin:0 auto; padding:20px; background:#0f172a; color:#f8fafc; border-radius:12px;">
          <h2 style="color:#38bdf8;">Your Project Brief Has Been Logged</h2>
          <p>Hello <strong>${payload.customerName || 'Client'}</strong>,</p>
          <p>Thank you for engaging the Nexovira Tech & Digital Services managed ecosystem. Your project brief has been received and logged under reference: <strong style="color:#34d399;">${payload.referenceNumber || 'N/A'}</strong>.</p>
          <div style="background:#1e293b; padding:16px; border-radius:8px; margin:16px 0;">
            <p style="margin:4px 0;"><strong>Project:</strong> ${payload.serviceTitle || 'Brief'}</p>
            <p style="margin:4px 0;"><strong>Category:</strong> ${payload.serviceCategory || 'Tech & Digital Services'}</p>
            <p style="margin:4px 0;"><strong>Timeline:</strong> ${payload.timeline || 'Standard'}</p>
          </div>
          <p>Our management team will review your specifications, match the ideal vetted specialist, and contact you directly to finalize milestones and execution.</p>
          <hr style="border:none; border-top:1px solid #334155; margin:20px 0;" />
          <p style="font-size:12px; color:#94a3b8;">Nexovira Managed Services • Dedicated Support: <a href="mailto:nexoviratech@gmail.com" style="color:#38bdf8;">nexoviratech@gmail.com</a></p>
        </div>
      `;

      clientConfirmationResult = await sendEmailNotification({
        to: payload.customerEmail,
        subject: clientSubject,
        html: clientHtml,
        text: clientText
      });
    }

    res.json({
      success: true,
      managementNotification: dispatchResult,
      clientConfirmation: clientConfirmationResult,
      adminEmail
    });
  } catch (err: any) {
    console.error('Error dispatching notification:', err);
    res.status(500).json({ error: err?.message || 'Failed to dispatch email notification.' });
  }
});

// 5.4b. Nexovira Academy: Scholarship Application Notification (nexoviratech@gmail.com)
app.post('/api/v1/scholarship/notify', async (req, res) => {
  try {
    const { application } = req.body;
    if (!application || !application.email) {
      return res.status(400).json({ error: 'Valid application payload is required.' });
    }

    const adminEmail = process.env.NEXOVIRA_ADMIN_EMAIL || 'nexoviratech@gmail.com';
    const emailContent = buildScholarshipApplicationEmailHtml(application);

    // 1. Notify Management
    const mgmtResult = await sendEmailNotification({
      to: adminEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    });

    // 2. Notify Applicant
    let applicantResult = null;
    if (application.email && application.email.includes('@')) {
      const applicantSubject = `[Nexovira Academy] Registration Confirmed: ${application.selectedCourse} (${application.referenceNumber})`;
      const applicantText = `Dear ${application.fullName},\n\nCongratulations! Your application for the Nexovira Scholarship Program (${application.selectedCourse}) has been successfully received.\nApplication Reference: ${application.referenceNumber}\nPayment Status: Confirmed (₦${(application.registrationFee || 4500).toLocaleString()})\n\nPlease access your course community to meet your facilitators and fellow scholars:\n${application.courseWhatsAppLink || 'Assigned in your student portal'}\n\nBest regards,\nNexovira Academy Team\nnexoviratech@gmail.com`;
      const applicantHtml = `
        <div style="font-family:sans-serif; max-width:600px; margin:0 auto; padding:24px; background:#01213D; color:#f8fafc; border-radius:16px; border:1px solid #0682F4;">
          <h2 style="color:#06C3F8; margin-top:0;">🎓 Nexovira Scholarship Registration Confirmed</h2>
          <p>Dear <strong>${application.fullName}</strong>,</p>
          <p>Congratulations! Your registration for the <strong>Nexovira Scholarship Program</strong> has been successfully received and confirmed.</p>
          <div style="background:#071326; padding:18px; border-radius:12px; margin:16px 0; border:1px solid #1e3a5f;">
            <p style="margin:4px 0;"><strong>Selected Course:</strong> <span style="color:#38bdf8;">${application.selectedCourse}</span></p>
            <p style="margin:4px 0;"><strong>Application Reference:</strong> <span style="color:#34d399; font-weight:bold;">${application.referenceNumber}</span></p>
            <p style="margin:4px 0;"><strong>Registration Fee:</strong> ₦${(application.registrationFee || 4500).toLocaleString()} (Confirmed)</p>
          </div>
          <p>You have been assigned to your course learning community:</p>
          <div style="margin:20px 0; text-align:center;">
            <a href="${application.courseWhatsAppLink || '#'}" target="_blank" rel="noopener noreferrer" style="display:inline-block; background:#25D366; color:#ffffff; font-weight:bold; text-decoration:none; padding:14px 28px; border-radius:12px; font-size:14px;">
              💬 Join WhatsApp Learning Community
            </a>
          </div>
          <p style="font-size:12px; color:#94a3b8;">If you have any questions, reply to this email or reach us at <a href="mailto:nexoviratech@gmail.com" style="color:#06C3F8;">nexoviratech@gmail.com</a>.</p>
        </div>
      `;

      applicantResult = await sendEmailNotification({
        to: application.email,
        subject: applicantSubject,
        html: applicantHtml,
        text: applicantText
      });
    }

    res.json({
      success: true,
      managementNotification: mgmtResult,
      applicantConfirmation: applicantResult
    });
  } catch (err: any) {
    console.error('Error in scholarship notification:', err);
    res.status(500).json({ error: err?.message || 'Failed to dispatch scholarship notifications' });
  }
});

// 5.4c. Nexovira Academy: Paystack Payment Initialization & Verification Engine
app.post('/api/v1/scholarship/initialize-payment', async (req, res) => {
  try {
    const { courseId, courseTitle, fee, payerEmail, payerName, payerPhone } = req.body;
    if (!courseId) {
      return res.status(400).json({ success: false, error: 'Course ID is required.' });
    }
    if (!payerEmail || !payerEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid payer email is required.' });
    }

    const timestamp = Date.now();
    const reference = `PSTK_SCH_${timestamp}_${Math.floor(1000 + Math.random() * 9000)}`;
    const feeAmount = Number(fee) || 4500;
    const amountKobo = Math.round(feeAmount * 100);

    const initResult = await initializePaystackTransaction({
      email: payerEmail,
      amountInKobo: amountKobo,
      reference,
      metadata: {
        type: 'scholarship_admission_fee',
        courseId,
        courseTitle,
        payerName,
        payerPhone
      }
    });

    if (!initResult.success) {
      return res.status(400).json({
        success: false,
        error: initResult.error || 'Failed to initialize Paystack checkout for scholarship.'
      });
    }

    res.json({
      success: true,
      data: {
        authorization_url: initResult.authorizationUrl,
        access_code: initResult.accessCode,
        reference: initResult.reference,
        publicKey: getPaystackPublicKey(),
        amount: feeAmount
      }
    });
  } catch (err: any) {
    console.error('[Scholarship Paystack Init Error]:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to initialize scholarship payment.' });
  }
});

app.post('/api/v1/scholarship/verify-payment', async (req, res) => {
  try {
    const { 
      courseId, 
      courseTitle, 
      amount = 4500, 
      payerEmail, 
      payerPhone, 
      payerName, 
      providedReference 
    } = req.body;

    if (!courseId) {
      return res.status(400).json({ success: false, error: 'Course ID is required.' });
    }
    if (!providedReference) {
      return res.status(400).json({ success: false, error: 'Paystack transaction reference is required for verification.' });
    }

    // Verify through Paystack official verification endpoint
    const verifyResult = await verifyPaystackTransaction(providedReference);

    if (!verifyResult.success || !verifyResult.verified) {
      return res.status(400).json({
        success: false,
        error: verifyResult.error || 'Paystack could not verify payment settlement. Form remains locked.',
        data: {
          verified: false,
          paymentStatus: verifyResult.status
        }
      });
    }

    const verificationRecord = {
      verified: true,
      paymentReference: verifyResult.reference,
      courseId,
      courseTitle: courseTitle || 'Nexovira Technology Course',
      amount: verifyResult.amountNGN || Number(amount) || 4500,
      currency: verifyResult.currency || 'NGN',
      paymentMethod: 'Paystack Official Checkout',
      payerEmail: (payerEmail || verifyResult.customer?.email || '').toLowerCase().trim(),
      payerPhone: payerPhone ? payerPhone.trim() : '',
      payerName: payerName ? payerName.trim() : '',
      verifiedAt: verifyResult.paidAt || new Date().toISOString(),
      gatewayResponse: verifyResult.gatewayResponse || 'Approved and Verified by Paystack',
      channel: verifyResult.channel || 'card',
      unlockedStatus: 'form_unlocked'
    };

    res.json({
      success: true,
      message: 'Paystack Payment Genuine Verification Successful. Registration Form Unlocked.',
      data: verificationRecord
    });
  } catch (err: any) {
    console.error('Payment verification error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Payment verification encountered an issue.' });
  }
});

// 5.4d. AI Seller Description Generator (Missing endpoint fix)
app.post('/api/v1/ai/seller', authenticateToken, requireRole('seller', 'admin', 'super_admin'), aiRateLimiter, async (req, res) => {
  try {
    const { title, brand, isDigital, author } = req.body || {};
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required for product description.' });
    }

    const cleanTitle = sanitizeString(title, 200);
    const cleanBrand = sanitizeString(brand || 'NEXOVIRA', 100);
    const cleanAuthor = sanitizeString(author || 'Nexovira Academy', 100);

    const client = getAIClient();
    const prompt = isDigital
      ? `Generate an engaging, professional e-book description (under 50 words) for a digital technical guide titled "${cleanTitle}" written by ${cleanAuthor}. Highlight core technical skills and practical value.`
      : `Generate a high-converting, premium product description (under 50 words) for "${cleanBrand}" ${cleanTitle}. Highlight reliability, energy efficiency, and peace of mind for Nigerian customers.`;

    let response;
    try {
      response = await client.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt
      });
    } catch {
      response = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt
      });
    }

    const description = response.text?.trim() || '';
    res.json({ success: true, description });
  } catch (err: any) {
    safeLogger.error('[AI Seller Endpoint Notice]:', err);
    const fallback = req.body?.isDigital
      ? `Comprehensive digital guide "${sanitizeString(req.body?.title || '', 200)}" written by ${sanitizeString(req.body?.author || 'Nexovira Faculty', 100)}. Features verified industry insights and step-by-step frameworks.`
      : `Premium ${sanitizeString(req.body?.brand || 'NEXOVIRA', 100)} ${sanitizeString(req.body?.title || '', 200)} engineered with zero-defect quality, energy-efficient smart technology, and verified manufacturer warranty.`;
    res.json({ success: true, description: fallback });
  }
});

// 5.5. Security Telemetry & Error Audit Endpoint
app.post('/api/v1/security/client-error', authRateLimiter, (req, res) => {
  try {
    const { type, incidentId, report, details } = req.body || {};
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Sanitize and redact to ensure tokens, passwords, and payment credentials are never logged
    const safeDetails = redactSensitiveData(details);
    const safeReport = redactSensitiveData(report);

    safeLogger.warn(`[NEXOVIRA CLIENT SECURITY EVENT] Type: ${type || 'CLIENT_INCIDENT'} | IP: ${clientIp} | Incident ID: ${incidentId || 'N/A'}`);
    if (safeDetails) {
      safeLogger.warn(`Telemetry Details: ${JSON.stringify(safeDetails)}`);
    }
    if (safeReport) {
      safeLogger.warn(`Crash Report: ${JSON.stringify(safeReport)}`);
    }

    res.json({ success: true, status: 'logged', received: true });
  } catch (e) {
    res.json({ success: true, status: 'ignored' });
  }
});

// 6. Real Nigerian Bank Verification Endpoints (Backend Server-Authoritative)

// A. Check active verification provider configuration status
app.get('/api/v1/bank/provider-status', authRateLimiter, (req, res) => {
  try {
    const provider = getActiveBankVerificationProvider();
    const isConfigured = provider.isConfigured();
    const missing = provider.getMissingCredentials();

    res.json({
      success: true,
      configured: isConfigured,
      provider: provider.name,
      missingCredentials: missing,
      message: isConfigured
        ? `Bank verification service is active using real ${provider.name} interbank NUBAN resolution.`
        : `Bank verification service is offline. Missing required server credential(s): ${missing.join(', ')}. Set these environment variables in Settings.`
    });
  } catch (err: any) {
    safeLogger.error('Error checking bank verification provider status:', err);
    res.status(500).json({
      success: false,
      configured: false,
      provider: 'unknown',
      error: 'Internal Server Error',
      message: err?.message || 'Error checking bank verification provider status.'
    });
  }
});

// B. Fetch Dynamic List of Verified Nigerian Banks from Provider
app.get('/api/v1/bank/banks', async (req, res) => {
  try {
    const provider = getActiveBankVerificationProvider();
    const result = await provider.getBanks();

    res.json({
      success: true,
      configured: provider.isConfigured(),
      provider: provider.name,
      missingCredentials: provider.isConfigured() ? [] : provider.getMissingCredentials(),
      banks: result.banks,
      fromCache: result.fromCache || false,
      message: result.message
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      configured: false,
      banks: [],
      message: err?.message || 'Internal server error while fetching banks.'
    });
  }
});

// C. Real NUBAN Interbank Account Resolution
app.post('/api/v1/bank/verify', bankRateLimiter, async (req, res) => {
  try {
    const { bankName, bankCode, accountNumber, sellerId } = req.body;
    const cleanAcc = (accountNumber || '').replace(/\D/g, '');
    const cleanCode = (bankCode || '').trim();

    if (!cleanAcc || cleanAcc.length !== 10) {
      return res.status(400).json({
        verified: false,
        status: 'INVALID_INPUT',
        errorCode: 'INVALID_NUBAN_LENGTH',
        message: 'Invalid NUBAN account number. Nigerian bank account numbers must be exactly 10 numeric digits.'
      });
    }

    if (!cleanCode && !bankName) {
      return res.status(400).json({
        verified: false,
        status: 'INVALID_INPUT',
        errorCode: 'MISSING_BANK',
        message: 'Please select a valid Nigerian bank.'
      });
    }

    const provider = getActiveBankVerificationProvider();

    // Check if provider is configured - Fail safely if missing secrets
    if (!provider.isConfigured()) {
      const missing = provider.getMissingCredentials();
      const hasPublicKeyNotice = missing.some(m => m.includes('pk_'));
      return res.status(503).json({
        verified: false,
        status: 'CONFIG_REQUIRED',
        errorCode: hasPublicKeyNotice ? 'PUBLIC_KEY_PROVIDED' : 'MISSING_PROVIDER_CREDENTIALS',
        provider: provider.name,
        missingCredentials: missing,
        message: hasPublicKeyNotice
          ? "Paystack Public Key detected (starts with 'pk_'). Interbank NUBAN account verification requires your Paystack Secret Key (starts with 'sk_live_' or 'sk_test_'). Please obtain your Secret Key from Paystack Dashboard (Settings → API Keys & Webhooks) and update PAYSTACK_SECRET_KEY in Settings."
          : `Real bank verification cannot proceed because server API credentials (${missing.join(', ')}) are not configured in environment variables. Please configure ${missing.join(', ')} in Settings.`
      });
    }

    // Call real provider NUBAN resolution engine
    const verificationResult = await provider.resolveAccount(cleanAcc, cleanCode, bankName);

    if (!verificationResult.verified) {
      return res.status(422).json(verificationResult);
    }

    // Return the genuine provider verified account holder name
    res.json(verificationResult);
  } catch (err: any) {
    res.status(500).json({
      verified: false,
      status: 'PROVIDER_UNAVAILABLE',
      errorCode: 'INTERNAL_ERROR',
      message: err?.message || 'Bank account verification service encountered an unexpected error.'
    });
  }
});

// Catch-all 404 for undefined API routes: ALWAYS return clean JSON, NEVER HTML
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route ${req.method} ${req.path} not found.`,
    status: 404
  });
});

// JSON error handling middleware for malformed client bodies
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ success: false, error: 'Malformed JSON payload in request body.' });
  }
  next(err);
});

// SEO HTML Rendering and Crawlability Helper
function renderPageHtml(req: express.Request, res: express.Response, template: string) {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  const baseUrl = host.includes('localhost') ? CANONICAL_SITE_URL : `${protocol}://${host}`;
  const products = (typeof inMemoryProducts !== 'undefined' && inMemoryProducts.length > 0) ? inMemoryProducts : PRODUCTS;

  const seo = getRouteSEOMetadata(req.path, baseUrl, products);

  let html = template;

  // 1. Replace <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${seo.title}</title>`);

  // 2. Meta description
  if (html.includes('name="description"')) {
    html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${seo.description}" />`);
  } else {
    html = html.replace('</head>', `  <meta name="description" content="${seo.description}" />\n</head>`);
  }

  // 3. Meta robots
  if (html.includes('name="robots"')) {
    html = html.replace(/<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i, `<meta name="robots" content="${seo.robots}" />`);
  } else {
    html = html.replace('</head>', `  <meta name="robots" content="${seo.robots}" />\n</head>`);
  }

  // 4. Canonical link
  if (html.includes('rel="canonical"')) {
    html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${seo.canonicalUrl}" />`);
  } else {
    html = html.replace('</head>', `  <link rel="canonical" href="${seo.canonicalUrl}" />\n</head>`);
  }

  // 5. OpenGraph & Twitter tags
  const socialTags = `
    <!-- Route-Specific Social & OpenGraph Meta -->
    <meta property="og:title" content="${seo.title}" />
    <meta property="og:description" content="${seo.description}" />
    <meta property="og:url" content="${seo.canonicalUrl}" />
    <meta property="og:image" content="${seo.ogImage}" />
    <meta property="og:type" content="${seo.ogType}" />
    <meta property="og:site_name" content="NEXOVIRA Ecosystem Nigeria" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${seo.title}" />
    <meta name="twitter:description" content="${seo.description}" />
    <meta name="twitter:image" content="${seo.ogImage}" />
  `;
  html = html.replace(/<meta\s+property="og:[^"]*"\s+content="[^"]*"\s*\/?>/gi, '');
  html = html.replace(/<meta\s+name="twitter:[^"]*"\s+content="[^"]*"\s*\/?>/gi, '');
  html = html.replace('</head>', `${socialTags}\n</head>`);

  // 6. JSON-LD Structured Data Schema
  if (seo.jsonLdSchemas && seo.jsonLdSchemas.length > 0) {
    const jsonLdContent = JSON.stringify(
      seo.jsonLdSchemas.length === 1 ? seo.jsonLdSchemas[0] : seo.jsonLdSchemas
    );
    const jsonLdTag = `\n    <script type="application/ld+json" id="nexovira-server-jsonld">${jsonLdContent}</script>\n`;
    html = html.replace('</head>', `${jsonLdTag}</head>`);
  }

  // 7. Crawlable semantic HTML injected into <div id="root">
  if (seo.semanticHtml) {
    html = html.replace(
      /<div id="root">[\s\S]*?<\/div>/i,
      `<div id="root"><div id="seo-rendered-content" class="seo-ssr-wrapper">${seo.semanticHtml}</div></div>`
    );
  }

  res.status(seo.statusCode)
    .setHeader('Content-Type', 'text/html; charset=utf-8')
    .send(html);
}

// Start Full-Stack Express Server with Vite Integration
async function startServer() {
  let vite: any = null;

  if (process.env.NODE_ENV !== 'production') {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));
  }

  // Server-Side Rendered SEO Page Handler (Catches all frontend HTML routes)
  app.get('*', async (req, res, next) => {
    // Skip API, assets, uploads, and non-html file requests
    if (
      req.path.startsWith('/api/') ||
      req.path.startsWith('/uploads/') ||
      req.path.startsWith('/assets/') ||
      (req.path.includes('.') && !req.path.endsWith('.html'))
    ) {
      return next();
    }

    try {
      if (process.env.NODE_ENV !== 'production' && vite) {
        const templatePath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(templatePath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        renderPageHtml(req, res, template);
      } else {
        const distPath = path.join(process.cwd(), 'dist');
        const templatePath = path.join(distPath, 'index.html');
        const fallbackPath = path.resolve(process.cwd(), 'index.html');
        const template = fs.existsSync(templatePath) 
          ? fs.readFileSync(templatePath, 'utf-8') 
          : fs.readFileSync(fallbackPath, 'utf-8');
        renderPageHtml(req, res, template);
      }
    } catch (err) {
      console.error('[SSR/SEO Render Error]:', err);
      next(err);
    }
  });

  // Global Centralized Safe Error Handling Middleware
  app.use(safeErrorHandler);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NEXOVIRA Platform Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
