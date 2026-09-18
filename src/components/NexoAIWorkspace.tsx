import React, { useState, useEffect, useRef } from 'react';
import { AIMessage, EcosystemIntent, CurrencyCode, Product, TechService, Course, DigitalProduct } from '../types';
import { formatCurrency } from '../lib/currency';
import { safeFetchJson } from '../lib/safeFetch';
import { NexoviraLogo } from './NexoviraLogo';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  ShoppingBag, 
  Code2, 
  GraduationCap, 
  BookOpen, 
  Share2, 
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Check,
  Globe,
  Mail,
  ExternalLink,
  ChevronRight,
  FileText
} from 'lucide-react';

interface NexoAIWorkspaceProps {
  initialPrompt?: string;
  currentCurrency: CurrencyCode;
  onAddToCart?: (product: Product) => void;
  onNavigateToView?: (view: string) => void;
}

const WORKSPACE_WELCOME: AIMessage = {
  id: 'welcome-msg',
  sender: 'assistant',
  text: `Hello! I am the **Nexovira Website Assistant**, the official AI concierge for the Nexovira platform (https://nexovira.com.ng).

I am here to guide you across our five core ecosystem pillars:
• **1. Nexovira Tech Services**: Custom website development, AI integration, app creation, platform redesigns, and workflow automation.
• **2. Nexovira Academy**: AI-driven learning portal with personalized learning paths, interactive courses, and skill certifications.
• **3. Nexovira Marketplace**: Digital hub for digital assets, developer tools, software templates, and verified appliances.
• **4. Nexovira Affiliate Program**: Automated referral system allowing registered users to earn commissions by promoting Nexovira products and services.
• **5. Nexovira Digital Library**: Centralized resource repository featuring curated e-books, research whitepapers, business templates, and digital guides.

Which Nexovira service or feature can I help you explore today?`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  actions: [
    { label: 'Request Tech Service Quote', actionQuery: 'I would like to request a quote for custom website & tech development' },
    { label: 'Explore Academy Courses', actionQuery: 'What AI and coding courses are available in Nexovira Academy?' },
    { label: 'Marketplace Verified Products', actionQuery: 'Show me verified digital assets and appliances on Nexovira Marketplace' },
    { label: 'Affiliate Program Info', actionQuery: 'How does the Nexovira Affiliate Program work?' },
    { label: 'Digital Library & E-books', actionQuery: 'What e-books and templates are in the Nexovira Digital Library?' },
    { label: 'Official Human Support', actionQuery: 'How do I contact official human support at nexovirasupport@gmail.com?' }
  ]
};

export const NexoAIWorkspace: React.FC<NexoAIWorkspaceProps> = ({
  initialPrompt = '',
  currentCurrency,
  onAddToCart,
  onNavigateToView,
}) => {
  const [messages, setMessages] = useState<AIMessage[]>([WORKSPACE_WELCOME]);
  const [inputQuery, setInputQuery] = useState(initialPrompt);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Internal Lead Support State
  const [leadForm, setLeadForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    serviceInterest: 'Tech Services',
    message: ''
  });
  const [leadSubmitting, setLeadSubmitting] = useState(false);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim().length > 0) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: AIMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response = await safeFetchJson<{
        replyText?: string;
        intent?: string;
        navigationLink?: { label: string; path: string };
        leadCaptureSuggested?: boolean;
        suggestedProducts?: any[];
        suggestedServices?: any[];
        suggestedCourses?: any[];
        suggestedEbooks?: any[];
        actions?: any[];
      }>('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          currency: currentCurrency,
          history: messages.map(m => ({ role: m.sender, content: m.text }))
        })
      });

      if (!response.ok || !response.data) {
        throw new Error(response.error || 'Failed to fetch response from Nexovira AI server');
      }

      const data = response.data;

      const assistantMsg: AIMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: data.replyText || "I am specialized in helping you navigate the Nexovira platform and services. How can I assist you with our Tech Services, Academy, Marketplace, Affiliate Program, or Digital Library today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intent: data.intent as EcosystemIntent,
        navigationLink: data.navigationLink,
        leadCaptureSuggested: data.leadCaptureSuggested,
        suggestedProducts: data.suggestedProducts,
        suggestedServices: data.suggestedServices,
        suggestedCourses: data.suggestedCourses,
        suggestedEbooks: data.suggestedEbooks,
        actions: data.actions
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: AIMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'I am specialized in helping you navigate the Nexovira platform and services. You can reach our human support anytime at nexovirasupport@gmail.com, or explore our Tech Services, Academy, Marketplace, Affiliate Program, and Digital Library.\n\nWhich Nexovira service or feature can I help you explore today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
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
        const confirmMsg: AIMessage = {
          id: `lead-conf-${Date.now()}`,
          sender: 'assistant',
          text: `Thank you, ${leadForm.fullName || 'valued visitor'}! Your inquiry (Ref: **${res.data.referenceNumber}**) has been sent to Nexovira Support at **nexovirasupport@gmail.com**.\n\nA dedicated specialist will follow up with you promptly.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, confirmMsg]);
      } else {
        throw new Error(res.error || 'Submission failed');
      }
    } catch (err: any) {
      alert('Could not submit inquiry right now. Please email nexovirasupport@gmail.com directly.');
    } finally {
      setLeadSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-left space-y-6">
      
      {/* Workspace Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-[#081A2B] border border-blue-900/40 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/30">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Nexovira Website Assistant • Official AI Concierge</span>
          </div>
          <h1 className="text-2xl font-black text-white">Ask, Explore & Navigate Nexovira Ecosystem</h1>
          <p className="text-xs text-slate-300 font-medium">
            Dedicated assistance for Tech Services, Academy, Marketplace, Affiliate Program, and Digital Library • <span className="text-cyan-400 font-semibold">https://nexovira.com.ng</span>
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-1 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 font-mono text-cyan-400">
            <Mail className="w-3.5 h-3.5" />
            <span>nexovirasupport@gmail.com</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Globe className="w-3.5 h-3.5" />
            <a href="https://nexovira.com.ng" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400">
              nexovira.com.ng
            </a>
          </div>
        </div>
      </div>

      {/* 5 Ecosystem Quick Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
        <button
          onClick={() => onNavigateToView && onNavigateToView('services')}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-600/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Tech Services</span>
        </button>
        <button
          onClick={() => onNavigateToView && onNavigateToView('academy')}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Academy</span>
        </button>
        <button
          onClick={() => onNavigateToView && onNavigateToView('marketplace')}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-amber-600/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Marketplace</span>
        </button>
        <button
          onClick={() => onNavigateToView && onNavigateToView('affiliate')}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-600/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Affiliate Program</span>
        </button>
        <button
          onClick={() => onNavigateToView && onNavigateToView('library')}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-purple-600/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Digital Library</span>
        </button>
      </div>

      {/* Chat Messages Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 min-h-[500px] flex flex-col justify-between">
        <div className="space-y-6 overflow-y-auto max-h-[600px] pr-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-4 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'assistant' && (
                <div className="shrink-0">
                  <NexoviraLogo size={36} showText={false} />
                </div>
              )}

              <div className={`max-w-2xl space-y-3 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                <div
                  className={`inline-block p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white font-medium rounded-tr-none'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <div className={`text-[10px] mt-2 font-mono ${msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                    {msg.timestamp}
                  </div>
                </div>

                {/* Direct Navigation Action Button */}
                {msg.navigationLink && onNavigateToView && (
                  <div className="pt-1">
                    <button
                      onClick={() => onNavigateToView(msg.navigationLink!.path.replace('/', ''))}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{msg.navigationLink.label}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Internal Lead Support Form in Workspace */}
                {msg.leadCaptureSuggested && (
                  <div className="p-4 bg-slate-950 border border-cyan-500/30 rounded-2xl text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                          Internal Lead Support • Routing to nexovirasupport@gmail.com
                        </h4>
                      </div>
                    </div>

                    <form onSubmit={handleLeadSubmit} className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Full Name"
                          value={leadForm.fullName}
                          onChange={(e) => setLeadForm({ ...leadForm, fullName: e.target.value })}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
                        />
                        <input
                          type="email"
                          required
                          placeholder="Email Address"
                          value={leadForm.email}
                          onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <select
                          value={leadForm.serviceInterest}
                          onChange={(e) => setLeadForm({ ...leadForm, serviceInterest: e.target.value })}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500 text-xs"
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
                        <input
                          type="text"
                          placeholder="Phone / WhatsApp (Optional)"
                          value={leadForm.phone}
                          onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
                        />
                      </div>
                      <textarea
                        rows={2}
                        required
                        placeholder="Brief message or project requirement..."
                        value={leadForm.message}
                        onChange={(e) => setLeadForm({ ...leadForm, message: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
                      />
                      <div className="flex items-center justify-end">
                        <button
                          type="submit"
                          disabled={leadSubmitting}
                          className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          {leadSubmitting ? 'Submitting...' : 'Submit Inquiry'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Suggested Products Card Attachments */}
                {msg.suggestedProducts && msg.suggestedProducts.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {msg.suggestedProducts.map((p) => (
                      <div key={p.id} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-white flex items-center gap-3">
                        <img src={p.images[0]} alt={p.title} referrerPolicy="no-referrer" className="w-12 h-12 object-cover rounded-xl shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold truncate">{p.title}</div>
                          <div className="text-xs text-cyan-400 font-mono font-bold mt-0.5">
                            {formatCurrency(p.price, currentCurrency)}
                          </div>
                          {onAddToCart && (
                            <button
                              onClick={() => onAddToCart(p)}
                              className="mt-1 text-[10px] bg-cyan-500 text-slate-950 px-2 py-0.5 rounded font-bold"
                            >
                              + Add to Cart
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggested Services */}
                {msg.suggestedServices && msg.suggestedServices.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {msg.suggestedServices.map((s) => (
                      <div key={s.id} className="p-3 rounded-2xl bg-blue-950/60 border border-blue-900/50 text-white flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold">{s.title}</div>
                          <div className="text-[10px] text-blue-300">Category: {s.category}</div>
                        </div>
                        <div className="text-xs font-mono font-bold text-blue-400">
                          From ₦{(s.startingPriceNGN || s.startingPrice || 50000).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggested Courses */}
                {msg.suggestedCourses && msg.suggestedCourses.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {msg.suggestedCourses.map((c) => (
                      <div key={c.id} className="p-3 rounded-2xl bg-amber-950/60 border border-amber-900/50 text-white flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold">{c.title}</div>
                          <div className="text-[10px] text-amber-300">Instructor: {c.instructor}</div>
                        </div>
                        <div className="text-xs font-mono font-bold text-amber-400">
                          ₦{(c.price || 0).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Prompts */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {msg.actions.map((act, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(act.actionQuery)}
                        className="text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl px-3 py-1.5 transition-colors text-left cursor-pointer flex items-center gap-1.5"
                      >
                        <span>{act.label}</span>
                        <ChevronRight className="w-3 h-3 text-cyan-400" />
                      </button>
                    ))}
                  </div>
                )}

              </div>

              {msg.sender === 'user' && (
                <div className="w-9 h-9 rounded-2xl bg-slate-800 text-slate-200 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3 text-xs text-cyan-400 font-bold p-3 bg-cyan-500/10 rounded-2xl max-w-xs border border-cyan-500/20">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Nexovira Assistant is formulating guidance...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask anything about Tech Services, Academy, Marketplace, Affiliate, or Library..."
              className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-all shrink-0 cursor-pointer"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
};

