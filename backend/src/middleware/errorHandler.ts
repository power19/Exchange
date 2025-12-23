import { Request, Response, NextFunction } from 'express';

// Error messages that are safe to show to users
const SAFE_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid request',
  401: 'Authentication required',
  403: 'Access denied',
  404: 'Resource not found',
  409: 'Conflict',
  422: 'Invalid data provided',
  429: 'Too many requests',
  500: 'An error occurred'
};

// Patterns that indicate sensitive information in error messages
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /database/i,
  /sql/i,
  /query/i,
  /column/i,
  /table/i,
  /relation/i,
  /postgresql/i,
  /connection/i,
  /internal/i,
  /stack/i,
  /at\s+\w+\s+\(/i, // Stack trace patterns
  /node_modules/i,
  /\/home\//i,
  /\/var\//i,
  /:\d+:\d+/i // Line numbers in paths
];

function containsSensitiveInfo(message: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(message));
}

function sanitizeErrorMessage(message: string, statusCode: number): string {
  // If it contains sensitive info, use a safe generic message
  if (containsSensitiveInfo(message)) {
    return SAFE_ERROR_MESSAGES[statusCode] || SAFE_ERROR_MESSAGES[500];
  }

  // Allow specific business logic errors through
  const allowedPatterns = [
    /^Insufficient .+ balance/i,
    /^Order .+ not found/i,
    /^Cannot .+ order/i,
    /^Invalid .+ rate/i,
    /^Amount must be/i,
    /^Rate must be/i,
    /^Customer name/i,
    /^Username and password required/i,
    /^Invalid credentials/i,
    /^Too many/i
  ];

  if (allowedPatterns.some(pattern => pattern.test(message))) {
    // Sanitize specific values from business errors
    return message
      .replace(/\d+(\.\d+)?\s*(USDT|VES|COP)/gi, '[amount] $2') // Hide specific amounts
      .replace(/:\s*\d+(\.\d+)?/g, ': [value]'); // Hide numeric values after colons
  }

  // Default: use safe message for the status code
  return SAFE_ERROR_MESSAGES[statusCode] || SAFE_ERROR_MESSAGES[500];
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Log the full error for debugging (server-side only)
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  const statusCode = err.statusCode || err.status || 500;
  const rawMessage = err.message || 'Internal Server Error';

  // In development, show more details (but still sanitize sensitive data)
  const isDev = process.env.NODE_ENV === 'development';

  // Sanitize the error message for the response
  const message = isDev && !containsSensitiveInfo(rawMessage)
    ? rawMessage
    : sanitizeErrorMessage(rawMessage, statusCode);

  res.status(statusCode).json({
    error: message,
    ...(isDev && err.code && { code: err.code })
  });
}
