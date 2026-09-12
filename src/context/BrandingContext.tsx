import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  BrandingSettings, 
  WebsiteContentSettings, 
  subscribeToBranding, 
  subscribeToWebsiteContent, 
  subscribeToStoreSettings,
  saveBrandingToFirestore,
  saveWebsiteContentToFirestore,
  getBrandingFromFirestore,
  getWebsiteContentFromFirestore,
  getStoreSettingsFromFirestore
} from '../lib/firestoreService';
import { broadcastGlobalChange, subscribeToGlobalSyncEvents } from '../lib/globalSync';
import defaultLogoImg from '../assets/Logo.jpeg';
import { NEXOVIRA_CONTACT_CONFIG } from '../config/contactConfig';

export interface BrandingContextType {
  logoUrl: string;
  brandName: string;
  tagline: string;
  primaryColor: string;
  whatsappPhone: string;
  storePhone: string;
  contactEmail: string;
  branding: BrandingSettings | null;
  websiteContent: WebsiteContentSettings | null;
  storeSettings: any;
  loading: boolean;
  updateBranding: (data: Partial<BrandingSettings>) => Promise<BrandingSettings>;
  updateWebsiteContent: (data: Partial<WebsiteContentSettings>) => Promise<WebsiteContentSettings>;
  refreshBranding: () => Promise<void>;
}

const DEFAULT_BRANDING_STATE: BrandingSettings = {
  id: 'general',
  companyName: 'NEXOVIRA',
  tagline: 'Innovation begins with vision. Smart living, better every day.',
  logoUrl: defaultLogoImg || '/Logo.jpeg',
  primaryColor: '#0682F4',
  secondaryColor: '#01213D',
  accentColor: '#06C3F8',
  supportEmail: 'nexovirasupport@gmail.com',
  supportPhone: '+234 702 590 0156',
  address: 'Online-Only Technology Ecosystem, Nigeria (Nationwide Courier & Digital Delivery)',
  currency: 'NGN',
  updatedAt: new Date().toISOString()
};

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<BrandingSettings>(DEFAULT_BRANDING_STATE);
  const [websiteContent, setWebsiteContent] = useState<WebsiteContentSettings | null>(null);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refreshBranding = async () => {
    try {
      const [b, w, s] = await Promise.all([
        getBrandingFromFirestore(),
        getWebsiteContentFromFirestore(),
        getStoreSettingsFromFirestore()
      ]);
      if (b) setBranding(prev => ({ ...prev, ...b, logoUrl: b.logoUrl || prev.logoUrl }));
      if (w) setWebsiteContent(w);
      if (s) setStoreSettings(s);
    } catch (err) {
      console.warn('Initial branding load notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    refreshBranding();

    // 1. Real-time Firestore subscription to branding
    const unsubBranding = subscribeToBranding((liveBranding) => {
      if (liveBranding) {
        setBranding(prev => ({
          ...prev,
          ...liveBranding,
          logoUrl: liveBranding.logoUrl || prev.logoUrl || defaultLogoImg || '/Logo.jpeg'
        }));
      }
    });

    // 2. Real-time Firestore subscription to website content
    const unsubContent = subscribeToWebsiteContent((liveContent) => {
      if (liveContent) {
        setWebsiteContent(liveContent);
      }
    });

    // 3. Real-time Firestore subscription to store settings
    const unsubStore = subscribeToStoreSettings((liveSettings) => {
      if (liveSettings) {
        setStoreSettings(liveSettings);
      }
    });

    // 4. Cross-tab global sync event listener
    const unsubGlobal = subscribeToGlobalSyncEvents((evt) => {
      if (evt.type === 'BRANDING_UPDATED' || evt.type === 'CONTENT_UPDATED') {
        refreshBranding();
      }
    });

    return () => {
      unsubBranding();
      unsubContent();
      unsubStore();
      unsubGlobal();
    };
  }, []);

  const handleUpdateBranding = async (data: Partial<BrandingSettings>): Promise<BrandingSettings> => {
    const updated = await saveBrandingToFirestore(data);
    setBranding(prev => ({ ...prev, ...updated }));
    broadcastGlobalChange('BRANDING_UPDATED', 'general', updated);
    return updated;
  };

  const handleUpdateWebsiteContent = async (data: Partial<WebsiteContentSettings>): Promise<WebsiteContentSettings> => {
    const updated = await saveWebsiteContentToFirestore(data);
    setWebsiteContent(updated);
    broadcastGlobalChange('CONTENT_UPDATED', 'main', updated);
    return updated;
  };

  const activeLogoUrl = branding.logoUrl || defaultLogoImg || '/Logo.jpeg';
  const activeBrandName = branding.companyName || 'NEXOVIRA';
  const activeTagline = branding.tagline || 'Innovation begins with vision. Smart living, better every day.';
  const activePrimaryColor = branding.primaryColor || '#0682F4';
  const activeWhatsappPhone = websiteContent?.whatsappPhone || storeSettings?.whatsappPhone || NEXOVIRA_CONTACT_CONFIG.officialWhatsAppNumber;
  const activeStorePhone = websiteContent?.supportPhone || storeSettings?.storePhone || NEXOVIRA_CONTACT_CONFIG.supportPhone;
  const activeContactEmail = websiteContent?.supportEmail || storeSettings?.contactEmail || NEXOVIRA_CONTACT_CONFIG.supportEmail;

  const value: BrandingContextType = {
    logoUrl: activeLogoUrl,
    brandName: activeBrandName,
    tagline: activeTagline,
    primaryColor: activePrimaryColor,
    whatsappPhone: activeWhatsappPhone,
    storePhone: activeStorePhone,
    contactEmail: activeContactEmail,
    branding,
    websiteContent,
    storeSettings,
    loading,
    updateBranding: handleUpdateBranding,
    updateWebsiteContent: handleUpdateWebsiteContent,
    refreshBranding
  };

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = (): BrandingContextType => {
  const context = useContext(BrandingContext);
  if (!context) {
    // Fallback safe object if accessed outside Provider
    return {
      logoUrl: defaultLogoImg || '/Logo.jpeg',
      brandName: 'NEXOVIRA',
      tagline: 'Innovation begins with vision. Smart living, better every day.',
      primaryColor: '#0682F4',
      whatsappPhone: NEXOVIRA_CONTACT_CONFIG.officialWhatsAppNumber,
      storePhone: NEXOVIRA_CONTACT_CONFIG.supportPhone,
      contactEmail: NEXOVIRA_CONTACT_CONFIG.supportEmail,
      branding: null,
      websiteContent: null,
      storeSettings: null,
      loading: false,
      updateBranding: async () => DEFAULT_BRANDING_STATE,
      updateWebsiteContent: async () => ({} as any),
      refreshBranding: async () => {}
    };
  }
  return context;
};
