import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { safeLogger } from './securityMiddleware';

export const PUBLIC_SIGNUP_ROLES = ['customer', 'seller', 'affiliate', 'verified_expert'] as const;
export type PublicSignupRole = typeof PUBLIC_SIGNUP_ROLES[number];

export const PRIVILEGED_ROLES = [
  'admin',
  'super_admin',
  'management',
  'content_editor',
  'verified_expert_approved'
] as const;

export type UserRole = 
  | 'customer'
  | 'seller'
  | 'affiliate'
  | 'verified_expert_pending'
  | 'verified_expert_approved'
  | 'verified_expert_rejected'
  | 'expert'
  | 'admin'
  | 'super_admin'
  | 'management'
  | 'content_editor';

export type UserAccountStatus = 'active' | 'pending' | 'suspended' | 'rejected' | 'deactivated';

export interface UserProfileRecord {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  role: UserRole;
  accountStatus: UserAccountStatus;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  isAffiliate?: boolean;
  affiliateCode?: string;
  affiliateId?: string;
  storeName?: string;
  businessName?: string;
  addresses?: any[];
  notificationPreferences?: any;
}

export interface RoleAuditLogRecord {
  id: string;
  userId: string;
  userEmail?: string;
  action: 'ROLE_ASSIGNED_SIGNUP' | 'ROLE_CHANGED_ADMIN' | 'STATUS_CHANGED_ADMIN' | 'ROLE_ESCALATION_BLOCKED';
  previousRole?: UserRole | string;
  assignedRole: UserRole | string;
  performedBy: string;
  reason?: string;
  ip?: string;
  timestamp: string;
}

// In-memory fallback and cache for fast lookup and tests
const userCache = new Map<string, UserProfileRecord>();
const auditLogStore: RoleAuditLogRecord[] = [];

// Lazy Firestore instance
function getDb() {
  try {
    if (getApps().length === 0) {
      initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0797653089'
      });
    }
    return getFirestore();
  } catch (e) {
    return null;
  }
}

/**
 * Returns the designated routing dashboard path based on user role
 */
export function getDashboardPathForRole(role: UserRole | string): string {
  switch (role) {
    case 'customer':
      return '/dashboard/customer';
    case 'seller':
      return '/dashboard/seller';
    case 'affiliate':
      return '/dashboard/affiliate';
    case 'verified_expert_pending':
    case 'verified_expert_approved':
    case 'verified_expert_rejected':
    case 'expert':
      return '/dashboard/verified-expert';
    case 'admin':
    case 'super_admin':
    case 'management':
    case 'content_editor':
      return '/admin';
    default:
      return '/dashboard/customer';
  }
}

/**
 * Returns the exact required dashboard title
 */
export function getDashboardTitleForRole(role: UserRole | string): string {
  switch (role) {
    case 'customer':
      return 'Customer Dashboard';
    case 'seller':
      return 'Seller Dashboard';
    case 'affiliate':
      return 'Affiliate Dashboard';
    case 'verified_expert_pending':
    case 'verified_expert_approved':
    case 'verified_expert_rejected':
    case 'expert':
      return 'Verified Expert Dashboard';
    case 'admin':
    case 'super_admin':
      return 'Admin Command Center';
    default:
      return 'Customer Dashboard';
  }
}

/**
 * Normalizes and validates requested public signup role.
 * Throws an error or returns validation failure if user attempts privilege escalation.
 */
export function validatePublicSignupRole(requestedRole: unknown): {
  valid: boolean;
  assignedRole: UserRole;
  initialStatus: UserAccountStatus;
  dashboard: string;
  dashboardTitle: string;
  error?: string;
} {
  if (!requestedRole || typeof requestedRole !== 'string') {
    return {
      valid: false,
      assignedRole: 'customer',
      initialStatus: 'active',
      dashboard: '/dashboard/customer',
      dashboardTitle: 'Customer Dashboard',
      error: 'Account type is required. Please select Customer, Seller, Affiliate, or Verified Expert.'
    };
  }

  const normalized = requestedRole.trim().toLowerCase();

  // Explicit check for privilege escalation attempts
  const isPrivilegedAttempt = PRIVILEGED_ROLES.some(p => p.toLowerCase() === normalized) ||
    normalized.includes('admin') || 
    normalized.includes('management') || 
    normalized.includes('editor');

  if (isPrivilegedAttempt) {
    return {
      valid: false,
      assignedRole: 'customer',
      initialStatus: 'active',
      dashboard: '/dashboard/customer',
      dashboardTitle: 'Customer Dashboard',
      error: 'Security Guard: Public registration cannot create administrative, management, or privileged accounts.'
    };
  }

  // Check allowlist
  if (normalized === 'customer') {
    return {
      valid: true,
      assignedRole: 'customer',
      initialStatus: 'active',
      dashboard: '/dashboard/customer',
      dashboardTitle: 'Customer Dashboard'
    };
  }

  if (normalized === 'seller') {
    return {
      valid: true,
      assignedRole: 'seller',
      initialStatus: 'active',
      dashboard: '/dashboard/seller',
      dashboardTitle: 'Seller Dashboard'
    };
  }

  if (normalized === 'affiliate') {
    return {
      valid: true,
      assignedRole: 'affiliate',
      initialStatus: 'active',
      dashboard: '/dashboard/affiliate',
      dashboardTitle: 'Affiliate Dashboard'
    };
  }

  if (normalized === 'verified_expert' || normalized === 'verified expert' || normalized === 'expert') {
    return {
      valid: true,
      assignedRole: 'verified_expert_pending',
      initialStatus: 'pending',
      dashboard: '/dashboard/verified-expert',
      dashboardTitle: 'Verified Expert Dashboard'
    };
  }

  return {
    valid: false,
    assignedRole: 'customer',
    initialStatus: 'active',
    dashboard: '/dashboard/customer',
    dashboardTitle: 'Customer Dashboard',
    error: `Invalid account type "${requestedRole}". Valid signup roles are: Customer, Seller, Affiliate, Verified Expert.`
  };
}

/**
 * Records an immutable role change or escalation attempt in the audit log
 */
export async function recordRoleAuditLog(entry: Omit<RoleAuditLogRecord, 'id'>): Promise<RoleAuditLogRecord> {
  const log: RoleAuditLogRecord = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    ...entry
  };

  auditLogStore.unshift(log);
  safeLogger.info(`[AUDIT LOG] ${log.action}: User ${log.userId} (${log.userEmail}) -> Role: ${log.assignedRole} by ${log.performedBy}`);

  // Persist to Firestore if available
  const db = getDb();
  if (db) {
    try {
      await db.collection('audit_logs').doc(log.id).set(log);
    } catch (e) {
      // safe fallback
    }
  }

  return log;
}

/**
 * Registers and persists a user profile with server-verified role and audit trail
 */
export async function registerUserProfile(data: {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  requestedRole: string;
  ip?: string;
}): Promise<{ profile: UserProfileRecord; dashboard: string; dashboardTitle: string }> {
  const validation = validatePublicSignupRole(data.requestedRole);

  if (!validation.valid) {
    await recordRoleAuditLog({
      userId: data.uid,
      userEmail: data.email,
      action: 'ROLE_ESCALATION_BLOCKED',
      previousRole: 'none',
      assignedRole: 'BLOCKED',
      performedBy: 'SECURITY_GUARD',
      reason: validation.error,
      ip: data.ip,
      timestamp: new Date().toISOString()
    });
    throw new Error(validation.error);
  }

  const now = new Date().toISOString();
  const profile: UserProfileRecord = {
    uid: data.uid,
    email: data.email.toLowerCase().trim(),
    displayName: data.displayName.trim() || 'NEXOVIRA Member',
    phone: data.phone?.trim() || '',
    role: validation.assignedRole,
    accountStatus: validation.initialStatus,
    emailVerified: false,
    createdAt: now,
    updatedAt: now,
    isAffiliate: validation.assignedRole === 'affiliate'
  };

  // Cache locally
  userCache.set(profile.uid, profile);

  // Persist to Firestore
  const db = getDb();
  if (db) {
    try {
      await db.collection('users').doc(profile.uid).set(profile, { merge: true });
    } catch (err) {
      safeLogger.warn('Could not persist profile to Firestore directly, cached in memory:', err);
    }
  }

  // Audit Log
  await recordRoleAuditLog({
    userId: profile.uid,
    userEmail: profile.email,
    action: 'ROLE_ASSIGNED_SIGNUP',
    previousRole: 'none',
    assignedRole: profile.role,
    performedBy: 'PUBLIC_SIGNUP',
    reason: `Initial mandatory signup selection as ${data.requestedRole}`,
    ip: data.ip,
    timestamp: now
  });

  return {
    profile,
    dashboard: validation.dashboard,
    dashboardTitle: validation.dashboardTitle
  };
}

/**
 * Authoritatively retrieves and verifies user role from server/Firestore.
 * Detects and prevents client-side role tampering (e.g. modifying localStorage).
 */
export async function verifyUserRole(uid: string, reportedRole?: string): Promise<{
  uid: string;
  verifiedRole: UserRole;
  accountStatus: UserAccountStatus;
  dashboard: string;
  dashboardTitle: string;
  tampered: boolean;
  profile: UserProfileRecord | null;
}> {
  let profile = userCache.get(uid) || null;

  if (!profile) {
    const db = getDb();
    if (db) {
      try {
        const snap = await db.collection('users').doc(uid).get();
        if (snap.exists) {
          profile = snap.data() as UserProfileRecord;
          userCache.set(uid, profile);
        }
      } catch (e) {
        // use fallback
      }
    }
  }

  const authoritativeRole: UserRole = profile?.role || 'customer';
  const authoritativeStatus: UserAccountStatus = profile?.accountStatus || 'active';

  let tampered = false;
  if (reportedRole && reportedRole !== authoritativeRole) {
    tampered = true;
    safeLogger.warn(`[SECURITY WARNING] Role mismatch/tampering detected for UID ${uid}! Reported: "${reportedRole}", Server Authoritative: "${authoritativeRole}"`);
    
    await recordRoleAuditLog({
      userId: uid,
      userEmail: profile?.email || 'unknown',
      action: 'ROLE_ESCALATION_BLOCKED',
      previousRole: authoritativeRole,
      assignedRole: authoritativeRole,
      performedBy: 'TAMPER_DETECTOR',
      reason: `Client attempted to report role "${reportedRole}" but server holds authoritative role "${authoritativeRole}".`,
      timestamp: new Date().toISOString()
    });
  }

  return {
    uid,
    verifiedRole: authoritativeRole,
    accountStatus: authoritativeStatus,
    dashboard: getDashboardPathForRole(authoritativeRole),
    dashboardTitle: getDashboardTitleForRole(authoritativeRole),
    tampered,
    profile
  };
}

/**
 * Administrator action to approve, reject, suspend, or modify user roles.
 * Only authorized administrators may execute this.
 */
export async function adminChangeUserRole(params: {
  adminUid: string;
  adminEmail: string;
  targetUid: string;
  newRole: UserRole;
  newStatus?: UserAccountStatus;
  reason?: string;
}): Promise<UserProfileRecord> {
  const { adminUid, adminEmail, targetUid, newRole, newStatus, reason } = params;

  let existing = userCache.get(targetUid) || null;
  const db = getDb();

  if (!existing && db) {
    try {
      const snap = await db.collection('users').doc(targetUid).get();
      if (snap.exists) {
        existing = snap.data() as UserProfileRecord;
      }
    } catch (_) {}
  }

  const previousRole = existing?.role || 'customer';
  const previousStatus = existing?.accountStatus || 'active';
  const now = new Date().toISOString();

  const updated: UserProfileRecord = {
    ...(existing || {
      uid: targetUid,
      email: 'user@nexovira.com',
      displayName: 'Member',
      emailVerified: true,
      createdAt: now
    }),
    role: newRole,
    accountStatus: newStatus || existing?.accountStatus || 'active',
    updatedAt: now
  };

  userCache.set(targetUid, updated);

  if (db) {
    try {
      await db.collection('users').doc(targetUid).set(updated, { merge: true });
    } catch (e) {
      safeLogger.warn('Error updating role in Firestore:', e);
    }
  }

  await recordRoleAuditLog({
    userId: targetUid,
    userEmail: updated.email,
    action: 'ROLE_CHANGED_ADMIN',
    previousRole,
    assignedRole: newRole,
    performedBy: adminEmail || adminUid,
    reason: reason || `Admin role update from ${previousRole} to ${newRole} (status: ${updated.accountStatus})`,
    timestamp: now
  });

  return updated;
}

/**
 * Returns role audit logs
 */
export function getRoleAuditLogs(): RoleAuditLogRecord[] {
  return [...auditLogStore];
}

/**
 * Returns cached user profiles
 */
export function getAllCachedUsers(): UserProfileRecord[] {
  return Array.from(userCache.values());
}
