/**
 * Smart Customer Data Parser
 *
 * Parses customer payment information from various formats:
 * - Different separators (spaces, slashes, newlines, colons)
 * - Different orderings of fields
 * - Optional labels (CI:, Teléfono:, Banco:)
 * - Bank codes (4 digits) or bank names (fuzzy matched)
 */

// Venezuelan bank codes mapping
const BANK_CODES: Record<string, string> = {
  '0102': 'Banco de Venezuela',
  '0104': 'Banco Venezolano de Crédito',
  '0105': 'Mercantil',
  '0108': 'Banco Provincial (BBVA)',
  '0114': 'Bancaribe',
  '0115': 'Banco Exterior',
  '0128': 'Banco Caroní',
  '0134': 'Banesco',
  '0137': 'Banco Sofitasa',
  '0138': 'Banco Plaza',
  '0151': 'BFC Banco Fondo Común',
  '0156': '100% Banco',
  '0163': 'Banco del Tesoro',
  '0169': 'Mi Banco',
  '0171': 'Banco Activo',
  '0172': 'Bancamiga',
  '0174': 'Banplus',
  '0175': 'Banco Bicentenario',
  '0177': 'BANFANB',
  '0191': 'Banco Nacional de Crédito (BNC)',
  '0601': 'Instituto Municipal de Crédito Popular',
};

// Bank names for fuzzy matching (both Venezuelan and Colombian)
const BANK_NAMES: Record<string, string> = {
  // Venezuelan banks - normalized versions
  'venezuela': 'Banco de Venezuela',
  'banco de venezuela': 'Banco de Venezuela',
  'venezolano': 'Banco Venezolano de Crédito',
  'venezolano de credito': 'Banco Venezolano de Crédito',
  'mercantil': 'Mercantil',
  'provincial': 'Banco Provincial (BBVA)',
  'bbva': 'Banco Provincial (BBVA)',
  'banco provincial': 'Banco Provincial (BBVA)',
  'bancaribe': 'Bancaribe',
  'exterior': 'Banco Exterior',
  'banco exterior': 'Banco Exterior',
  'caroni': 'Banco Caroní',
  'banco caroni': 'Banco Caroní',
  'banesco': 'Banesco',
  'sofitasa': 'Banco Sofitasa',
  'banco sofitasa': 'Banco Sofitasa',
  'plaza': 'Banco Plaza',
  'banco plaza': 'Banco Plaza',
  'fondo comun': 'BFC Banco Fondo Común',
  'bfc': 'BFC Banco Fondo Común',
  '100': '100% Banco',
  '100%': '100% Banco',
  'tesoro': 'Banco del Tesoro',
  'banco del tesoro': 'Banco del Tesoro',
  'mi banco': 'Mi Banco',
  'mibanco': 'Mi Banco',
  'activo': 'Banco Activo',
  'banco activo': 'Banco Activo',
  'bancamiga': 'Bancamiga',
  'banplus': 'Banplus',
  'bicentenario': 'Banco Bicentenario',
  'banco bicentenario': 'Banco Bicentenario',
  'banfanb': 'BANFANB',
  'bnc': 'Banco Nacional de Crédito (BNC)',
  'nacional de credito': 'Banco Nacional de Crédito (BNC)',
  'banco nacional': 'Banco Nacional de Crédito (BNC)',

  // Colombian banks
  'bancolombia': 'Bancolombia',
  'bogota': 'Banco de Bogotá',
  'banco de bogota': 'Banco de Bogotá',
  'davivienda': 'Davivienda',
  'bbva colombia': 'BBVA Colombia',
  'occidente': 'Banco de Occidente',
  'banco de occidente': 'Banco de Occidente',
  'popular': 'Banco Popular',
  'banco popular': 'Banco Popular',
  'itau': 'Itaú',
  'scotiabank': 'Scotiabank Colpatria',
  'colpatria': 'Scotiabank Colpatria',
  'caja social': 'Banco Caja Social',
  'banco caja social': 'Banco Caja Social',
  'av villas': 'AV Villas',
  'villas': 'AV Villas',
  'bancoomeva': 'Bancoomeva',
  'agrario': 'Banco Agrario',
  'banco agrario': 'Banco Agrario',
  'nequi': 'Nequi',
  'daviplata': 'Daviplata',
};

export interface ParsedCustomerData {
  phone_number: string | null;
  customer_id: string | null;
  bank: string | null;
  bankCode: string | null;
  account_number: string | null;
  confidence: {
    phone: number;
    id: number;
    bank: number;
  };
  raw: string;
}

/**
 * Normalize text for fuzzy matching
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, ' ')    // Remove special chars except spaces and numbers
    .replace(/\s+/g, ' ')             // Normalize spaces
    .trim();
}

/**
 * Extract phone number from text
 * Venezuelan format: starts with 04, typically 11 digits (e.g., 04121234567)
 */
function extractPhoneNumber(text: string): string | null {
  // Remove all non-digits
  const digitsOnly = text.replace(/\D/g, '');

  // Look for phone pattern: starts with 04, followed by 9 more digits (11 total)
  const phonePattern = /\b(04\d{9})\b/g;
  const matches = text.match(phonePattern);

  if (matches && matches.length > 0) {
    return matches[0];
  }

  // Fallback: look for any 04 followed by digits in the full digits string
  const fallbackPattern = /04\d{9}/;
  const fallbackMatch = digitsOnly.match(fallbackPattern);

  return fallbackMatch ? fallbackMatch[0] : null;
}

/**
 * Extract bank code from text
 * Venezuelan format: 4 digits starting with 0 (e.g., 0102, 0134)
 */
function extractBankCode(text: string): string | null {
  // Look for 4-digit codes starting with 0
  const bankCodePattern = /\b(0\d{3})\b/g;
  const matches = text.match(bankCodePattern);

  if (matches && matches.length > 0) {
    // Return the first valid bank code
    for (const match of matches) {
      if (BANK_CODES[match]) {
        return match;
      }
    }
    // Return first match even if not in our list
    return matches[0];
  }

  return null;
}

/**
 * Extract customer ID (Cédula) from text
 * Venezuelan format: 7-8 digits (e.g., 12591337, 30159901)
 */
function extractCustomerId(text: string, phoneNumber: string | null, bankCode: string | null): string | null {
  // Get all digit sequences
  const digitSequences = text.match(/\b\d{6,9}\b/g);

  if (!digitSequences) return null;

  // Filter out phone number and bank code
  const candidates = digitSequences.filter(seq => {
    // Not the phone number
    if (phoneNumber && seq.includes(phoneNumber.substring(0, 8))) return false;
    // Not the bank code
    if (bankCode && seq === bankCode) return false;
    // Should be 7-9 digits
    if (seq.length < 7 || seq.length > 9) return false;
    // Should not start with 04 (that's likely a phone)
    if (seq.startsWith('04')) return false;

    return true;
  });

  // Return the first valid candidate
  return candidates.length > 0 ? candidates[0] : null;
}

/**
 * Extract bank name using fuzzy matching
 */
function extractBankName(text: string): string | null {
  const normalized = normalizeText(text);

  // Try exact matches first
  for (const [key, bankName] of Object.entries(BANK_NAMES)) {
    if (normalized.includes(key)) {
      return bankName;
    }
  }

  // Try partial matches (e.g., "provincial" in "banco provincial")
  const words = normalized.split(' ');
  for (const word of words) {
    if (word.length >= 4) { // Only match words with 4+ chars
      for (const [key, bankName] of Object.entries(BANK_NAMES)) {
        if (key.includes(word) || word.includes(key)) {
          return bankName;
        }
      }
    }
  }

  return null;
}

/**
 * Extract account number from text
 * This is tricky as it can vary. We'll look for longer digit sequences
 * that aren't phone, ID, or bank code
 */
function extractAccountNumber(
  text: string,
  phoneNumber: string | null,
  customerId: string | null,
  bankCode: string | null
): string | null {
  // Look for digit sequences of 10-20 characters
  const digitSequences = text.match(/\b\d{10,20}\b/g);

  if (!digitSequences) return null;

  // Filter out known values
  const candidates = digitSequences.filter(seq => {
    if (phoneNumber && seq === phoneNumber) return false;
    if (customerId && seq === customerId) return false;
    if (bankCode && seq === bankCode) return false;
    return true;
  });

  return candidates.length > 0 ? candidates[0] : null;
}

/**
 * Main parser function
 *
 * Examples:
 * - "16404830 04163530414 0102"
 * - "CI: 12591337\nTeléfono: 04146109044\nBanco provincial"
 * - "0108/22323587/04120535855"
 * - "04243413600 24375975 Venezuela"
 */
export function parseCustomerData(rawText: string): ParsedCustomerData {
  if (!rawText || rawText.trim().length === 0) {
    return {
      phone_number: null,
      customer_id: null,
      bank: null,
      bankCode: null,
      account_number: null,
      confidence: { phone: 0, id: 0, bank: 0 },
      raw: rawText,
    };
  }

  // Normalize input: replace common separators with spaces
  const normalized = rawText
    .replace(/[\n\r\t\/\\|,;]/g, ' ')  // Replace separators with spaces
    .replace(/\s+/g, ' ')               // Normalize multiple spaces
    .trim();

  // Extract each field
  const phoneNumber = extractPhoneNumber(normalized);
  const bankCode = extractBankCode(normalized);
  const customerId = extractCustomerId(normalized, phoneNumber, bankCode);
  const bankName = extractBankName(normalized);
  const accountNumber = extractAccountNumber(normalized, phoneNumber, customerId, bankCode);

  // Determine final bank value (prefer code-based name, then fuzzy matched name)
  let finalBank: string | null = null;
  if (bankCode && BANK_CODES[bankCode]) {
    finalBank = BANK_CODES[bankCode];
  } else if (bankName) {
    finalBank = bankName;
  }

  // Calculate confidence scores (0-100)
  const confidence = {
    phone: phoneNumber ? 90 : 0,
    id: customerId ? (customerId.length >= 7 && customerId.length <= 9 ? 85 : 60) : 0,
    bank: finalBank ? (bankCode ? 95 : 70) : 0, // Higher confidence if we found a code
  };

  return {
    phone_number: phoneNumber,
    customer_id: customerId,
    bank: finalBank,
    bankCode: bankCode,
    account_number: accountNumber,
    confidence,
    raw: rawText,
  };
}

/**
 * Format parsed data for display
 */
export function formatParsedData(data: ParsedCustomerData): string {
  const lines: string[] = [];

  if (data.phone_number) {
    lines.push(`📱 Phone: ${data.phone_number} (${data.confidence.phone}% confidence)`);
  }

  if (data.customer_id) {
    lines.push(`🆔 ID: ${data.customer_id} (${data.confidence.id}% confidence)`);
  }

  if (data.bank) {
    lines.push(`🏦 Bank: ${data.bank} (${data.confidence.bank}% confidence)`);
  }

  if (data.bankCode) {
    lines.push(`   Code: ${data.bankCode}`);
  }

  if (data.account_number) {
    lines.push(`💳 Account: ${data.account_number}`);
  }

  if (lines.length === 0) {
    return '❌ No data could be extracted';
  }

  return lines.join('\n');
}
