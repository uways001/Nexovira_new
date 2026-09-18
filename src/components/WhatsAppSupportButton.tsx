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
    // Floating WhatsApp button removed as requested
    return null;
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
