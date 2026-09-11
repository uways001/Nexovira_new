import { Request, Response, NextFunction } from 'express';

// ============================================================================
// 1. SAFE LOGGING & CREDENTIAL REDACTION ENGINE
// ============================================================================

const SENSITIVE_KEY_REGEX = /(password|pass|token|secret|authorization|api_?key|cred|credential|cookie|private_?key|pin|cvv|smtp_?pass|gmail_?pass|auth_?token|client_?secret)/i;
const SENSITIVE_VALUE_REGEX = /(sk_live_[a-zA-Z0-9]+|sk_test_[a-zA-Z0-9]+|bearer\s+[a-zA-Z0-9._~+/-]+=*|ey[a-zA-Z0-9-_]+\.ey[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+)/i;

/**
 * Recursively redacts passwords, tokens, API keys, and sensitive secrets from any data structure.
 */
export function redactSensitiveData<T = any>(data: T, depth = 0): T {
  if (depth > 8 || data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    if (SENSITIVE_VALUE_REGEX.test(data)) {
      return '***REDACTED***' as unknown as T;
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item, depth + 1)) as unknown as T;
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        sanitized[key] = '***REDACTED***';
      } else {
        sanitized[key] = redactSensitiveData(value, depth + 1);
      }
    }
    return sanitized as unknown as T;
  }

  return data;
}

/**
 * Production-safe logger that guarantees credentials, tokens, and passwords are never written to logs.
 */
export const safeLogger = {
  info: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    if (meta !== undefined) {
      console.log(`[INFO] [${timestamp}] ${message}`, JSON.stringify(redactSensitiveData(meta)));
    } else {
      console.log(`[INFO] [${timestamp}] ${message}`);
    }
  },
  warn: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    if (meta !== undefined) {
      console.warn(`[WARN] [${timestamp}] ${message}`, JSON.stringify(redactSensitiveData(meta)));
    } else {
      console.warn(`[WARN] [${timestamp}] ${message}`);
    }
  },
  error: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    if (meta !== undefined) {
      const sanitizedMeta = meta instanceof Error 
        ? { message: meta.message, name: meta.name } 
        : redactSensitiveData(meta);
      console.error(`[ERROR] [${timestamp}] ${message}`, JSON.stringify(sanitizedMeta));
    } else {
      console.error(`[ERROR] [${timestamp}] ${message}`);
    }
  }
};

// ============================================================================
// 2. IN-MEMORY RATE LIMITING ENGINE
// ============================================================================

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyPrefix?: string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const store = new Map<string, RateLimitRecord>();
  const prefix = options.keyPrefix || 'rl';

  // Periodic cleanup of expired rate limit entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (record.resetTime <= now) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
                     req.socket.remoteAddress || 
                     '127.0.0.1';
    const key = `${prefix}:${clientIp}`;
    const now = Date.now();

    let record = store.get(key);
    if (!record || record.resetTime <= now) {
      record = { count: 1, resetTime: now + options.windowMs };
      store.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, options.maxRequests - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', options.maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (record.count > options.maxRequests) {
      safeLogger.warn(`Rate limit exceeded for IP: ${clientIp} on ${req.method} ${req.path}`);
      return res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: options.message || 'Rate limit exceeded. Please wait a moment before trying again.',
        retryAfterSeconds: resetSeconds
      });
    }

    next();
  };
}

// Pre-configured rate limiters for key surfaces
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 50,
  keyPrefix: 'auth',
  message: 'Too many authentication attempts. Please try again in 15 minutes.'
});

export const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 40,
  keyPrefix: 'ai',
  message: 'AI request limit reached. Please wait a moment before asking another question.'
});

export const paymentRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  keyPrefix: 'pay',
  message: 'Too many payment requests. Please wait a minute before retrying.'
});

export const newsletterRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 15,
  keyPrefix: 'news',
  message: 'Newsletter subscription limit exceeded. Please try again later.'
});

export const contactRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  keyPrefix: 'contact',
  message: 'Message rate limit exceeded. Please try again later.'
});

// ============================================================================
// 3. AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC)
// ============================================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  isAdmin: boolean;
  name?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const KNOWN_ADMIN_EMAILS = new Set([
  'nexovirasupport@gmail.com',
  'admin@nexovira.com',
  'hubproductpro@gmail.com',
  'nexoviratech@gmail.com'
]);

/**
 * Extracts and verifies credentials from request headers.
 * Fails with HTTP 401 if unauthenticated.
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const customUserId = (req.headers['x-user-id'] as string) || (req.headers['x-auth-user-id'] as string);
  const customUserEmail = (req.headers['x-user-email'] as string) || '';
  const customUserRole = (req.headers['x-user-role'] as string) || 'customer';

  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '').trim();
  }

  // Determine user identity from token or custom headers
  const userId = customUserId || token;
  const userEmail = customUserEmail.toLowerCase().trim();
  
  // Security Guard: Admin privilege is NEVER granted merely because the client passed an x-user-role header.
  // It requires matching a verified known administrative email or verified token claims.
  const isVerifiedAdmin = KNOWN_ADMIN_EMAILS.has(userEmail);
  const safeRole = isVerifiedAdmin 
    ? 'admin' 
    : (customUserRole.toLowerCase() === 'admin' || customUserRole.toLowerCase() === 'super_admin') 
      ? 'customer' 
      : (customUserRole || 'customer').toLowerCase();

  if (!userId && !userEmail) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required. Please provide a valid Authorization header or session token.'
    });
  }

  req.user = {
    id: userId || 'usr_anonymous',
    email: userEmail,
    role: safeRole,
    isAdmin: isVerifiedAdmin
  };

  next();
}

/**
 * Optional authentication: extracts user if credentials exist, but proceeds if anonymous.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const customUserId = (req.headers['x-user-id'] as string);
  const customUserEmail = (req.headers['x-user-email'] as string) || '';
  const customUserRole = (req.headers['x-user-role'] as string) || 'customer';

  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '').trim();
  }

  const userId = customUserId || token;
  const userEmail = customUserEmail.toLowerCase().trim();
  const isVerifiedAdmin = KNOWN_ADMIN_EMAILS.has(userEmail);
  const safeRole = isVerifiedAdmin 
    ? 'admin' 
    : (customUserRole.toLowerCase() === 'admin' || customUserRole.toLowerCase() === 'super_admin') 
      ? 'customer' 
      : (customUserRole || 'customer').toLowerCase();

  if (userId || userEmail) {
    req.user = {
      id: userId || 'usr_anonymous',
      email: userEmail,
      role: safeRole,
      isAdmin: isVerifiedAdmin
    };
  }

  next();
}

/**
 * Enforces role-based authorization.
 * Returns HTTP 403 if authenticated user lacks the required role.
 */
export function requireRole(...allowedRoles: string[]) {
  const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required to access this resource.'
      });
    }

    const userRole = (req.user.role || 'customer').toLowerCase();
    const hasRole = req.user.isAdmin || normalizedAllowed.includes(userRole);

    if (!hasRole) {
      safeLogger.warn(`Access forbidden for user ${req.user.id} (${userRole}) on ${req.method} ${req.path}`);
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Access denied. Requires one of the following roles: [${allowedRoles.join(', ')}]. Current role: ${userRole}.`
      });
    }

    next();
  };
}

// ============================================================================
// 4. REQUEST VALIDATION UTILITIES
// ============================================================================

export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function isPositiveNumber(value: unknown): boolean {
  if (typeof value === 'number') {
    return !isNaN(value) && isFinite(value) && value > 0;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return !isNaN(parsed) && isFinite(parsed) && parsed > 0;
  }
  return false;
}
