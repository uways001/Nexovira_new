import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Image as ImageIcon, 
  MessageSquare, 
  HelpCircle, 
  Star, 
  Layers, 
  Mail, 
  History, 
  Save, 
  Trash2, 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Upload,
  ExternalLink
} from 'lucide-react';
import { 
  BrandingSettings, 
  WebsiteContentSettings, 
  WhatsAppTemplate, 
  CMSBanner, 
  CMSTestimonial, 
  CMSFaq, 
  CMSEnquiry, 
  CMSActivityLog 
} from '../../types';
import { 
  getBrandingFromFirestore, 
  saveBrandingToFirestore,
  getWebsiteContentFromFirestore,
  saveWebsiteContentToFirestore,
  getWhatsAppTemplatesFromFirestore,
  saveWhatsAppTemplateToFirestore,
  deleteWhatsAppTemplateFromFirestore,
  getBannersFromFirestore,
  saveBannerToFirestore,
  deleteBannerFromFirestore,
  getTestimonialsFromFirestore,
  saveTestimonialToFirestore,
  deleteTestimonialFromFirestore,
  getFaqsFromFirestore,
  saveFaqToFirestore,
  deleteFaqFromFirestore,
  getEnquiriesFromFirestore,
  updateEnquiryStatusInFirestore,
  deleteEnquiryFromFirestore,
  getActivityLogsFromFirestore
} from '../../lib/firestoreService';
import { uploadImageToFirebaseStorage } from '../../lib/storageService';

export const AdminCMSManager: React.FC = () => {
  const [subTab, setSubTab] = useState<'branding' | 'website' | 'whatsapp' | 'banners' | 'testimonials' | 'faqs' | 'enquiries' | 'activity'>('branding');
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // States
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [websiteContent, setWebsiteContent] = useState<WebsiteContentSettings | null>(null);
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplate[]>([]);
  const [banners, setBanners] = useState<CMSBanner[]>([]);
  const [testimonials, setTestimonials] = useState<CMSTestimonial[]>([]);
  const [faqs, setFaqs] = useState<CMSFaq[]>([]);
  const [enquiries, setEnquiries] = useState<CMSEnquiry[]>([]);
  const [activityLogs, setActivityLogs] = useState<CMSActivityLog[]>([]);

  // Uploading state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [brand, web, wa, ban, test, faq, enq, logs] = await Promise.all([
        getBrandingFromFirestore(),
        getWebsiteContentFromFirestore(),
        getWhatsAppTemplatesFromFirestore(),
        getBannersFromFirestore(),
        getTestimonialsFromFirestore(),
        getFaqsFromFirestore(),
        getEnquiriesFromFirestore(),
        getActivityLogsFromFirestore(40)
      ]);
      setBranding(brand);
      setWebsiteContent(web);
      setWhatsappTemplates(wa);
      setBanners(ban);
      setTestimonials(test);
      setFaqs(faq);
      setEnquiries(enq);
      setActivityLogs(logs);
    } catch (err: any) {
      console.error('Failed to load CMS data:', err);
      setSaveError('Failed to load CMS data from Firestore.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const notifySuccess = (msg: string) => {
    setSaveSuccess(msg);
    setSaveError(null);
    setTimeout(() => setSaveSuccess(null), 4000);
  };

  // Logo upload
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const downloadUrl = await uploadImageToFirebaseStorage(file, 'branding/logo');
      if (branding) {
        const updated = await saveBrandingToFirestore({ ...branding, logoUrl: downloadUrl });
        setBranding(updated);
        notifySuccess('Brand logo uploaded and saved permanently in Firebase Storage & Firestore!');
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to upload logo to Firebase Storage.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branding) return;
    try {
      const updated = await saveBrandingToFirestore(branding);
      setBranding(updated);
      notifySuccess('Branding settings saved to Firestore.');
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save branding.');
    }
  };

  const handleSaveWebsiteContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteContent) return;
    try {
      const updated = await saveWebsiteContentToFirestore(websiteContent);
      setWebsiteContent(updated);
      notifySuccess('Website content synchronized with Firestore.');
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save website content.');
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Banner & Notifications */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            CMS & Content Engine (Firebase Authoritative)
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            All edits save permanently to Firestore and Firebase Storage. Data persists across reloads, deploys, and devices.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh CMS</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3 text-xs font-bold">
        {[
          { id: 'branding', label: 'Branding & Logo', icon: ImageIcon },
          { id: 'website', label: 'Website Content', icon: Globe },
          { id: 'whatsapp', label: 'WhatsApp Templates', icon: MessageSquare },
          { id: 'banners', label: 'Promo Banners', icon: Layers },
          { id: 'testimonials', label: 'Testimonials', icon: Star },
          { id: 'faqs', label: 'FAQs', icon: HelpCircle },
          { id: 'enquiries', label: `Enquiries (${enquiries.filter(e => e.status === 'new').length} new)`, icon: Mail },
          { id: 'activity', label: 'Activity Stream', icon: History }
        ].map(t => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id as any)}
              className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all ${
                active ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: BRANDING */}
      {subTab === 'branding' && branding && (
        <form onSubmit={handleSaveBranding} className="max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 text-xs">
          <h3 className="text-base font-bold text-white">Brand & Visual Identity</h3>

          {/* Logo preview & Firebase Storage uploader */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <label className="block text-slate-400 font-bold uppercase">Official Brand Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center overflow-hidden">
                {branding.logoUrl ? (
                  <img src={branding.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <span className="text-xl font-black text-cyan-400">NEXO</span>
                )}
              </div>
              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-black cursor-pointer hover:bg-cyan-400 transition-all">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingLogo ? 'Uploading to Firebase...' : 'Upload New Logo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    disabled={isUploadingLogo}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-slate-500">Uploads directly to Firebase Storage bucket. SVG, PNG or WEBP recommended.</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1 uppercase">Company / Platform Name</label>
            <input
              type="text"
              value={branding.companyName}
              onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1 uppercase">Tagline / Mission</label>
            <input
              type="text"
              value={branding.tagline}
              onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-bold mb-1 uppercase">Primary Brand Hex</label>
              <input
                type="text"
                value={branding.primaryColor || '#06b6d4'}
                onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1 uppercase">Accent Hex</label>
              <input
                type="text"
                value={branding.accentColor || '#3b82f6'}
                onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Branding to Firestore</span>
          </button>
        </form>
      )}

      {/* SUB-TAB 2: WEBSITE CONTENT */}
      {subTab === 'website' && websiteContent && (
        <form onSubmit={handleSaveWebsiteContent} className="max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 text-xs">
          <h3 className="text-base font-bold text-white">Homepage & Contact Copywriting</h3>

          <div>
            <label className="block text-slate-400 font-bold mb-1 uppercase">Hero Headline</label>
            <input
              type="text"
              value={websiteContent.heroHeading}
              onChange={(e) => setWebsiteContent({ ...websiteContent, heroHeading: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-bold"
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1 uppercase">Hero Subheading</label>
            <textarea
              rows={3}
              value={websiteContent.heroSubheading}
              onChange={(e) => setWebsiteContent({ ...websiteContent, heroSubheading: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1 uppercase">About Us Overview</label>
            <textarea
              rows={3}
              value={websiteContent.aboutUsText}
              onChange={(e) => setWebsiteContent({ ...websiteContent, aboutUsText: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-bold mb-1 uppercase">Support Email</label>
              <input
                type="email"
                value={websiteContent.supportEmail}
                onChange={(e) => setWebsiteContent({ ...websiteContent, supportEmail: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1 uppercase">Support Phone</label>
              <input
                type="text"
                value={websiteContent.supportPhone}
                onChange={(e) => setWebsiteContent({ ...websiteContent, supportPhone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1 uppercase">WhatsApp Support Phone (e.g. 07025900156 or 2347025900156)</label>
            <input
              type="text"
              value={websiteContent.whatsappPhone}
              onChange={(e) => setWebsiteContent({ ...websiteContent, whatsappPhone: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1 uppercase">Office Address (Lagos, Nigeria)</label>
            <input
              type="text"
              value={websiteContent.officeAddress}
              onChange={(e) => setWebsiteContent({ ...websiteContent, officeAddress: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Website Content to Firestore</span>
          </button>
        </form>
      )}

      {/* SUB-TAB 3: WHATSAPP TEMPLATES */}
      {subTab === 'whatsapp' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-white">Automated WhatsApp Messaging Templates</h3>
            <button
              onClick={async () => {
                const newTpl = await saveWhatsAppTemplateToFirestore({
                  name: 'New Custom Template',
                  trigger: 'custom',
                  templateText: 'Hello {customer_name}, welcome to Nexovira!'
                });
                setWhatsappTemplates([newTpl, ...whatsappTemplates]);
                notifySuccess('New template created in Firestore.');
              }}
              className="px-3 py-1.5 bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Template</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {whatsappTemplates.map((tpl) => (
              <div key={tpl.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white">{tpl.name}</h4>
                    <span className="text-[10px] text-cyan-400 font-mono">Trigger: {tpl.trigger}</span>
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm('Delete this WhatsApp template?')) {
                        await deleteWhatsAppTemplateFromFirestore(tpl.id);
                        setWhatsappTemplates(whatsappTemplates.filter(t => t.id !== tpl.id));
                        notifySuccess('Template deleted.');
                      }
                    }}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={tpl.templateText}
                  onChange={(e) => {
                    const next = whatsappTemplates.map(t => t.id === tpl.id ? { ...t, templateText: e.target.value } : t);
                    setWhatsappTemplates(next);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 font-mono text-[11px]"
                />

                <button
                  onClick={async () => {
                    await saveWhatsAppTemplateToFirestore(tpl);
                    notifySuccess(`Template "${tpl.name}" saved to Firestore!`);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-xl text-[11px] flex items-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  <span>Update in Firestore</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: BANNERS */}
      {subTab === 'banners' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-white">Promotional & Academy Banners</h3>
            <button
              onClick={async () => {
                const newBanner = await saveBannerToFirestore({
                  title: 'Special Program Announcement',
                  subtitle: 'Register today for certified technical training.',
                  imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&auto=format&fit=crop&q=80',
                  targetUrl: '/academy'
                });
                setBanners([...banners, newBanner]);
                notifySuccess('New Banner created in Firestore.');
              }}
              className="px-3 py-1.5 bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Banner</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {banners.map((banner) => (
              <div key={banner.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
                <div className="h-32 rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                  <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Banner Title</label>
                  <input
                    type="text"
                    value={banner.title}
                    onChange={(e) => {
                      const next = banners.map(b => b.id === banner.id ? { ...b, title: e.target.value } : b);
                      setBanners(next);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Image URL (Firebase Storage)</label>
                  <input
                    type="text"
                    value={banner.imageUrl}
                    onChange={(e) => {
                      const next = banners.map(b => b.id === banner.id ? { ...b, imageUrl: e.target.value } : b);
                      setBanners(next);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-[11px]"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      await saveBannerToFirestore(banner);
                      notifySuccess(`Banner "${banner.title}" saved.`);
                    }}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Banner</span>
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm('Delete banner?')) {
                        await deleteBannerFromFirestore(banner.id);
                        setBanners(banners.filter(b => b.id !== banner.id));
                        notifySuccess('Banner removed.');
                      }
                    }}
                    className="p-2 bg-slate-800 hover:bg-rose-900/50 text-rose-400 rounded-xl"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: TESTIMONIALS */}
      {subTab === 'testimonials' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-white">Student & Client Testimonials</h3>
            <button
              onClick={async () => {
                const newTest = await saveTestimonialToFirestore({
                  authorName: 'New Student',
                  authorRole: 'Software Developer',
                  quote: 'Nexovira has changed my career completely with practical mentorship.',
                  rating: 5
                });
                setTestimonials([...testimonials, newTest]);
                notifySuccess('Testimonial created in Firestore.');
              }}
              className="px-3 py-1.5 bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Testimonial</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {testimonials.map((t) => (
              <div key={t.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={t.authorName}
                    placeholder="Author Name"
                    onChange={(e) => {
                      const next = testimonials.map(item => item.id === t.id ? { ...item, authorName: e.target.value } : item);
                      setTestimonials(next);
                    }}
                    className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-bold"
                  />
                  <input
                    type="text"
                    value={t.authorRole}
                    placeholder="Role / Company"
                    onChange={(e) => {
                      const next = testimonials.map(item => item.id === t.id ? { ...item, authorRole: e.target.value } : item);
                      setTestimonials(next);
                    }}
                    className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white"
                  />
                </div>
                <textarea
                  rows={3}
                  value={t.quote}
                  placeholder="Review quote"
                  onChange={(e) => {
                    const next = testimonials.map(item => item.id === t.id ? { ...item, quote: e.target.value } : item);
                    setTestimonials(next);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-300"
                />
                <div className="flex justify-between items-center">
                  <span className="text-amber-400 font-bold">★ {t.rating} / 5</span>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        await saveTestimonialToFirestore(t);
                        notifySuccess('Testimonial saved to Firestore.');
                      }}
                      className="px-3 py-1 bg-slate-800 text-cyan-400 font-bold rounded-lg text-[11px]"
                    >
                      Save
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm('Delete testimonial?')) {
                          await deleteTestimonialFromFirestore(t.id);
                          setTestimonials(testimonials.filter(item => item.id !== t.id));
                          notifySuccess('Testimonial deleted.');
                        }
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 6: FAQS */}
      {subTab === 'faqs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-white">Frequently Asked Questions</h3>
            <button
              onClick={async () => {
                const newFaq = await saveFaqToFirestore({
                  question: 'New Question?',
                  answer: 'Answer to the question goes here.',
                  category: 'general',
                  displayOrder: faqs.length + 1
                });
                setFaqs([...faqs, newFaq]);
                notifySuccess('FAQ added to Firestore.');
              }}
              className="px-3 py-1.5 bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add FAQ</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {faqs.map((faq) => (
              <div key={faq.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
                <input
                  type="text"
                  value={faq.question}
                  onChange={(e) => {
                    const next = faqs.map(f => f.id === faq.id ? { ...f, question: e.target.value } : f);
                    setFaqs(next);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                />
                <textarea
                  rows={2}
                  value={faq.answer}
                  onChange={(e) => {
                    const next = faqs.map(f => f.id === faq.id ? { ...f, answer: e.target.value } : f);
                    setFaqs(next);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-300"
                />
                <div className="flex justify-between items-center pt-2">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 uppercase font-mono">{faq.category}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        await saveFaqToFirestore(faq);
                        notifySuccess('FAQ updated in Firestore.');
                      }}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-lg"
                    >
                      Save FAQ
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm('Delete FAQ?')) {
                          await deleteFaqFromFirestore(faq.id);
                          setFaqs(faqs.filter(f => f.id !== faq.id));
                          notifySuccess('FAQ deleted.');
                        }
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 7: ENQUIRIES */}
      {subTab === 'enquiries' && (
        <div className="space-y-4 text-xs">
          <h3 className="text-base font-bold text-white">Customer Enquiries & Messages ({enquiries.length})</h3>
          {enquiries.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500">
              No enquiries submitted yet.
            </div>
          ) : (
            <div className="space-y-3">
              {enquiries.map((enq) => (
                <div key={enq.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-sm">{enq.subject}</h4>
                      <p className="text-slate-400 text-[11px]">{enq.name} • {enq.email} • {enq.phone || 'No phone'}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      enq.status === 'new' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {enq.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {enq.message}
                  </p>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                    <span>{new Date(enq.createdAt).toLocaleString()}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await updateEnquiryStatusInFirestore(enq.id, enq.status === 'resolved' ? 'new' : 'resolved');
                          setEnquiries(enquiries.map(e => e.id === enq.id ? { ...e, status: e.status === 'resolved' ? 'new' : 'resolved' } : e));
                          notifySuccess('Enquiry status toggled.');
                        }}
                        className="px-2.5 py-1 bg-slate-800 text-slate-300 hover:text-white rounded-lg"
                      >
                        Mark as {enq.status === 'resolved' ? 'New' : 'Resolved'}
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Delete enquiry?')) {
                            await deleteEnquiryFromFirestore(enq.id);
                            setEnquiries(enquiries.filter(e => e.id !== enq.id));
                            notifySuccess('Enquiry deleted.');
                          }
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 8: ACTIVITY LOGS */}
      {subTab === 'activity' && (
        <div className="space-y-4 text-xs">
          <h3 className="text-base font-bold text-white">Admin CMS Activity Audit Stream</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {activityLogs.length === 0 ? (
              <div className="p-6 text-center text-slate-500">No recent CMS activity recorded.</div>
            ) : (
              <div className="divide-y divide-slate-800 font-mono text-[11px]">
                {activityLogs.map((log) => (
                  <div key={log.id} className="p-3.5 flex items-center justify-between hover:bg-slate-950/50">
                    <div>
                      <span className="text-cyan-400 font-bold">[{log.action}]</span>{' '}
                      <span className="text-slate-300">{log.targetEntity}</span>{' '}
                      <span className="text-slate-500">by {log.actorEmail}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
