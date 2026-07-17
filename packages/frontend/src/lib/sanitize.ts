/**
 * Input sanitization utilities to prevent XSS.
 *
 * These functions sanitize user input before rendering or sending to APIs.
 * They follow OWASP recommendations for output encoding.
 */

const ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
};

const ENTITY_REGEX = /[&<>"'`/]/g;

/**
 * Escapes HTML entities in a string to prevent XSS.
 * Use this when rendering user-provided text in JSX or HTML.
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str.replace(ENTITY_REGEX, (char) => ENTITY_MAP[char] || char);
}

/**
 * Strips HTML tags from a string.
 * Use this when you need plain text from user input.
 */
export function stripHtml(str: string): string {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Sanitizes a string for safe use in a URL path segment.
 * Removes characters that could be used for path traversal or injection.
 */
export function sanitizeUrlSegment(str: string): string {
  if (!str) return '';
  return str.replace(/[^a-zA-Z0-9\-_]/g, '');
}

/**
 * Validates that a URL is safe (not javascript: or data: protocol).
 * Returns the URL if safe, empty string if unsafe.
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('vbscript:')) {
    return '';
  }
  return url;
}

/**
 * Trims and normalizes whitespace in a string.
 */
export function normalizeWhitespace(str: string): string {
  if (!str) return '';
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Validates that input contains only expected characters.
 * Returns true if valid, false if potentially malicious.
 */
export function validateInput(input: string, pattern: RegExp): boolean {
  if (!input) return true;
  return pattern.test(input);
}

/**
 * Sanitizes a numeric input to prevent injection.
 */
export function sanitizeNumber(value: string | number): number {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || !isFinite(num)) return 0;
  return num;
}

/**
 * Sanitizes a string input by trimming and removing null bytes.
 */
export function sanitizeString(str: string): string {
  if (!str) return '';
  return str.replace(/\0/g, '').trim();
}

/**
 * Prevents prototype pollution by checking for dangerous keys.
 */
export function isSafeKey(key: string): boolean {
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  return !dangerousKeys.includes(key);
}

/**
 * Sanitizes an object by removing dangerous keys.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = {} as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (isSafeKey(key)) {
      sanitized[key] = obj[key];
    }
  }
  return sanitized as T;
}
