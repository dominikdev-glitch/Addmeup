/**
 * Smart phone number parser & normalizer for WhatsApp integration.
 * Specially handles Nigerian mobile numbers, spaces, missing leading zeroes,
 * and ensures WhatsApp deep-links and wa.me URLs never fail with "username isn't on WhatsApp".
 */

export interface PhoneParseResult {
  raw: string;
  normalized: string;       // Pure international digits, e.g. "2348108237903"
  formattedDisplay: string; // User-friendly formatted, e.g. "+234 810 823 7903"
  isNigerian: boolean;
  isValid: boolean;
  correctionApplied?: string;
}

/**
 * Normalizes any phone number into clean international digits without leading '+' or spaces.
 * Specifically converts Nigerian variations:
 * - "08108237903" (11 digits starting with 0) -> "2348108237903"
 * - "8108237903" (10 digits starting with 7, 8, 9, missing first 0) -> "2348108237903"
 * - "+234 0810 823 7903" or "23408108237903" (extra 0 after 234) -> "2348108237903"
 * - "+234 810 823 7903" (spaces, dashes, parentheses) -> "2348108237903"
 */
export function normalizeWhatsAppNumber(rawInput: string): string {
  if (!rawInput) return '';

  // Remove any @ symbol, quotes, brackets, hyphens, and whitespace
  let cleaned = rawInput.trim().replace(/[@()\s\-_.]/g, '');

  const hasLeadingPlus = cleaned.startsWith('+');
  let digits = cleaned.replace(/[^0-9]/g, '');

  if (!digits) return '';

  // 1. Check if user typed +2340... or 2340... (Nigerian code + redundant local 0)
  if (digits.startsWith('2340') && digits.length >= 12) {
    digits = '234' + digits.slice(4);
    return digits;
  }

  // 2. Standard Nigerian 11-digit local number starting with 0 (e.g. 08108237903, 080..., 070..., 090..., 091...)
  if (digits.startsWith('0') && digits.length === 11) {
    return '234' + digits.slice(1);
  }

  // 3. User didn't add the first 0 in Nigeria number (e.g. 10 digits starting with 7, 8, or 9: 8108237903)
  if (digits.length === 10 && /^[789]/.test(digits)) {
    return '234' + digits;
  }

  // 4. Already has Nigerian country code 234 and 10 following digits (13 digits total)
  if (digits.startsWith('234') && digits.length === 13) {
    return digits;
  }

  // 5. If it started with '+', preserve existing international format
  if (hasLeadingPlus) {
    return digits;
  }

  // 6. If 11 digits starting with 234, but maybe missing a digit, keep digits
  if (digits.startsWith('234')) {
    return digits;
  }

  // 7. Default: return digits
  return digits;
}

/**
 * Returns a human-friendly formatted representation of a phone number (e.g. "+234 810 823 7903")
 */
export function formatWhatsAppDisplay(rawInput: string): string {
  const normalized = normalizeWhatsAppNumber(rawInput);
  if (!normalized) return '';

  // If Nigerian (+234...)
  if (normalized.startsWith('234') && normalized.length === 13) {
    const prefix = normalized.slice(0, 3); // 234
    const net = normalized.slice(3, 6);    // 810
    const mid = normalized.slice(6, 9);    // 823
    const end = normalized.slice(9);       // 7903
    return `+${prefix} ${net} ${mid} ${end}`;
  }

  // Generic fallback format
  return `+${normalized}`;
}

/**
 * Analyzes phone input and returns diagnostic details and corrections applied.
 */
export function parseSmartPhone(rawInput: string): PhoneParseResult {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return {
      raw: '',
      normalized: '',
      formattedDisplay: '',
      isNigerian: false,
      isValid: false,
    };
  }

  const normalized = normalizeWhatsAppNumber(trimmed);
  const formattedDisplay = formatWhatsAppDisplay(trimmed);
  const isNigerian = normalized.startsWith('234');
  const isValid = isNigerian ? normalized.length === 13 : normalized.length >= 8 && normalized.length <= 15;

  let correctionApplied: string | undefined;

  const rawDigits = trimmed.replace(/[^0-9]/g, '');

  if (rawDigits.length === 10 && /^[789]/.test(rawDigits)) {
    correctionApplied = 'Auto-added missing leading 0 and Nigeria code (+234)';
  } else if (rawDigits.startsWith('0') && rawDigits.length === 11) {
    correctionApplied = 'Auto-converted Nigerian local number to international (+234)';
  } else if (rawDigits.startsWith('2340')) {
    correctionApplied = 'Removed redundant 0 after country code 234';
  } else if (/\s|-|\(|\)/.test(trimmed)) {
    correctionApplied = 'Cleaned spaces and formatting characters';
  }

  return {
    raw: trimmed,
    normalized,
    formattedDisplay,
    isNigerian,
    isValid,
    correctionApplied,
  };
}
