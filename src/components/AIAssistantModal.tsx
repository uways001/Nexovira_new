import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  ShoppingCart, 
  Check, 
  ShieldCheck, 
  RefreshCw, 
  ChevronRight, 
  ExternalLink,
  Code2,
  GraduationCap,
  ShoppingBag,
  Share2,
  BookOpen,
  HelpCircle,
  Mail,
  Globe,
  FileText
} from 'lucide-react';
import { Product, AIMessage, TechService, Course, DigitalProduct } from '../types';
import { NexoviraLogo } from './NexoviraLogo';
import { safeFetchJson } from '../lib/safeFetch';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onCompareProduct?: (product: Product) => void;
  onNavigate?: (view: string) => void;
}

const WELCOME_MESSAGE: AIMessage = {
  id: 'msg-welcome',
  sender: 'assistant',
  text: `Hello! I am the **Nexovira Website Assistant**, the official AI concierge for the Nexovira platform (https://nexovira.com.ng).

I am here to guide you across our five core ecosystem pillars:
• **1. Nexovira Tech Services**: Custom website development, AI integration, app creation, platform redesigns, and workflow automation.
• **2. Nexovira Academy**: AI-driven learning portal with personalized learning paths, interactive courses, and skill certifications.
• **3. Nexovira Marketplace**: Digital hub for digital assets, developer tools, software templates, and verified appliances.
• **4. Nexovira Affiliate Program**: Automated referral system allowing registered users to earn real-time commissions promoting Nexovira products and services.
• **5. Nexovira Digital Library**: Centralized repository of curated e-books, research whitepapers, business templates, and digital guides.

Which Nexovira service or feature can I help you explore today?`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  actions: [
    { label: 'Request Tech Service Quote', actionQuery: 'I would like to request a quote for custom website & tech development' },
    { label: 'Explore Academy Courses', actionQuery: 'What AI and coding courses are available in Nexovira Academy?' },
    { label: 'Browse Marketplace Products', actionQuery: 'Show me verified digital assets and appliances on Nexovira Marketplace' },
    { label: 'Affiliate Program & Commissions', actionQuery: 'How do I join the Nexovira Affiliate Program and generate referral links?' },
    { label: 'Digital Library & E-books', actionQuery: 'What e-books, templates, and guides are in the Nexovira Digital Library?' },
    { label: 'Official Human Support', actionQuery: 'How do I contact official human support at nexovirasupport@gmail.com?' }
  ]
};

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  onSelectProduct,
  onAddToCart,
  onCompareProduct,
  onNavigate,
}) => {
  const [messages, setMessages] = useState<AIMessage[]>([WELCOME_MESSAGE]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Lead capture state for inline support
  const [activeLeadMessageId, setActiveLeadMessageId] = useState<string | null>(null);
  const [leadForm, setLeadForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    serviceInterest: 'Tech Services',
    message: ''
  });
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSubmittedSuccess, setLeadSubmittedSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (initialQuery && isOpen) {
      handleSendMessage(initialQuery);
    }
  }, [initialQuery, isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, activeLeadMessageId]);

  const handleSendMessage = async (queryText?: string) => {
    const prompt = queryText || inputQuery;
    if (!prompt.trim() || isLoading) return;

    const userMsg: AIMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response = await safeFetchJson<{
        replyText?: string;
        text?: string;
        intent?: string;
        navigationLink?: { label: string; path: string };
        leadCaptureSuggested?: boolean;
        actions?: { label: string; actionQuery: string }[];
        suggestedProducts?: Product[];
        suggestedServices?: TechService[];
        suggestedCourses?: Course[];
        suggestedEbooks?: DigitalProduct[];
      }>('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          history: messages.map(m => ({ role: m.sender, content: m.text })) 
        })
      });

      if (!response.ok || !response.data) {
        throw new Error(response.error || 'AI API response failed');
      }

      const data = response.data;
      const msgId = `ai-${Date.now()}`;

      const aiMsg: AIMessage = {
        id: msgId,
        sender: 'assistant',
        text: data.replyText || data.text || "I am specialized in helping you navigate the Nexovira platform and services. How can I assist you with our Tech Services, Academy, Marketplace, Affiliate Program, or Digital Library today?",
        actions: data.actions || [],
        navigationLink: data.navigationLink,
        leadCaptureSuggested: data.leadCaptureSuggested,
        suggestedProducts: data.suggestedProducts || [],
        suggestedServices: data.suggestedServices || [],
        suggestedCourses: data.suggestedCourses || [],
        suggestedEbooks: data.suggestedEbooks || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);

      // If backend suggests lead capture, pre-activate lead form
      if (data.leadCaptureSuggested) {
        setActiveLeadMessageId(msgId);
      }
    } catch (err) {
      console.error('AI Chat Error:', err);
      const fallbackMsg: AIMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'assistant',
        text: "I am specialized in helping you navigate the Nexovira platform and services. You can reach our human support anytime at nexovirasupport@gmail.com, or explore our Tech Services, Academy, Marketplace, Affiliate Program, and Digital Library.\n\nWhich Nexovira service or feature can I help you explore today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.email.trim()) return;

    setLeadSubmitting(true);
    try {
      const res = await safeFetchJson<{
        success: boolean;
        referenceNumber: string;
        message: string;
      }>('/api/v1/ai/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadForm)
      });

      if (res.ok && res.data) {
        setLeadSubmittedSuccess(res.data.referenceNumber);
        const confirmMsg: AIMessage = {
          id: `lead-conf-${Date.now()}`,
          sender: 'assistant',
          text: `Thank you, ${leadForm.fullName || 'valued visitor'}! Your inquiry (Ref: **${res.data.referenceNumber}**) has been sent to the official Nexovira team at **nexovirasupport@gmail.com**.\n\nA dedicated specialist will follow up with you promptly.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, confirmMsg]);
        setActiveLeadMessageId(null);
      } else {
        throw new Error(res.error || 'Submission failed');
      }
    } catch (err: any) {
      alert('Could not submit inquiry right now. Please email nexovirasupport@gmail.com directly.');
    } finally {
      setLeadSubmitting(false);
    }
  };

  const handlePortalNavigate = (route: string) => {
    if (onNavigate) {
      onNavigate(route);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[92vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <NexoviraLogo size={40} showText={false} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base">Nexovira Website Assistant</h3>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold px-2.5 py-0.5 rounded-full">
                  Official AI Concierge
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official guide for <span className="text-cyan-400 font-semibold">nexovira.com.ng</span> • 5 Core Ecosystem Pillars
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Close Assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5 Pillars Quick Navigation Bar */}
        <div className="bg-slate-950/80 border-b border-slate-800/80 px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs shrink-0 scrollbar-none">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
            Quick Jump:
          </span>
          <button
            onClick={() => handlePortalNavigate('/services')}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-blue-600/20 hover:text-blue-400 border border-slate-700/60 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Tech Services</span>
          </button>
          <button
            onClick={() => handlePortalNavigate('/academy')}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-emerald-600/20 hover:text-emerald-400 border border-slate-700/60 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Academy</span>
          </button>
          <button
            onClick={() => handlePortalNavigate('/marketplace')}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-amber-600/20 hover:text-amber-400 border border-slate-700/60 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
            <span>Marketplace</span>
          </button>
          <button
            onClick={() => handlePortalNavigate('/affiliate')}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-rose-600/20 hover:text-rose-400 border border-slate-700/60 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Affiliate</span>
          </button>
          <button
            onClick={() => handlePortalNavigate('/library')}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-purple-600/20 hover:text-purple-400 border border-slate-700/60 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            <span>Digital Library</span>
          </button>
          <button
            onClick={() => handlePortalNavigate('/contact')}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-cyan-600/20 hover:text-cyan-400 border border-slate-700/60 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>Contact Support</span>
          </button>
        </div>

        {/* Message History */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${
                msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              {msg.sender === 'user' ? (
                <div className="w-9 h-9 rounded-2xl shrink-0 flex items-center justify-center text-xs font-bold bg-slate-800 text-white">
                  <User className="w-4 h-4" />
                </div>
              ) : (
                <div className="shrink-0">
                  <NexoviraLogo size={36} showText={false} />
                </div>
              )}

              <div className="space-y-3 flex-1">
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white font-medium rounded-tr-none shadow-md'
                      : 'bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-tl-none shadow-md'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <span className="block text-[10px] text-slate-400 mt-2 text-right">
                    {msg.timestamp}
                  </span>
                </div>

                {/* Direct Action Navigation Button */}
                {msg.navigationLink && onNavigate && (
                  <div className="pt-1">
                    <button
                      onClick={() => handlePortalNavigate(msg.navigationLink!.path)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{msg.navigationLink.label}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Internal Lead Support Form */}
                {msg.leadCaptureSuggested && (
                  <div className="mt-3 p-4 bg-slate-950/90 border border-cyan-500/30 rounded-2xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Internal Lead Support • Direct Concierge Routing
                        </h4>
                      </div>
                      <span className="text-[10px] text-cyan-400 font-mono">nexovirasupport@gmail.com</span>
                    </div>

                    <form onSubmit={handleLeadSubmit} className="space-y-2.5 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Full Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Alex Johnson"
                            value={leadForm.fullName}
                            onChange={(e) => setLeadForm({ ...leadForm, fullName: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Email Address</label>
                          <input
                            type="email"
                            required
                            placeholder="e.g. alex@example.com"
                            value={leadForm.email}
                            onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Portal / Service Interest</label>
                          <select
                            value={leadForm.serviceInterest}
                            onChange={(e) => setLeadForm({ ...leadForm, serviceInterest: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                          >
                            <option value="Tech Services - Custom Web Development">Tech Services: Custom Website</option>
                            <option value="Tech Services - AI Integration & Automation">Tech Services: AI & Automation</option>
                            <option value="Tech Services - App Creation">Tech Services: Mobile/Web App</option>
                            <option value="Academy - Certification Courses">Academy: Courses & Certification</option>
                            <option value="Marketplace - Vendor Onboarding">Marketplace: Seller/Vendor Onboarding</option>
                            <option value="Affiliate - Partnership & Program">Affiliate: Referral Partnership</option>
                            <option value="Digital Library - Premium Access">Digital Library: Research & Blueprints</option>
                            <option value="General Support Inquiry">General Inquiries & Consultation</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Phone / WhatsApp (Optional)</label>
                          <input
                            type="text"
                            placeholder="+234 ..."
                            value={leadForm.phone}
                            onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Brief Message or Project Requirement</label>
                        <textarea
                          rows={2}
                          required
                          placeholder="Describe your requirement, project scope, or what you need assistance with..."
                          value={leadForm.message}
                          onChange={(e) => setLeadForm({ ...leadForm, message: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <p className="text-[10px] text-slate-400">
                          Submitted directly to <span className="text-cyan-400">nexovirasupport@gmail.com</span>
                        </p>
                        <button
                          type="submit"
                          disabled={leadSubmitting}
                          className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          {leadSubmitting ? 'Routing Inquiry...' : 'Submit Inquiry to Nexovira'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Suggested Action Chips */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {msg.actions.map((act, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(act.actionQuery)}
                        className="text-xs bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl px-3 py-1.5 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>{act.label}</span>
                        <ChevronRight className="w-3 h-3 text-cyan-400" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Suggested Tech Services Cards */}
                {msg.suggestedServices && msg.suggestedServices.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {msg.suggestedServices.map((service) => (
                      <div
                        key={service.id}
                        className="bg-slate-950 border border-slate-800 hover:border-blue-500/40 rounded-xl p-3 flex flex-col justify-between"
                      >
                        <div>
                          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">{service.category}</span>
                          <h4 className="font-bold text-xs text-white mt-0.5">{service.title}</h4>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{service.description}</p>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-white">From ₦{((service.startingPriceNGN || service.startingPrice || 50000)).toLocaleString()}</span>
                          <button
                            onClick={() => handlePortalNavigate('/services')}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] rounded-lg transition-colors"
                          >
                            Request Quote
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggested Academy Courses Cards */}
                {msg.suggestedCourses && msg.suggestedCourses.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {msg.suggestedCourses.map((course) => (
                      <div
                        key={course.id}
                        className="bg-slate-950 border border-slate-800 hover:border-emerald-500/40 rounded-xl p-3 flex flex-col justify-between"
                      >
                        <div>
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{course.category}</span>
                          <h4 className="font-bold text-xs text-white mt-0.5">{course.title}</h4>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{course.description}</p>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-white">₦{(course.price || 0).toLocaleString()}</span>
                          <button
                            onClick={() => handlePortalNavigate('/academy')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition-colors"
                          >
                            Enroll in Academy
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggested Marketplace Products Grid */}
                {msg.suggestedProducts && msg.suggestedProducts.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {msg.suggestedProducts.map((product) => (
                      <div
                        key={product.id}
                        className="bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-3 flex gap-3 group transition-all"
                      >
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          referrerPolicy="no-referrer"
                          className="w-20 h-20 object-cover rounded-xl shrink-0 bg-slate-900"
                        />
                        <div className="flex-1 flex flex-col justify-between text-left">
                          <div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="text-cyan-400 font-bold uppercase">{product.brand}</span>
                              <span>★ {product.rating}</span>
                            </div>
                            <h4
                              onClick={() => { onSelectProduct(product); onClose(); }}
                              className="font-bold text-xs text-white line-clamp-1 group-hover:text-cyan-400 cursor-pointer"
                            >
                              {product.title}
                            </h4>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">₦{((product.price || 0) * 1600).toLocaleString('en-NG')}</p>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => onAddToCart(product)}
                              className="flex-1 py-1 px-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] rounded-lg flex items-center justify-center gap-1 transition-colors"
                            >
                              <ShoppingCart className="w-3 h-3" /> Add
                            </button>
                            {onCompareProduct && (
                              <button
                                onClick={() => onCompareProduct(product)}
                                className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-[11px] rounded-lg"
                              >
                                Compare
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3 text-cyan-400 text-xs font-medium">
              <Bot className="w-5 h-5 animate-bounce" />
              <div className="flex items-center gap-1 bg-slate-800 px-3 py-2 rounded-2xl">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Nexovira Website Assistant is formulating guidance across the ecosystem...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Official Contact & Support Information Banner */}
        <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400 shrink-0 gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3 text-cyan-400" />
              <a href="https://nexovira.com.ng" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400">
                https://nexovira.com.ng
              </a>
            </span>
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3 text-cyan-400" />
              <a href="mailto:nexovirasupport@gmail.com" className="hover:text-cyan-400">
                nexovirasupport@gmail.com
              </a>
            </span>
          </div>
          <button
            onClick={() => handlePortalNavigate('/contact')}
            className="text-cyan-400 hover:underline font-semibold flex items-center gap-1"
          >
            <span>Visit Contact Form</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-2 focus-within:border-cyan-500 transition-colors"
          >
            <input
              type="text"
              placeholder="Ask anything about Tech Services, Academy, Marketplace, Affiliate, or Library..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={isLoading}
              className="flex-1 bg-transparent px-3 text-sm text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isLoading}
              className="p-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
