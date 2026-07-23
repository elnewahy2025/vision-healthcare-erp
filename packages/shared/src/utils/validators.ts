const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s-]{7,15}$/;
const MRN_REGEX = /^MRN-\d{4}-[A-F0-9]{6}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone);
}

export function isValidMrn(mrn: string): boolean {
  return MRN_REGEX.test(mrn);
}

export function isValidDate(date: string): boolean {
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
}

export function isValidBloodType(type: string): boolean {
  return ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(type);
}

export function isValidIcd10Code(code: string): boolean {
  return /^[A-Z]\d{2}(\.\d{1,2})?$/.test(code);
}

export function isStrongPassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Must contain an uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Must contain a lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Must contain a number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Must contain a special character');
  return { valid: errors.length === 0, errors };
}

// ── SSRF Protection ──

const BLOCKED_HOSTNAMES = [
  'localhost',
  '0.0.0.0',
  'metadata.google.internal',
  'instance-data',
];

const BLOCKED_IP_PREFIXES = [
  '127.',
  '10.',
  '172.',
  '192.168.',
  '169.254.',
  '0.',
];

function isBlockedIp(ip: string): boolean {
  if (ip === '::1' || ip === '::') return true;
  for (const prefix of BLOCKED_IP_PREFIXES) {
    if (ip.startsWith(prefix)) {
      if (prefix === '172.') {
        const secondOctet = parseInt(ip.split('.')[1], 10);
        if (secondOctet >= 16 && secondOctet <= 31) return true;
        continue;
      }
      return true;
    }
  }
  return false;
}

export function validateWebhookUrl(urlString: string): { valid: true } | { valid: false; reason: string } {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: `Protocol '${parsed.protocol}' not allowed. Use http or https.` };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return { valid: false, reason: `Hostname '${hostname}' is blocked` };
  }

  const cleanHostname = hostname.replace(/^\[|\]$/g, '');
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanHostname)) {
    if (isBlockedIp(cleanHostname)) {
      return { valid: false, reason: `IP address '${cleanHostname}' is in a blocked range` };
    }
  }

  if (cleanHostname === '::1' || cleanHostname === '::') {
    return { valid: false, reason: 'IPv6 loopback is blocked' };
  }

  const port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80);
  const allowedPorts = [80, 443, 8080, 8443];
  if (!allowedPorts.includes(port)) {
    return { valid: false, reason: `Port ${port} is not allowed. Allowed: ${allowedPorts.join(', ')}` };
  }

  return { valid: true };
}
