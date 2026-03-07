/**
 * Unit tests for input validators
 * Tests all validators in middleware/sanitize.ts
 */

import { validators } from '../middleware/sanitize';

describe('validators.customerName', () => {
  it('accepts a valid name', () => {
    const result = validators.customerName('John Doe');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('John Doe');
  });

  it('rejects empty string', () => {
    const result = validators.customerName('');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/required/i);
  });

  it('rejects single character name', () => {
    const result = validators.customerName('A');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/at least 2 characters/i);
  });

  it('trims whitespace from name', () => {
    const result = validators.customerName('  John Doe  ');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('John Doe');
  });

  it('accepts Spanish characters and accents', () => {
    const result = validators.customerName('María García');
    expect(result.valid).toBe(true);
  });

  it('rejects XSS in name', () => {
    const result = validators.customerName('<script>alert(1)</script>');
    // The XSS content is sanitized, and after sanitization it may be too short or invalid
    // Either invalid or sanitized to safe content
    if (result.valid) {
      expect(result.sanitized).not.toContain('<script>');
    }
  });

  it('enforces max length of 255', () => {
    const longName = 'A'.repeat(300);
    const result = validators.customerName(longName);
    if (result.valid) {
      expect(result.sanitized!.length).toBeLessThanOrEqual(255);
    }
  });
});

describe('validators.amount', () => {
  it('accepts valid positive number', () => {
    const result = validators.amount(100);
    expect(result.valid).toBe(true);
    expect(result.value).toBe(100);
  });

  it('accepts string number', () => {
    const result = validators.amount('500.50');
    expect(result.valid).toBe(true);
    expect(result.value).toBe(500.5);
  });

  it('rejects NaN', () => {
    const result = validators.amount('not-a-number');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/valid number/i);
  });

  it('rejects undefined', () => {
    const result = validators.amount(undefined);
    expect(result.valid).toBe(false);
  });

  it('enforces minimum value', () => {
    const result = validators.amount(0, { min: 1 });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/at least 1/i);
  });

  it('accepts value equal to minimum', () => {
    const result = validators.amount(1, { min: 1 });
    expect(result.valid).toBe(true);
  });

  it('enforces maximum value', () => {
    const result = validators.amount(2000000, { max: 1000000 });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/cannot exceed/i);
  });

  it('accepts value equal to maximum', () => {
    const result = validators.amount(1000000, { max: 1000000 });
    expect(result.valid).toBe(true);
  });

  it('rejects decimals when allowDecimals is false', () => {
    const result = validators.amount(10.5, { allowDecimals: false });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/whole number/i);
  });

  it('accepts decimals when allowDecimals is true', () => {
    const result = validators.amount(10.5, { allowDecimals: true });
    expect(result.valid).toBe(true);
  });

  it('accepts whole number when allowDecimals is false', () => {
    const result = validators.amount(10, { allowDecimals: false });
    expect(result.valid).toBe(true);
  });

  it('uses custom field name in error messages', () => {
    const result = validators.amount('bad', { fieldName: 'VES amount' });
    expect(result.error).toContain('VES amount');
  });

  it('validates VES order amount constraints', () => {
    const valid = validators.amount(5000000, { min: 1, max: 10000000000, allowDecimals: false });
    expect(valid.valid).toBe(true);

    const tooSmall = validators.amount(0, { min: 1, max: 10000000000, allowDecimals: false });
    expect(tooSmall.valid).toBe(false);
  });

  it('validates COP order amount constraints', () => {
    const valid = validators.amount(2000000, { min: 1, max: 100000000000, allowDecimals: false });
    expect(valid.valid).toBe(true);

    const decimal = validators.amount(2000000.5, { min: 1, max: 100000000000, allowDecimals: false });
    expect(decimal.valid).toBe(false);
  });
});

describe('validators.bankName', () => {
  it('accepts null/undefined (optional field)', () => {
    expect(validators.bankName(null).valid).toBe(true);
    expect(validators.bankName(undefined).valid).toBe(true);
    expect(validators.bankName(null).sanitized).toBeNull();
  });

  it('accepts valid bank name', () => {
    const result = validators.bankName('Banco de Venezuela');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('Banco de Venezuela');
  });

  it('enforces max length of 100', () => {
    const longName = 'B'.repeat(150);
    const result = validators.bankName(longName);
    if (result.valid) {
      expect(result.sanitized!.length).toBeLessThanOrEqual(100);
    }
  });
});

describe('validators.phoneNumber', () => {
  it('accepts null/undefined (optional field)', () => {
    expect(validators.phoneNumber(null).valid).toBe(true);
    expect(validators.phoneNumber(undefined).valid).toBe(true);
  });

  it('accepts valid phone number formats', () => {
    expect(validators.phoneNumber('+58 412-555-1234').valid).toBe(true);
    expect(validators.phoneNumber('04125551234').valid).toBe(true);
    expect(validators.phoneNumber('(58) 412-555-1234').valid).toBe(true);
  });

  it('rejects phone numbers with letters', () => {
    const result = validators.phoneNumber('1800-FLOWERS');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/invalid characters/i);
  });
});

describe('validators.customerId', () => {
  it('accepts null/undefined (optional)', () => {
    expect(validators.customerId(null).valid).toBe(true);
    expect(validators.customerId(undefined).valid).toBe(true);
  });

  it('accepts valid customer IDs', () => {
    expect(validators.customerId('V-12345678').valid).toBe(true);
    expect(validators.customerId('E-87654321').valid).toBe(true);
  });
});

describe('validators.accountNumber', () => {
  it('accepts null/undefined (optional)', () => {
    expect(validators.accountNumber(null).valid).toBe(true);
    expect(validators.accountNumber(undefined).valid).toBe(true);
  });

  it('accepts valid account numbers', () => {
    expect(validators.accountNumber('01340123456789012345').valid).toBe(true);
    expect(validators.accountNumber('ABC 123').valid).toBe(true);
  });

  it('rejects special characters', () => {
    const result = validators.accountNumber('12345@bank');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/invalid characters/i);
  });
});

describe('validators.notes', () => {
  it('accepts null/undefined (optional)', () => {
    expect(validators.notes(null).valid).toBe(true);
    expect(validators.notes(undefined).valid).toBe(true);
  });

  it('accepts valid notes', () => {
    const result = validators.notes('Payment for customer order #123');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('Payment for customer order #123');
  });

  it('enforces max length of 1000', () => {
    const longNote = 'N'.repeat(1500);
    const result = validators.notes(longNote);
    expect(result.valid).toBe(true);
    expect(result.sanitized!.length).toBeLessThanOrEqual(1000);
  });
});
