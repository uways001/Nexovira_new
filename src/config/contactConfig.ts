/**
 * NEXOVIRA Official Contact & Communication Configuration
 * 
 * Central source of truth for all support channels, phone numbers, and WhatsApp routing.
 * To change the WhatsApp support number for the entire platform in the future,
 * update `officialWhatsAppNumber` below.
 */

export const NEXOVIRA_CONTACT_CONFIG = {
  // Approved Business Identity
  canonicalDomain: 'https://nexovira.com.ng',
  businessModel: 'Online-only technology ecosystem in Nigeria',
  physicalStoreNotice: 'Online-only operations. Nationwide courier delivery and digital fulfillment (no physical walk-in store or public customer pickup center).',

  // Official WhatsApp Support Number
  officialWhatsAppNumber: '+234 911 954 6897',
  whatsappNumber: '+234 911 954 6897',
  whatsappLocalFormat: '0911 954 6897',
  whatsappLink: 'https://wa.me/2349119546897',

  // Nigeria country dial code
  countryDialCode: '+234',

  // Human-friendly formatted number for display
  displayWhatsAppNumber: '+234 911 954 6897',
  whatsappDisplay: '0911 954 6897',

  // Direct Phone / WhatsApp Support Line
  supportPhone: '+234 911 954 6897',
  supportPhoneHref: 'tel:+2349119546897',

  // Official Customer Support Email
  supportEmail: 'nexovirasupport@gmail.com',
  supportEmailHref: 'mailto:nexovirasupport@gmail.com',

  // Default initial greeting for customer WhatsApp inquiries
  defaultWhatsAppGreeting: 'Hello NEXOVIRA Support, I would like assistance with...',
  defaultMessage: 'Hello NEXOVIRA Support, I would like assistance with...',

  // Clean wa.me international digits (2349119546897)
  get whatsappWaMeNumber(): string {
    return this.getCleanWhatsAppDigits();
  },

  /**
   * Sanitizes any phone number into international digits suitable for https://wa.me/{digits}
   */
  getCleanWhatsAppDigits(phoneOverride?: string): string {
    const raw = (phoneOverride || this.whatsappNumber).trim();
    let digits = raw.replace(/[^0-9]/g, '');

    // Convert local Nigerian 070... / 080... / 090... / 091... (11 digits) to international 23491...
    if (digits.startsWith('0') && digits.length === 11) {
      digits = '234' + digits.slice(1);
    } else if (digits.length === 10 && !digits.startsWith('234')) {
      digits = '234' + digits;
    }

    // Default fallback to Nexovira official line if empty
    return digits || '2349119546897';
  },

  sanitizeForWaMe(phoneOverride?: string): string {
    return this.getCleanWhatsAppDigits(phoneOverride);
  },

  /**
   * Generates a direct WhatsApp web/app URL with pre-filled message
   */
  getWhatsAppUrl(customMessage?: string, phoneOverride?: string): string {
    const cleanDigits = this.getCleanWhatsAppDigits(phoneOverride);
    const text = encodeURIComponent(customMessage || this.defaultWhatsAppGreeting);
    return `https://wa.me/${cleanDigits}?text=${text}`;
  }
};
