/**
 * NEXOVIRA Official Contact & Communication Configuration
 * 
 * Central source of truth for all support channels, phone numbers, and WhatsApp routing.
 * To change the WhatsApp support number for the entire platform in the future,
 * update `officialWhatsAppNumber` below.
 */

export const NEXOVIRA_CONTACT_CONFIG = {
  // Official WhatsApp Support Number (Default active line: 07025900156)
  officialWhatsAppNumber: '07025900156',
  whatsappNumber: '07025900156',

  // Nigeria country dial code
  countryDialCode: '+234',

  // Human-friendly formatted number for display: +234 702 590 0156 or 07025900156
  displayWhatsAppNumber: '+234 702 590 0156',
  whatsappDisplay: '07025900156',

  // Direct Phone Hotline
  supportPhone: '+234 911 044 3054',
  supportPhoneHref: 'tel:+2349110443054',

  // Official Support Email
  supportEmail: 'support@nexovira.com',
  supportEmailHref: 'mailto:support@nexovira.com',

  // Default initial greeting for customer WhatsApp inquiries
  defaultWhatsAppGreeting: 'Hello NEXOVIRA Support, I would like assistance with...',
  defaultMessage: 'Hello NEXOVIRA Support, I would like assistance with...',

  // Clean wa.me international digits (2347025900156)
  get whatsappWaMeNumber(): string {
    return this.getCleanWhatsAppDigits();
  },

  /**
   * Sanitizes any phone number into international digits suitable for https://wa.me/{digits}
   */
  getCleanWhatsAppDigits(phoneOverride?: string): string {
    const raw = (phoneOverride || this.officialWhatsAppNumber).trim();
    let digits = raw.replace(/[^0-9]/g, '');

    // Convert local Nigerian 070... / 080... (11 digits) to international 23470...
    if (digits.startsWith('0') && digits.length === 11) {
      digits = '234' + digits.slice(1);
    } else if (digits.length === 10 && !digits.startsWith('234')) {
      digits = '234' + digits;
    }

    // Default fallback to Nexovira official line if empty
    return digits || '2347025900156';
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
