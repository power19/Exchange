/**
 * Unit tests for security utility functions
 * Tests: getRoleFromHost, isValidHost
 */

import { getRoleFromHost, isValidHost } from '../config/security';

describe('getRoleFromHost', () => {
  it('returns "brian" for main dashboard subdomain', () => {
    expect(getRoleFromHost('powermental.vps.example.com')).toBe('brian');
  });

  it('returns "patty" for pato subdomain', () => {
    expect(getRoleFromHost('pato.vps.example.com')).toBe('patty');
  });

  it('returns "patty" for patty subdomain', () => {
    expect(getRoleFromHost('patty.vps.example.com')).toBe('patty');
  });

  it('returns "dairimar" for dai subdomain', () => {
    expect(getRoleFromHost('dai.vps.example.com')).toBe('dairimar');
  });

  it('returns "brian" for localhost', () => {
    expect(getRoleFromHost('localhost')).toBe('brian');
  });

  it('returns "brian" for localhost with port', () => {
    expect(getRoleFromHost('localhost:3000')).toBe('brian');
  });

  it('returns "brian" for empty host', () => {
    expect(getRoleFromHost('')).toBe('brian');
  });

  it('is case-insensitive', () => {
    expect(getRoleFromHost('PATO.vps.example.com')).toBe('patty');
    expect(getRoleFromHost('DAI.vps.example.com')).toBe('dairimar');
  });
});

describe('isValidHost', () => {
  it('accepts localhost', () => {
    expect(isValidHost('localhost')).toBe(true);
  });

  it('accepts localhost with port', () => {
    expect(isValidHost('localhost:3000')).toBe(true);
  });

  it('accepts 127.0.0.1', () => {
    expect(isValidHost('127.0.0.1')).toBe(true);
  });

  it('accepts powermental subdomain', () => {
    expect(isValidHost('powermental.vps.example.com')).toBe(true);
  });

  it('accepts pato subdomain', () => {
    expect(isValidHost('pato.vps.example.com')).toBe(true);
  });

  it('accepts patty subdomain', () => {
    expect(isValidHost('patty.vps.example.com')).toBe(true);
  });

  it('accepts dai subdomain', () => {
    expect(isValidHost('dai.vps.example.com')).toBe(true);
  });

  it('rejects empty host', () => {
    expect(isValidHost('')).toBe(false);
  });

  it('rejects unknown host', () => {
    expect(isValidHost('evil.attacker.com')).toBe(false);
  });

  it('rejects malicious host injection', () => {
    expect(isValidHost('evil.com')).toBe(false);
    expect(isValidHost('notlocalhost.com')).toBe(false);
  });
});
