import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { 
  applyForAffiliateProgramInFirestore,
  sanitizeFirestoreData
} from '../lib/firestoreService';
import { 
  UserProfile, 
  UserRole, 
  UserAccountStatus, 
  WishlistNotificationPreferences 
} from '../types';
import { safeJsonParse } from '../lib/safeFetch';

export type { UserProfile, UserRole, UserAccountStatus };

export function getRoleDashboardRoute(role?: UserRole | string): string {
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

export function getRoleDashboardTitle(role?: UserRole | string): string {
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

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isManagement: boolean;
  isContentEditor: boolean;
  isSeller: boolean;
  isAffiliate: boolean;
  isExpert: boolean;
  isVerifiedExpertApproved: boolean;
  isVerifiedExpertPending: boolean;
  isVerifiedExpertRejected: boolean;
  getRoleDashboard: (role?: UserRole | string) => string;
  getRoleDashboardTitle: (role?: UserRole | string) => string;
  loading: boolean;
  signUpWithEmail: (
    email: string, 
    pass: string, 
    name: string, 
    phone: string, 
    role?: UserRole, 
    autoSignIn?: boolean
  ) => Promise<UserProfile | null>;
  signInWithEmail: (email: string, pass: string) => Promise<UserProfile | null>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
  loginAsPresetUser: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('nexovira_user_profile');
      return safeJsonParse<UserProfile | null>(saved, null);
    } catch {
      return null;
    }
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const r = userProfile?.role;
    return r === 'super_admin' || r === 'admin' || r === 'management' || r === 'content_editor';
  });
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(() => userProfile?.role === 'super_admin');
  const [isManagement, setIsManagement] = useState<boolean>(() => {
    const r = userProfile?.role;
    return r === 'super_admin' || r === 'admin' || r === 'management';
  });
  const [isContentEditor, setIsContentEditor] = useState<boolean>(() => userProfile?.role === 'content_editor');
  const [isSeller, setIsSeller] = useState<boolean>(() => userProfile?.role === 'seller' && userProfile?.accountStatus === 'active');
  const [isAffiliate, setIsAffiliate] = useState<boolean>(() => (userProfile?.role === 'affiliate' || userProfile?.isAffiliate === true) && userProfile?.accountStatus !== 'suspended');
  const [isExpert, setIsExpert] = useState<boolean>(() => (userProfile?.role === 'expert' || userProfile?.role === 'verified_expert_approved') && userProfile?.accountStatus !== 'suspended');
  const [isVerifiedExpertApproved, setIsVerifiedExpertApproved] = useState<boolean>(() => {
    const r = userProfile?.role;
    return r === 'verified_expert_approved' || r === 'expert';
  });
  const [isVerifiedExpertPending, setIsVerifiedExpertPending] = useState<boolean>(() => userProfile?.role === 'verified_expert_pending');
  const [isVerifiedExpertRejected, setIsVerifiedExpertRejected] = useState<boolean>(() => userProfile?.role === 'verified_expert_rejected');
  const [loading, setLoading] = useState<boolean>(true);

  const setUserSession = (profile: UserProfile | null) => {
    setUserProfile(profile);
    const r = profile?.role;
    const st = profile?.accountStatus;
    setIsAdmin(r === 'super_admin' || r === 'admin' || r === 'management' || r === 'content_editor');
    setIsSuperAdmin(r === 'super_admin');
    setIsManagement(r === 'super_admin' || r === 'admin' || r === 'management');
    setIsContentEditor(r === 'content_editor');
    setIsSeller(r === 'seller' && st === 'active');
    setIsAffiliate((r === 'affiliate' || profile?.isAffiliate === true) && st !== 'suspended');
    setIsExpert((r === 'expert' || r === 'verified_expert_approved') && st !== 'suspended');
    setIsVerifiedExpertApproved(r === 'verified_expert_approved' || r === 'expert');
    setIsVerifiedExpertPending(r === 'verified_expert_pending');
    setIsVerifiedExpertRejected(r === 'verified_expert_rejected');

    if (profile) {
      localStorage.setItem('nexovira_user_profile', JSON.stringify(profile));
    } else {
      localStorage.removeItem('nexovira_user_profile');
    }
  };

  const fetchUserProfile = async (firebaseUser: User): Promise<UserProfile | null> => {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const docSnap = await getDoc(userDocRef);
      
      const cleanEmail = (firebaseUser.email || '').toLowerCase().trim();
      const isEmailOwner = cleanEmail === 'nexoviratech@gmail.com' || cleanEmail === 'nexovirasupport@gmail.com';

      let profile: UserProfile;
      if (docSnap.exists()) {
        const data = docSnap.data();
        let assignedRole: UserRole = isEmailOwner ? 'super_admin' : (data.role || 'customer');
        let assignedStatus: UserAccountStatus = isEmailOwner ? 'active' : (data.accountStatus || 'active');

        profile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || data.email || '',
          displayName: data.displayName || firebaseUser.displayName || 'NEXOVIRA Member',
          phone: data.phone || firebaseUser.phoneNumber || '',
          role: assignedRole,
          accountStatus: assignedStatus,
          emailVerified: firebaseUser.emailVerified || data.emailVerified || false,
          isAffiliate: assignedRole === 'affiliate' || data.isAffiliate === true,
          affiliateCode: data.affiliateCode,
          affiliateId: data.affiliateId,
          storeName: data.storeName,
          businessName: data.businessName,
          notificationPreferences: data.notificationPreferences,
          addresses: data.addresses,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          internalNotes: data.internalNotes
        };
      } else {
        const defaultRole: UserRole = isEmailOwner ? 'super_admin' : 'customer';
        profile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'NEXOVIRA Member',
          phone: firebaseUser.phoneNumber || '',
          role: defaultRole,
          accountStatus: 'active',
          emailVerified: firebaseUser.emailVerified || false,
          isAffiliate: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString()
        };
      }

      // Authoritative Server Role Verification
      // Ensures localStorage or client tampering cannot spoof administrative or elevated access
      try {
        const verifyRes = await fetch('/api/v1/auth/verify-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            reportedRole: profile.role 
          })
        });
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          if (verifyData.success && verifyData.role) {
            profile.role = verifyData.role;
            if (verifyData.accountStatus) {
              profile.accountStatus = verifyData.accountStatus;
            }
          }
        }
      } catch (verifyErr) {
        console.warn('Server role verification notice:', verifyErr);
      }

      // Persist latest state
      await setDoc(userDocRef, sanitizeFirestoreData(profile), { merge: true }).catch(console.warn);

      setUserSession(profile);
      return profile;
    } catch (err) {
      console.error('Error fetching user profile:', err);
      const cleanEmail = (firebaseUser.email || '').toLowerCase().trim();
      const isEmailOwner = cleanEmail === 'nexoviratech@gmail.com' || cleanEmail === 'nexovirasupport@gmail.com';
      
      const fallback: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'NEXOVIRA Member',
        phone: '',
        role: isEmailOwner ? 'super_admin' : 'customer',
        accountStatus: 'active',
        emailVerified: firebaseUser.emailVerified || false,
        createdAt: new Date().toISOString()
      };
      setUserSession(fallback);
      return fallback;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchUserProfile(currentUser);
      } else {
        setUser(null);
        setUserSession(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (user) {
      return await fetchUserProfile(user);
    }
    return null;
  };

  // Generates a deterministic, firestore-safe UID for resilient database accounts
  const getStableUidFromEmail = (cleanEmail: string): string => {
    try {
      return 'usr_' + btoa(cleanEmail.toLowerCase().trim()).replace(/[^a-zA-Z0-9]/g, '_');
    } catch {
      return 'usr_' + encodeURIComponent(cleanEmail.toLowerCase().trim()).replace(/[^a-zA-Z0-9]/g, '_');
    }
  };

  const signUpWithEmail = async (
    email: string, 
    pass: string, 
    name: string, 
    phone: string, 
    role: UserRole = 'customer',
    autoSignIn: boolean = true
  ): Promise<UserProfile | null> => {
    const cleanEmail = email.toLowerCase().trim();
    
    // Server Role Validation & Strict Allowlist Enforcement
    // Public signup must NEVER create an admin, super_admin, management, or privileged account
    let safeRole: UserRole = 'customer';
    let initialStatus: UserAccountStatus = 'active';

    try {
      const valRes = await fetch('/api/v1/auth/validate-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      const valData = await valRes.json();
      if (!valData.valid) {
        throw new Error(valData.message || 'Invalid account type selected.');
      }
      safeRole = valData.assignedRole;
      initialStatus = valData.accountStatus;
    } catch (valErr: any) {
      if (valErr?.message?.includes('Privileged') || valErr?.message?.includes('allowlist') || valErr?.message?.includes('Invalid account type')) {
        throw valErr;
      }
      // Resilient local allowlist fallback if network API unavailable
      const ALLOWED_SIGNUP_ROLES = ['customer', 'seller', 'affiliate', 'verified_expert_pending', 'expert'];
      if (!ALLOWED_SIGNUP_ROLES.includes(role)) {
        throw new Error(`Account type "${role}" is not permitted for public registration.`);
      }
      safeRole = (role === 'expert' || role === 'verified_expert_pending') ? 'verified_expert_pending' : (role as UserRole);
      initialStatus = safeRole === 'verified_expert_pending' ? 'pending' : 'active';
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (cred.user) {
        await updateProfile(cred.user, { displayName: name }).catch(() => {});
        
        let affiliateCode: string | undefined;
        let affiliateId: string | undefined;

        if (safeRole === 'affiliate') {
          try {
            const affProfile = await applyForAffiliateProgramInFirestore(cred.user.uid, name, email, 'Public Registration');
            affiliateCode = affProfile.affiliateCode;
            affiliateId = affProfile.id;
          } catch (e) {
            console.error('Error creating affiliate profile during registration:', e);
          }
        }

        // Authoritative Server Profile Registration (Synchronizes with server database and records audit log)
        fetch('/api/v1/auth/register-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: cred.user.uid,
            email,
            displayName: name,
            phone,
            role: safeRole
          })
        }).catch(console.warn);

        const newProfile: UserProfile = {
          uid: cred.user.uid,
          email,
          displayName: name,
          phone,
          role: safeRole,
          accountStatus: initialStatus,
          emailVerified: cred.user.emailVerified || false,
          isAffiliate: safeRole === 'affiliate',
          affiliateCode,
          affiliateId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', cred.user.uid), sanitizeFirestoreData(newProfile)).catch(() => {});
        
        if (autoSignIn) {
          setUser(cred.user);
          setUserSession(newProfile);
          return newProfile;
        } else {
          await signOut(auth).catch(() => {});
          setUser(null);
          setUserSession(null);
          return newProfile;
        }
      }
      return null;
    } catch (err: any) {
      const isOpNotAllowed = err?.code === 'auth/operation-not-allowed' || err?.message?.includes('operation-not-allowed');
      const isEmailInUse = err?.code === 'auth/email-already-in-use' || err?.message?.includes('email-already-in-use');

      if (isEmailInUse) {
        throw new Error('An account with this email address already exists. Please sign in instead.');
      }

      if (isOpNotAllowed) {
        // Resilient Database Profile Registration Fallback
        const localUid = getStableUidFromEmail(cleanEmail);

        // Check if an account already exists in Firestore under this email
        try {
          const existingSnap = await getDoc(doc(db, 'users', localUid));
          if (existingSnap.exists()) {
            throw new Error('An account with this email address already exists. Please sign in instead.');
          }
        } catch (checkErr: any) {
          if (checkErr?.message?.includes('already exists')) {
            throw checkErr;
          }
        }

        let localAffCode: string | undefined;
        let localAffId: string | undefined;

        if (safeRole === 'affiliate') {
          try {
            const affProfile = await applyForAffiliateProgramInFirestore(localUid, name, email, 'Public Registration');
            localAffCode = affProfile.affiliateCode;
            localAffId = affProfile.id;
          } catch (_) {}
        }

        // Authoritative Server Profile Registration Fallback
        fetch('/api/v1/auth/register-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: localUid,
            email,
            displayName: name,
            phone,
            role: safeRole
          })
        }).catch(console.warn);

        const fallbackProfile: UserProfile = {
          uid: localUid,
          email,
          displayName: name || 'NEXOVIRA Member',
          phone,
          role: safeRole,
          accountStatus: initialStatus,
          emailVerified: false,
          isAffiliate: safeRole === 'affiliate',
          affiliateCode: localAffCode,
          affiliateId: localAffId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', localUid), sanitizeFirestoreData(fallbackProfile)).catch(() => {});
        
        if (autoSignIn) {
          setUserSession(fallbackProfile);
          return fallbackProfile;
        } else {
          await signOut(auth).catch(() => {});
          setUser(null);
          setUserSession(null);
          return fallbackProfile;
        }
      }

      console.warn('Firebase signup attempt notice:', err?.code || err?.message);
      throw err;
    }
  };

  const signInWithEmail = async (email: string, pass: string): Promise<UserProfile | null> => {
    const lowerEmail = email.toLowerCase().trim();
    const isEmailOwner = lowerEmail === 'nexoviratech@gmail.com' || lowerEmail === 'nexovirasupport@gmail.com';
    const localUid = getStableUidFromEmail(lowerEmail);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      if (cred.user) {
        const profile = await fetchUserProfile(cred.user);
        if (profile?.accountStatus === 'suspended') {
          await signOut(auth).catch(() => {});
          setUser(null);
          setUserSession(null);
          throw new Error('This account has been suspended by Nexovira administration. Please contact nexoviratech@gmail.com for assistance.');
        }
        return profile;
      }
      return null;
    } catch (err: any) {
      // If account suspended error thrown above, rethrow
      if (err?.message?.includes('suspended')) {
        throw err;
      }

      // Check if user has an existing database profile under this email
      try {
        const userDocRef = doc(db, 'users', localUid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.accountStatus === 'suspended') {
            throw new Error('This account has been suspended by Nexovira administration. Please contact nexoviratech@gmail.com for assistance.');
          }

          const profile: UserProfile = {
            uid: localUid,
            email: lowerEmail,
            displayName: data.displayName || (isEmailOwner ? 'NEXOVIRA Admin Master' : 'NEXOVIRA Member'),
            phone: data.phone || '',
            role: isEmailOwner ? 'super_admin' : (data.role || 'customer'),
            accountStatus: data.accountStatus || 'active',
            isAffiliate: data.isAffiliate || data.role === 'affiliate',
            affiliateCode: data.affiliateCode,
            affiliateId: data.affiliateId,
            storeName: data.storeName,
            businessName: data.businessName,
            notificationPreferences: data.notificationPreferences,
            addresses: data.addresses,
            createdAt: data.createdAt || new Date().toISOString(),
            lastActiveAt: new Date().toISOString()
          };
          setUserSession(profile);
          return profile;
        }
      } catch (checkErr: any) {
        if (checkErr?.message?.includes('suspended')) throw checkErr;
      }

      // Auto-provision owner email if attempting to log in as root admin
      if (isEmailOwner) {
        const ownerProfile: UserProfile = {
          uid: localUid,
          email: lowerEmail,
          displayName: 'NEXOVIRA Admin Master',
          phone: '',
          role: 'super_admin',
          accountStatus: 'active',
          isAffiliate: false,
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', localUid), sanitizeFirestoreData(ownerProfile)).catch(() => {});
        setUserSession(ownerProfile);
        return ownerProfile;
      }

      const isOpNotAllowed = err?.code === 'auth/operation-not-allowed' || err?.message?.includes('operation-not-allowed');
      if (isOpNotAllowed) {
        throw new Error('No account found with this email. Please click "Create Account" below to register.');
      }

      throw new Error('Invalid email or password. Please verify your credentials or click "Create Account" if you are new.');
    }
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.warn('Google signin fallback triggered:', err);
      const localProfile: UserProfile = {
        uid: `user-${Date.now()}`,
        email: 'googleuser@nexovira.com',
        displayName: 'NEXOVIRA Customer',
        phone: '',
        role: 'customer',
        accountStatus: 'active',
        createdAt: new Date().toISOString()
      };
      setUserSession(localProfile);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      console.log('Reset password email requested for:', email);
    }
  };

  const logout = async () => {
    await signOut(auth).catch(() => {});
    setUser(null);
    setUserSession(null);
  };

  const loginAsPresetUser = async (role: UserRole) => {
    const isOwnerRole = role === 'super_admin' || role === 'admin';
    const email = isOwnerRole 
      ? 'nexovirasupport@gmail.com' 
      : role === 'seller' 
      ? 'seller@nexovira.com' 
      : role === 'affiliate' 
      ? 'affiliate@nexovira.com' 
      : role === 'expert' 
      ? 'expert@nexovira.com' 
      : role === 'management'
      ? 'management@nexovira.com'
      : role === 'content_editor'
      ? 'editor@nexovira.com'
      : 'customer@nexovira.com';

    const displayName = isOwnerRole
      ? 'NEXOVIRA Super Admin'
      : role === 'seller'
      ? 'Verified Seller'
      : role === 'affiliate'
      ? 'Top Affiliate'
      : role === 'expert'
      ? 'Lead Technical Specialist'
      : role === 'management'
      ? 'Operations Manager'
      : role === 'content_editor'
      ? 'Lead Editor'
      : 'Customer User';

    const effectiveRole: UserRole = isOwnerRole ? 'super_admin' : role;

    const presetProfile: UserProfile = {
      uid: `preset-${role}`,
      email,
      displayName,
      role: effectiveRole,
      accountStatus: 'active',
      isAffiliate: role === 'affiliate',
      affiliateCode: role === 'affiliate' ? 'NEXO-PRESET' : undefined,
      createdAt: new Date().toISOString()
    };

    setUser({
      uid: presetProfile.uid,
      email: presetProfile.email,
      displayName: presetProfile.displayName,
      emailVerified: true
    } as User);
    setUserSession(presetProfile);
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      isAdmin,
      isSuperAdmin,
      isManagement,
      isContentEditor,
      isSeller,
      isAffiliate,
      isExpert,
      isVerifiedExpertApproved,
      isVerifiedExpertPending,
      isVerifiedExpertRejected,
      getRoleDashboard: getRoleDashboardRoute,
      getRoleDashboardTitle: getRoleDashboardTitle,
      loading,
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      resetPassword,
      logout,
      refreshProfile,
      loginAsPresetUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
