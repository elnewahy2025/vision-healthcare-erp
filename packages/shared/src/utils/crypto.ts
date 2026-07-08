import { randomBytes, createHash } from 'crypto';

export function generateId(prefix = ''): string {
  const id = randomBytes(12).toString('hex');
  return prefix ? `${prefix}_${id}` : id;
}

export function generateMedicalRecordNumber(): string {
  const year = new Date().getFullYear();
  const random = randomBytes(3).toString('hex').toUpperCase();
  return `MRN-${year}-${random}`;
}

export function generateInvoiceNumber(tenantSlug: string): string {
  const year = new Date().getFullYear();
  const seq = randomBytes(2).toString('hex').toUpperCase();
  return `INV-${tenantSlug.toUpperCase()}-${year}-${seq}`;
}

export function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  return `${name[0]}***${name[name.length - 1]}@${domain}`;
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
