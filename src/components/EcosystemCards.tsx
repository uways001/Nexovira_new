import React from 'react';
import { ActiveEcosystemView } from '../types';
import { 
  ShoppingBag, 
  Code2, 
  GraduationCap, 
  BookOpen, 
  Sparkles, 
  Share2, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Star,
  Briefcase,
  MapPin
} from 'lucide-react';

interface EcosystemCardsProps {
  onNavigate: (view: ActiveEcosystemView) => void;
  productCount?: number;
}

export const EcosystemCards: React.FC<EcosystemCardsProps> = ({ onNavigate, productCount = 0 }) => {
  const cards = [
    {
      id: 'marketplace' as ActiveEcosystemView,
      title: 'NEXOVIRA Marketplace',
      subtitle: 'High-efficiency inverter appliances & smart home hardware',
      badge: productCount > 0 ? 'CATALOG LIVE' : 'COMING SOON',
      badgeColor: productCount > 0 
        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' 
        : 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      icon: ShoppingBag,
      gradient: 'from-slate-900 via-slate-900 to-amber-950/40 border-slate-800 hover:border-amber-500/60',
      accentColor: 'text-amber-400',
      cta: productCount > 0 ? 'Explore Marketplace' : 'Preview Upcoming Catalog',
      image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=80',
      stats: productCount > 0 ? `${productCount} Verified Products in Catalog` : 'Inverters, Clean Energy Hardware & Smart Living'
    },
    {
      id: 'services' as ActiveEcosystemView,
      title: 'Tech & Digital Services',
      subtitle: 'Software engineering, cloud systems & managed tech services',
      badge: 'ACTIVE / AVAILABLE',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      icon: Code2,
      gradient: 'from-slate-900 via-slate-900 to-cyan-950/40 border-slate-800 hover:border-cyan-500/60',
      accentColor: 'text-cyan-400',
      cta: 'Explore Services',
      image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
      stats: 'AI, Web, Cloud, Cybersecurity & Managed Booking'
    },
    {
      id: 'academy' as ActiveEcosystemView,
      title: 'NEXOVIRA Academy',
      subtitle: 'Practical technology tracks & ₦4,500 scholarship tuition subsidies',
      badge: 'ACTIVE / ENROLLING',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      icon: GraduationCap,
      gradient: 'from-slate-900 via-slate-900 to-emerald-950/40 border-slate-800 hover:border-emerald-500/60',
      accentColor: 'text-emerald-400',
      cta: 'View Available Courses',
      image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80',
      stats: 'Web Dev, AI, Cloud Engineering & Verified Certs'
    },
    {
      id: 'library' as ActiveEcosystemView,
      title: 'Digital Library',
      subtitle: 'Books, guides, resources & digital assets',
      badge: 'ACTIVE / AVAILABLE',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      icon: BookOpen,
      gradient: 'from-slate-900 via-slate-900 to-emerald-950/40 border-slate-800 hover:border-emerald-500/60',
      accentColor: 'text-emerald-400',
      cta: 'Explore Library',
      image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
      stats: 'PDFs, E-Books & Code Boilerplates'
    },
    {
      id: 'ai' as ActiveEcosystemView,
      title: 'NEXOVIRA AI Workspace',
      subtitle: 'Ask. Create. Learn. Solve.',
      badge: 'ACTIVE / AVAILABLE',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      icon: Sparkles,
      gradient: 'from-slate-900 via-slate-900 to-purple-950/40 border-slate-800 hover:border-purple-500/60',
      accentColor: 'text-purple-400',
      cta: 'Talk to NEXOVIRA AI',
      image: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=600&auto=format&fit=crop&q=80',
      stats: 'Shopping, Coding, Research & Plans'
    },
    {
      id: 'affiliate' as ActiveEcosystemView,
      title: 'Affiliate & Earn',
      subtitle: 'Share. Refer. Earn commissions.',
      badge: 'ACTIVE / AVAILABLE',
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      icon: Share2,
      gradient: 'from-slate-900 via-slate-900 to-rose-950/40 border-slate-800 hover:border-rose-500/60',
      accentColor: 'text-rose-400',
      cta: 'Start Earning',
      image: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=600&auto=format&fit=crop&q=80',
      stats: 'Unique Link Generator & QR Code'
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 text-left">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/20 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>NEXOVIRA Ecosystem Architecture</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Six Interconnected Ecosystem Destinations
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Shop physical products, learn tech skills, hire specialists, download resources, ask AI, or earn commissions.
          </p>
        </div>

        <button
          onClick={() => onNavigate('presentation')}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 shrink-0 border border-cyan-400/30"
          title="Architectural Overview"
        >
          <Sparkles className="w-4 h-4 text-cyan-200" />
          <span>Explore Platform Architecture</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => {
          const IconComp = card.icon;
          return (
            <div
              key={card.id}
              onClick={() => onNavigate(card.id)}
              className="group cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-sm hover:shadow-md hover:border-cyan-500/40 dark:hover:border-cyan-500/40 hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden flex flex-col justify-between"
            >
              {/* Background Subtle Image Overlay */}
              <div className="absolute top-0 right-0 w-32 h-32 opacity-10 dark:opacity-15 group-hover:opacity-20 transition-opacity rounded-bl-full overflow-hidden pointer-events-none">
                <img src={card.image} alt={card.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              </div>

              <div>
                {/* Header Badge & Icon */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${card.accentColor} shadow-sm`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                </div>

                {/* Title & Subtitle */}
                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  {card.subtitle}
                </p>
              </div>

              {/* Bottom CTA & Stats */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-medium">
                  {card.stats}
                </span>

                <div className={`inline-flex items-center gap-1.5 text-xs font-bold ${card.accentColor} group-hover:translate-x-0.5 transition-transform`}>
                  <span>{card.cta}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Featured Book a Service Callout Banner */}
      <div className="mt-8 rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-slate-950 border border-blue-500/30 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="space-y-2 relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
            <Briefcase className="w-3.5 h-3.5 text-blue-400" />
            <span>Nexovira Managed Services • Verified Specialists</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            Need Specialist Tech Support? Book Vetted Professionals
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Connect with qualified specialists across software development, cloud systems, and technical services under our managed milestone guarantees.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={() => onNavigate('book-service')}
            className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all hover:scale-105"
          >
            <Briefcase className="w-4 h-4" />
            <span>Book a Service</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
