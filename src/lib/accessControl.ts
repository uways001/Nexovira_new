import { UserProfile, UserRole, UserAccessControl } from '../types';

/**
 * Maps a user role to its designated primary dashboard route.
 * Role-Based Dynamic Redirection Specification:
 * - Affiliate -> /dashboard/affiliate
 * - Customer -> /dashboard/customer
 * - Seller -> /dashboard/seller
 * - Verified Expert -> /dashboard/expert
 */
export function getRoleDashboardRoute(role?: UserRole | string): string {
  const normalized = (role || 'customer').toLowerCase().trim();

  switch (normalized) {
    case 'affiliate':
      return '/dashboard/affiliate';
    case 'seller':
      return '/dashboard/seller';
    case 'expert':
    case 'verified_expert_approved':
    case 'verified_expert_pending':
    case 'verified_expert_rejected':
      return '/dashboard/expert';
    case 'admin':
    case 'super_admin':
    case 'management':
    case 'content_editor':
      return '/admin';
    case 'customer':
    default:
      return '/dashboard/customer';
  }
}

/**
 * Returns a human-friendly title for the user's designated dashboard
 */
export function getRoleDashboardTitle(role?: UserRole | string): string {
  const normalized = (role || 'customer').toLowerCase().trim();

  switch (normalized) {
    case 'affiliate':
      return 'Affiliate Portal';
    case 'seller':
      return 'Seller Dashboard';
    case 'expert':
    case 'verified_expert_approved':
    case 'verified_expert_pending':
    case 'verified_expert_rejected':
      return 'Verified Expert Center';
    case 'admin':
    case 'super_admin':
      return 'Admin Command Center';
    case 'customer':
    default:
      return 'Customer Dashboard';
  }
}

/**
 * Evaluates access control and action restrictions based on user role and verification status.
 *
 * Rules:
 * 1. Customer: Granted standard browsing, cart, and purchasing access upon sign-in.
 * 2. Seller:
 *    - Profile Check: verify profile_completed == true AND is_verified == true
 *    - Incomplete/Unverified: Display "Unverified: Complete your profile" banner/badge
 *    - Restrictions: can_upload_products = false until both profile_completed and is_verified are confirmed.
 * 3. Affiliate:
 *    - Profile Check: verify profile_completed == true
 *    - Incomplete: Display "Incomplete Profile: Complete your profile to view products" banner
 *    - Restrictions: can_access_products = false until profile is completed.
 * 4. General Access Rule: Strictly restrict product creation/upload rights to verified Sellers only.
 */
export function evaluateUserAccessControl(profile: Partial<UserProfile> | null): UserAccessControl {
  if (!profile) {
    return {
      role: 'customer',
      profile_completed: false,
      is_verified: false,
      can_upload_products: false,
      can_access_products: true,
      statusBadgeText: 'Guest Account',
      statusBadgeVariant: 'standard',
      requiresProfileCompletion: false,
      designationRoute: '/dashboard/customer'
    };
  }

  const role: UserRole = profile.role || 'customer';
  const designationRoute = getRoleDashboardRoute(role);

  // 1. Customer Role
  if (role === 'customer') {
    return {
      role: 'customer',
      profile_completed: true,
      is_verified: true,
      can_upload_products: false, // General Access Rule: Verified sellers only
      can_access_products: true,  // Standard browsing, cart, and purchasing
      statusBadgeText: 'Customer Account',
      statusBadgeVariant: 'standard',
      requiresProfileCompletion: false,
      designationRoute: '/dashboard/customer'
    };
  }

  // 2. Admin Roles
  if (role === 'admin' || role === 'super_admin' || role === 'management') {
    return {
      role,
      profile_completed: true,
      is_verified: true,
      can_upload_products: true,
      can_access_products: true,
      statusBadgeText: 'System Administrator',
      statusBadgeVariant: 'verified',
      requiresProfileCompletion: false,
      designationRoute: '/admin'
    };
  }

  // 3. Seller Role
  if (role === 'seller') {
    const profile_completed = Boolean(profile.profile_completed ?? profile.profileCompleted ?? false);
    const is_verified = Boolean(profile.is_verified ?? profile.isVerified ?? false);
    const can_upload_products = profile_completed && is_verified;

    const isCompleteAndVerified = profile_completed && is_verified;

    return {
      role: 'seller',
      profile_completed,
      is_verified,
      can_upload_products,
      can_access_products: true,
      statusBadgeText: isCompleteAndVerified 
        ? 'Verified Merchant' 
        : 'Unverified: Complete your profile',
      statusBadgeVariant: isCompleteAndVerified ? 'verified' : 'unverified',
      requiresProfileCompletion: !profile_completed || !is_verified,
      designationRoute: '/dashboard/seller'
    };
  }

  // 4. Affiliate Role
  if (role === 'affiliate') {
    const profile_completed = Boolean(profile.profile_completed ?? profile.profileCompleted ?? false);
    const is_verified = Boolean(profile.is_verified ?? profile.isVerified ?? true);
    const can_access_products = profile_completed;

    return {
      role: 'affiliate',
      profile_completed,
      is_verified,
      can_upload_products: false, // Strictly verified sellers only
      can_access_products,
      statusBadgeText: profile_completed 
        ? 'Active Affiliate Partner' 
        : 'Incomplete Profile: Complete your profile to view products',
      statusBadgeVariant: profile_completed ? 'verified' : 'incomplete',
      requiresProfileCompletion: !profile_completed,
      designationRoute: '/dashboard/affiliate'
    };
  }

  // 5. Expert Roles
  const isExpertApproved = role === 'verified_expert_approved';
  return {
    role,
    profile_completed: Boolean(profile.profile_completed ?? profile.profileCompleted ?? true),
    is_verified: isExpertApproved,
    can_upload_products: false, // Strictly verified sellers only
    can_access_products: true,
    statusBadgeText: isExpertApproved ? 'Verified Expert' : 'Expert Verification Pending',
    statusBadgeVariant: isExpertApproved ? 'verified' : 'unverified',
    requiresProfileCompletion: !profile.profile_completed && !profile.profileCompleted,
    designationRoute: '/dashboard/expert'
  };
}
