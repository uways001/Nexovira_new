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
  ShieldCheck
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
      badge: productCount > 0 ? 'MARKETPLACE LIVE' : 'COMING SOON',
      badgeColor: productCount > 0 
        ? 'bg-[#DDF8F2] text-[#00A6A6] border-[#00A6A6]/40 dark:bg-[#00A6A6]/20 dark:text-[#DDF8F2]' 
        : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
      icon: ShoppingBag,
      accentColor: 'text-[#1769FF] dark:text-blue-400',
      iconBg: 'bg-[#1769FF]/10 dark:bg-[#1769FF]/20 text-[#1769FF] dark:text-blue-400 border border-[#1769FF]/20',
      cta: productCount > 0 ? 'Explore Marketplace' : 'Browse Marketplace',
      image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=80',
      stats: productCount > 0 ? `${productCount} Verified Products Available` : 'Inverters, Clean Energy Hardware & Smart Living'
    },
    {
      id: 'services' as ActiveEcosystemView,
      title: 'Tech & Digital Services',
      subtitle: 'Software engineering, cloud systems & managed tech services',
      badge: 'ACTIVE / AVAILABLE',
      badgeColor: 'bg-[#DDF8F2] text-[#00A6A6] border-[#00A6A6]/40 dark:bg-[#00A6A6]/20 dark:text-[#DDF8F2]',
      icon: Code2,
      accentColor: 'text-[#00A6A6] dark:text-teal-300',
      iconBg: 'bg-[#00A6A6]/10 dark:bg-[#00A6A6]/20 text-[#00A6A6] dark:text-teal-300 border border-[#00A6A6]/20',
      cta: 'Explore Services',
      image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
      stats: 'AI, Web, Cloud, Cybersecurity & Managed Booking'
    },
    {
      id: 'academy' as ActiveEcosystemView,
      title: 'NEXOVIRA Academy',
      subtitle: 'Practical technology tracks & ₦4,500 scholarship tuition subsidies',
      badge: 'ACTIVE / ENROLLING',
      badgeColor: 'bg-emerald-50 text-[#168A5B] border-[#168A5B]/30 dark:bg-[#168A5B]/20 dark:text-emerald-300',
      icon: GraduationCap,
      accentColor: 'text-[#F4B740]',
      iconBg: 'bg-amber-500/10 dark:bg-amber-500/20 text-[#F4B740] border border-amber-500/20',
      cta: 'View Available Courses',
      image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80',
      stats: 'Web Dev, AI, Cloud Engineering & Verified Certs'
    },
    {
      id: 'library' as ActiveEcosystemView,
      title: 'Digital Library',
      subtitle: 'Books, guides, resources & digital assets',
      badge: 'ACTIVE / AVAILABLE',
      badgeColor: 'bg-emerald-50 text-[#168A5B] border-[#168A5B]/30 dark:bg-[#168A5B]/20 dark:text-emerald-300',
      icon: BookOpen,
      accentColor: 'text-[#168A5B] dark:text-emerald-400',
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-[#168A5B] dark:text-emerald-400 border border-[#168A5B]/20',
      cta: 'Explore Library',
      image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
      stats: 'PDFs, E-Books & Code Boilerplates'
    },
    {
      id: 'ai' as ActiveEcosystemView,
      title: 'NEXOVIRA AI Workspace',
      subtitle: 'Ask. Create. Learn. Solve.',
      badge: 'ACTIVE / AVAILABLE',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300',
      icon: Sparkles,
      accentColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20',
      cta: 'Talk to NEXOVIRA AI',
      image: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=600&auto=format&fit=crop&q=80',
      stats: 'Shopping, Coding, Research & Plans'
    },
    {
      id: 'affiliate' as ActiveEcosystemView,
      title: 'Affiliate & Earn',
      subtitle: 'Share. Refer. Earn commissions.',
      badge: 'ACTIVE / AVAILABLE',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300',
      icon: Share2,
      accentColor: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20',
      cta: 'Start Earning',
      image: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=600&auto=format&fit=crop&q=80',
      stats: 'Unique Link Generator & QR Code'
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 text-left">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DDF8F2]/60 dark:bg-[#DDF8F2]/10 text-[#00A6A6] text-xs font-bold border border-[#00A6A6]/30 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>NEXOVIRA Ecosystem Architecture</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#17202A] dark:text-white tracking-tight">
            Six Interconnected Ecosystem Destinations
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 mt-1">
            Shop physical products, learn tech skills, hire specialists, download resources, ask AI, or earn commissions.
          </p>
        </div>

        <button
          onClick={() => onNavigate('presentation')}
          className="px-5 py-2.5 rounded-xl bg-[#1769FF] hover:bg-[#0E56D9] text-white font-bold text-xs shadow-xs hover:shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer min-h-[44px]"
          title="Architectural Overview"
        >
          <Sparkles className="w-4 h-4 text-blue-200" />
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
              className="group cursor-pointer rounded-2xl border border-[#E2E8F0] dark:border-slate-800/80 bg-white dark:bg-[#0D2B45] p-6 shadow-xs hover:shadow-md hover:border-[#1769FF]/50 dark:hover:border-[#00A6A6]/50 hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden flex flex-col justify-between"
            >
              {/* Background Subtle Image Overlay */}
              <div className="absolute top-0 right-0 w-32 h-32 opacity-10 dark:opacity-15 group-hover:opacity-20 transition-opacity rounded-bl-full overflow-hidden pointer-events-none">
                <img src={card.image} alt={card.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              </div>

              <div>
                {/* Header Badge & Icon */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${card.iconBg} shadow-xs`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                </div>

                {/* Title & Subtitle */}
                <h3 className="text-lg font-bold text-[#17202A] dark:text-white group-hover:text-[#1769FF] dark:group-hover:text-[#00A6A6] transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs text-[#64748B] dark:text-slate-400 mt-2 leading-relaxed">
                  {card.subtitle}
                </p>
              </div>

              {/* Bottom CTA & Stats */}
              <div className="mt-6 pt-4 border-t border-[#E2E8F0] dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#64748B] dark:text-slate-400 font-medium truncate max-w-[65%]">
                  {card.stats}
                </span>

                <div className={`inline-flex items-center gap-1.5 text-xs font-bold ${card.accentColor} group-hover:translate-x-0.5 transition-transform shrink-0`}>
                  <span>{card.cta}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
