/**
 * Security Configuration
 * Centralized security settings to avoid duplication and ensure consistency
 */

import crypto from 'crypto';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is required');
  console.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  } else {
    console.warn('⚠️  Using insecure development secret. DO NOT USE IN PRODUCTION!');
  }
}

// Use the secret or a development-only fallback (clearly marked as insecure)
export const jwtSecret = JWT_SECRET || 'INSECURE_DEV_SECRET_' + crypto.randomBytes(32).toString('hex');

export const jwtConfig = {
  secret: jwtSecret,
  expiresIn: '24h' as const,
  cookieName: 'auth_token' as const,
  cookieOptions: {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    path: '/' as const
  }
};

// CSRF Configuration
export const csrfConfig = {
  tokenLength: 32,
  headerName: 'X-CSRF-Token',
  cookieName: 'csrf_token'
};

// Generate CSRF token
export function generateCSRFToken(): string {
  return crypto.randomBytes(csrfConfig.tokenLength).toString('hex');
}

// Allowed hosts for subdomain validation
const ALLOWED_HOSTS = (process.env.ALLOWED_HOSTS || '').split(',').filter(Boolean);
const DEFAULT_ALLOWED_HOSTS = [
  'localhost',
  '127.0.0.1',
  'powermental.',
  'pato.',
  'dai.'
];

export const allowedHosts = [...DEFAULT_ALLOWED_HOSTS, ...ALLOWED_HOSTS];

// Validate host header to prevent host header injection
export function isValidHost(host: string): boolean {
  if (!host) return false;

  // Remove port if present
  const hostWithoutPort = host.split(':')[0].toLowerCase();

  // Check against allowed hosts
  return allowedHosts.some(allowed => {
    if (allowed.endsWith('.')) {
      // Prefix match (e.g., 'powermental.' matches 'powermental.example.com')
      return hostWithoutPort.startsWith(allowed);
    }
    // Exact match
    return hostWithoutPort === allowed;
  });
}

// Determine user role from host
export function getRoleFromHost(host: string): 'brian' | 'patty' | 'dairimar' {
  if (!host) return 'brian';

  const hostLower = host.toLowerCase();

  if (hostLower.startsWith('pato.')) {
    return 'patty';
  }
  if (hostLower.startsWith('dai.')) {
    return 'dairimar';
  }
  // Default to brian for main dashboard, localhost, and powermental
  return 'brian';
}
