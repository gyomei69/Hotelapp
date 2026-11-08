const digitsOnly = (s) => String(s || '').replace(/\D/g, '');

/**
 * Normalize Philippine mobile numbers to E.164 form: +639XXXXXXXXX (12 chars after +)
 * Accepts:
 * - 09XXXXXXXXX
 * - 9XXXXXXXXX
 * - 63 9XXXXXXXXX
 * - +63 9XXXXXXXXX
 */
export function normalizePhMobile(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';

  // Keep leading + if provided
  if (raw.startsWith('+')) {
    const d = digitsOnly(raw);
    if (d.startsWith('63') && d.length === 12 && d[2] === '9') {
      return `+${d}`;
    }
  }

  const d = digitsOnly(raw);
  if (!d) return '';

  // 09xxxxxxxxx -> +639xxxxxxxxx
  if (d.length === 11 && d.startsWith('09')) {
    return `+63${d.slice(1)}`;
  }

  // 9xxxxxxxxx -> +639xxxxxxxxx
  if (d.length === 10 && d.startsWith('9')) {
    return `+63${d}`;
  }

  // 639xxxxxxxxx -> +639xxxxxxxxx
  if (d.length === 12 && d.startsWith('63') && d[2] === '9') {
    return `+${d}`;
  }

  return '';
}

export function isValidPhMobileE164(e164) {
  return typeof e164 === 'string' && /^\+639\d{9}$/.test(e164);
}

