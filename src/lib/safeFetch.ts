import { formatErrorMessage } from './errorUtils';

/**
 * Safe Fetch & JSON Parsing Utilities
 * 
 * Prevents "Unexpected end of JSON input" and "Unexpected token '<'..." errors
 * across all client-side network requests.
 */

export interface SafeFetchResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
  rawText?: string;
}

/**
 * Perform a fetch request and parse JSON safely, gracefully handling:
 * - Empty response bodies (e.g. 204 No Content, empty 500/502)
 * - HTML responses returned when an endpoint does not exist or Vite serves index.html
 * - Truncated or malformed JSON payloads
 */
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<SafeFetchResult<T>> {
  try {
    const res = await fetch(input, {
      ...init,
      headers: {
        'Accept': 'application/json',
        ...(init?.headers || {})
      }
    });

    const status = res.status;
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const text = await res.text();

    if (!text || text.trim().length === 0) {
      return {
        ok: res.ok,
        status,
        data: null,
        error: res.ok ? undefined : `Server returned empty response with status ${status}`
      };
    }

    const trimmed = text.trim();

    // Check if response is HTML or not JSON
    if (
      trimmed.startsWith('<!DOCTYPE html') || 
      trimmed.startsWith('<html') || 
      trimmed.startsWith('<head') ||
      (!contentType.includes('application/json') && (trimmed.startsWith('<') || !trimmed.startsWith('{') && !trimmed.startsWith('[')))
    ) {
      return {
        ok: false,
        status: status === 200 ? 404 : status,
        data: null,
        error: `Endpoint returned non-JSON response (HTTP ${status}).`,
        rawText: trimmed.slice(0, 200)
      };
    }

    try {
      const parsed = JSON.parse(trimmed) as T;
      let errorMsg: string | undefined = undefined;
      if (!res.ok) {
        errorMsg = formatErrorMessage(
          (parsed as any)?.error ?? (parsed as any)?.message ?? parsed,
          `Request failed with status ${status}`
        );
      }
      return {
        ok: res.ok,
        status,
        data: parsed,
        error: errorMsg
      };
    } catch (parseError: any) {
      return {
        ok: false,
        status,
        data: null,
        error: `Failed to parse response as JSON: ${formatErrorMessage(parseError)}`,
        rawText: trimmed.slice(0, 200)
      };
    }
  } catch (netErr: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: formatErrorMessage(netErr, 'Network connection error.')
    };
  }
}

/**
 * Safely parse a JSON string from localStorage or cache without throwing SyntaxError
 */
export function safeJsonParse<T = any>(value: string | null | undefined, fallback: T): T {
  if (!value || typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null') {
    return fallback;
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}
