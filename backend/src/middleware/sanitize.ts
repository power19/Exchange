import { Request, Response, NextFunction } from 'express';
import validator from 'validator';
// @ts-ignore - xss doesn't have types
import xss from 'xss';

/**
 * Input Sanitization Middleware
 *
 * Protects against XSS, injection attacks, and malicious input.
 * Sanitizes all string inputs in request body, query params, and params.
 */

/**
 * Sanitize a single string value
 * - Trims whitespace
 * - Removes XSS vulnerabilities
 * - Escapes HTML entities if needed
 */
export function sanitizeString(input: string, options: {
  allowHTML?: boolean;
  maxLength?: number;
} = {}): string {
  if (typeof input !== 'string') {
    return input;
  }

  // Trim whitespace
  let sanitized = validator.trim(input);

  // Remove XSS vulnerabilities
  if (!options.allowHTML) {
    sanitized = xss(sanitized);
  }

  // Enforce max length
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  return sanitized;
}

/**
 * Sanitize an object recursively
 * Processes all string values in nested objects and arrays
 */
export function sanitizeObject(obj: any, options = {}): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj, options);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key], options);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Middleware to sanitize all request inputs
 * Applies to req.body, req.query, and req.params
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  try {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    console.error('Error sanitizing input:', error);
    res.status(400).json({
      error: 'Invalid input format',
      message: 'Request data could not be processed'
    });
  }
}

/**
 * Validate and sanitize specific field types
 */
export const validators = {
  /**
   * Validate customer name
   */
  customerName: (name: string): { valid: boolean; error?: string; sanitized?: string } => {
    const sanitized = sanitizeString(name, { maxLength: 255 });

    if (!sanitized || sanitized.length === 0) {
      return { valid: false, error: 'Customer name is required' };
    }

    if (sanitized.length < 2) {
      return { valid: false, error: 'Customer name must be at least 2 characters' };
    }

    // Check for suspicious patterns
    if (/<script|javascript:|onerror=/i.test(sanitized)) {
      return { valid: false, error: 'Customer name contains invalid characters' };
    }

    return { valid: true, sanitized };
  },

  /**
   * Validate bank name
   */
  bankName: (name: string | null | undefined): { valid: boolean; error?: string; sanitized?: string | null } => {
    if (!name) return { valid: true, sanitized: null };

    const sanitized = sanitizeString(name, { maxLength: 100 });

    if (sanitized.length === 0) {
      return { valid: false, error: 'Bank name cannot be empty if provided' };
    }

    return { valid: true, sanitized };
  },

  /**
   * Validate phone number
   */
  phoneNumber: (phone: string | null | undefined): { valid: boolean; error?: string; sanitized?: string | null } => {
    if (!phone) return { valid: true, sanitized: null };

    const sanitized = sanitizeString(phone, { maxLength: 50 });

    if (sanitized.length === 0) {
      return { valid: false, error: 'Phone number cannot be empty if provided' };
    }

    // Allow digits, spaces, +, -, (), and common phone number characters
    if (!/^[\d\s\-\+\(\)\.]+$/.test(sanitized)) {
      return { valid: false, error: 'Phone number contains invalid characters' };
    }

    return { valid: true, sanitized };
  },

  /**
   * Validate customer ID
   */
  customerId: (id: string | null | undefined): { valid: boolean; error?: string; sanitized?: string | null } => {
    if (!id) return { valid: true, sanitized: null };

    const sanitized = sanitizeString(id, { maxLength: 100 });

    if (sanitized.length === 0) {
      return { valid: false, error: 'Customer ID cannot be empty if provided' };
    }

    return { valid: true, sanitized };
  },

  /**
   * Validate account number
   */
  accountNumber: (account: string | null | undefined): { valid: boolean; error?: string; sanitized?: string | null } => {
    if (!account) return { valid: true, sanitized: null };

    const sanitized = sanitizeString(account, { maxLength: 100 });

    if (sanitized.length === 0) {
      return { valid: false, error: 'Account number cannot be empty if provided' };
    }

    // Allow alphanumeric and common account number characters
    if (!/^[a-zA-Z0-9\-\s]+$/.test(sanitized)) {
      return { valid: false, error: 'Account number contains invalid characters' };
    }

    return { valid: true, sanitized };
  },

  /**
   * Validate notes/text fields
   */
  notes: (notes: string | null | undefined): { valid: boolean; error?: string; sanitized?: string | null } => {
    if (!notes) return { valid: true, sanitized: null };

    const sanitized = sanitizeString(notes, { maxLength: 1000 });

    return { valid: true, sanitized };
  },

  /**
   * Validate numeric amounts
   */
  amount: (amount: any, options: {
    min?: number;
    max?: number;
    allowDecimals?: boolean;
    fieldName?: string;
  } = {}): { valid: boolean; error?: string; value?: number } => {
    const fieldName = options.fieldName || 'Amount';

    // Check if it's a number
    const num = Number(amount);
    if (isNaN(num)) {
      return { valid: false, error: `${fieldName} must be a valid number` };
    }

    // Check minimum
    if (options.min !== undefined && num < options.min) {
      return { valid: false, error: `${fieldName} must be at least ${options.min}` };
    }

    // Check maximum
    if (options.max !== undefined && num > options.max) {
      return { valid: false, error: `${fieldName} cannot exceed ${options.max}` };
    }

    // Check decimals
    if (options.allowDecimals === false && num % 1 !== 0) {
      return { valid: false, error: `${fieldName} must be a whole number` };
    }

    return { valid: true, value: num };
  }
};
