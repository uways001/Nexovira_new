/**
 * Robust Error Formatting & Extraction Utility
 * 
 * Guarantees that any thrown value (Error instance, DOMException, API error object,
 * Paystack validation error, or arbitrary structure) is converted into a clear,
 * human-readable string without ever displaying "[object Object]".
 */

export function formatErrorMessage(err: unknown, defaultMessage = 'An unexpected error occurred. Please try again.'): string {
  if (err === null || err === undefined) {
    return defaultMessage;
  }

  // 1. Primitive string
  if (typeof err === 'string') {
    const trimmed = err.trim();
    if (!trimmed || trimmed === '[object Object]') {
      return defaultMessage;
    }
    return trimmed;
  }

  // 2. Object handling
  if (typeof err === 'object') {
    const anyErr = err as Record<string, any>;

    // Special check for nested error string
    if (typeof anyErr.error === 'string' && anyErr.error.trim() && anyErr.error !== '[object Object]') {
      return anyErr.error.trim();
    }

    // Special check for standard Error instance .message
    if (typeof anyErr.message === 'string' && anyErr.message.trim() && anyErr.message !== '[object Object]') {
      return anyErr.message.trim();
    }

    // Nested error object: e.g. { error: { message: '...' } }
    if (anyErr.error && typeof anyErr.error === 'object') {
      const nested = formatErrorMessage(anyErr.error, '');
      if (nested && nested !== defaultMessage) {
        return nested;
      }
    }

    // Nested message object: e.g. { message: { ... } }
    if (anyErr.message && typeof anyErr.message === 'object') {
      const nested = formatErrorMessage(anyErr.message, '');
      if (nested && nested !== defaultMessage) {
        return nested;
      }
    }

    // Paystack API meta: e.g. { meta: { nextStep: '...' }, message: '...' }
    if (anyErr.meta && typeof anyErr.meta.nextStep === 'string' && anyErr.meta.nextStep.trim()) {
      const base = typeof anyErr.message === 'string' && anyErr.message !== '[object Object]' ? `${anyErr.message.trim()}. ` : '';
      return `${base}${anyErr.meta.nextStep.trim()}`;
    }

    // Paystack / Laravel style validation errors: { errors: { field: ['message'] } }
    if (anyErr.errors && typeof anyErr.errors === 'object') {
      try {
        const errorList: string[] = [];
        for (const key of Object.keys(anyErr.errors)) {
          const val = anyErr.errors[key];
          if (Array.isArray(val)) {
            errorList.push(...val.map(v => String(v)));
          } else if (typeof val === 'string') {
            errorList.push(val);
          }
        }
        if (errorList.length > 0) {
          return errorList.join('. ');
        }
      } catch {}
    }

    // SafeFetchResult or Axios response: e.g. { data: { message: '...' } }
    if (anyErr.data) {
      const dataMsg = formatErrorMessage(anyErr.data, '');
      if (dataMsg && dataMsg !== defaultMessage) {
        return dataMsg;
      }
    }

    // DOMException: e.g. SecurityError or QuotaExceededError
    if (anyErr.name && typeof anyErr.name === 'string' && anyErr.name.includes('Security')) {
      return 'Browser security settings or iframe restrictions prevented opening this window. Please use the direct checkout link.';
    }

    // Attempt clean JSON serialization
    try {
      const json = JSON.stringify(anyErr);
      if (json && json !== '{}') {
        // If JSON contains a recognizable message or error field, don't dump the whole JSON
        if (anyErr.error && typeof anyErr.error === 'string') return anyErr.error;
        if (anyErr.message && typeof anyErr.message === 'string') return anyErr.message;
        return json.length > 200 ? `${json.slice(0, 200)}...` : json;
      }
    } catch {}
  }

  const str = String(err);
  if (str && str !== '[object Object]') {
    return str;
  }

  return defaultMessage;
}
