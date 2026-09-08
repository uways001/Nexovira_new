import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import { NEXOVIRA_CONTACT_CONFIG } from '../config/contactConfig';

interface WhatsAppSupportButtonProps {
  whatsappNumber?: string;
  defaultMessage?: string;
  variant?: 'floating' | 'inline' | 'hero';
  className?: string;
}

export const WhatsAppSupportButton: React.FC<WhatsAppSupportButtonProps> = ({
  whatsappNumber,
  defaultMessage,
  variant = 'floating',
  className = '',
}) => {
  const { whatsappPhone: brandingWhatsapp } = useBranding();
  const [isHovered, setIsHovered] = useState(false);

  // Priority: explicit prop -> branding context (if non-default) -> central contact config
  const rawNumber = whatsappNumber || brandingWhatsapp || NEXOVIRA_CONTACT_CONFIG.officialWhatsAppNumber;
  const whatsappUrl = NEXOVIRA_CONTACT_CONFIG.getWhatsAppUrl(defaultMessage, rawNumber);

  if (variant === 'floating') {
    return (
      <aside aria-label="WhatsApp customer support" className="contents">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsHovered(true)}
          onBlur={() => setIsHovered(false)}
          className={`fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 group flex items-center bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#1da850] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2 dark:focus:ring-offset-[#0B0F17] p-2.5 sm:p-3 ${className}`}
          aria-label="Chat with us on WhatsApp"
          title={`Chat with us on WhatsApp (${NEXOVIRA_CONTACT_CONFIG.displayWhatsAppNumber})`}
        >
          {/* WhatsApp Icon Container with Online Status indicator */}
          <div className="relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 shrink-0">
            {/* Custom high-res SVG for authentic WhatsApp brand look */}
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6 sm:w-7 sm:h-7 fill-white stroke-none drop-shadow-sm"
              aria-hidden="true"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            {/* Subtle active status pulse badge */}
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-100 border border-[#25D366]"></span>
            </span>
          </div>

          {/* Desktop expandable text label */}
          <div
            className={`hidden md:flex items-center overflow-hidden transition-all duration-300 ease-in-out ${
              isHovered ? 'max-w-xs pl-2.5 pr-1 opacity-100' : 'max-w-0 pl-0 pr-0 opacity-0'
            }`}
          >
            <span className="text-xs font-bold text-white whitespace-nowrap tracking-tight">
              Chat with us on WhatsApp
            </span>
          </div>
        </a>
      </aside>
    );
  }

  if (variant === 'hero') {
    return (
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold text-xs transition-colors ${className}`}
      >
        <MessageCircle className="w-3.5 h-3.5" />
        <span>WhatsApp Support</span>
      </a>
    );
  }

  // Inline default
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-colors ${className}`}
    >
      <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
      <span>Chat on WhatsApp</span>
    </a>
  );
};
