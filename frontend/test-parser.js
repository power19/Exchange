/**
 * Test script for customer data parser
 * Run with: node test-parser.js
 */

// Copy the parser logic here for testing
const BANK_CODES = {
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

const BANK_NAMES = {
  'venezuela': 'Banco de Venezuela',
  'banco de venezuela': 'Banco de Venezuela',
  'venezolano': 'Banco Venezolano de Crédito',
  'mercantil': 'Mercantil',
  'provincial': 'Banco Provincial (BBVA)',
  'bbva': 'Banco Provincial (BBVA)',
  'banco provincial': 'Banco Provincial (BBVA)',
  'bancaribe': 'Bancaribe',
  'exterior': 'Banco Exterior',
  'banesco': 'Banesco',
  'sofitasa': 'Banco Sofitasa',
  'plaza': 'Banco Plaza',
  'tesoro': 'Banco del Tesoro',
  'mi banco': 'Mi Banco',
  'activo': 'Banco Activo',
  'bancamiga': 'Bancamiga',
  'banplus': 'Banplus',
  'bicentenario': 'Banco Bicentenario',
  'banfanb': 'BANFANB',
  'bnc': 'Banco Nacional de Crédito (BNC)',
  'nacional de credito': 'Banco Nacional de Crédito (BNC)',
};

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPhoneNumber(text) {
  const digitsOnly = text.replace(/\D/g, '');
  const phonePattern = /\b(04\d{9})\b/g;
  const matches = text.match(phonePattern);

  if (matches && matches.length > 0) {
    return matches[0];
  }

  const fallbackPattern = /04\d{9}/;
  const fallbackMatch = digitsOnly.match(fallbackPattern);
  return fallbackMatch ? fallbackMatch[0] : null;
}

function extractBankCode(text) {
  const bankCodePattern = /\b(0\d{3})\b/g;
  const matches = text.match(bankCodePattern);

  if (matches && matches.length > 0) {
    for (const match of matches) {
      if (BANK_CODES[match]) {
        return match;
      }
    }
    return matches[0];
  }

  return null;
}

function extractCustomerId(text, phoneNumber, bankCode) {
  const digitSequences = text.match(/\b\d{6,9}\b/g);
  if (!digitSequences) return null;

  const candidates = digitSequences.filter(seq => {
    if (phoneNumber && seq.includes(phoneNumber.substring(0, 8))) return false;
    if (bankCode && seq === bankCode) return false;
    if (seq.length < 7 || seq.length > 9) return false;
    if (seq.startsWith('04')) return false;
    return true;
  });

  return candidates.length > 0 ? candidates[0] : null;
}

function extractBankName(text) {
  const normalized = normalizeText(text);

  for (const [key, bankName] of Object.entries(BANK_NAMES)) {
    if (normalized.includes(key)) {
      return bankName;
    }
  }

  const words = normalized.split(' ');
  for (const word of words) {
    if (word.length >= 4) {
      for (const [key, bankName] of Object.entries(BANK_NAMES)) {
        if (key.includes(word) || word.includes(key)) {
          return bankName;
        }
      }
    }
  }

  return null;
}

function parseCustomerData(rawText) {
  if (!rawText || rawText.trim().length === 0) {
    return {
      phone_number: null,
      customer_id: null,
      bank: null,
      bankCode: null,
      confidence: { phone: 0, id: 0, bank: 0 },
      raw: rawText,
    };
  }

  const normalized = rawText
    .replace(/[\n\r\t\/\\|,;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const phoneNumber = extractPhoneNumber(normalized);
  const bankCode = extractBankCode(normalized);
  const customerId = extractCustomerId(normalized, phoneNumber, bankCode);
  const bankName = extractBankName(normalized);

  let finalBank = null;
  if (bankCode && BANK_CODES[bankCode]) {
    finalBank = BANK_CODES[bankCode];
  } else if (bankName) {
    finalBank = bankName;
  }

  const confidence = {
    phone: phoneNumber ? 90 : 0,
    id: customerId ? (customerId.length >= 7 && customerId.length <= 9 ? 85 : 60) : 0,
    bank: finalBank ? (bankCode ? 95 : 70) : 0,
  };

  return {
    phone_number: phoneNumber,
    customer_id: customerId,
    bank: finalBank,
    bankCode: bankCode,
    confidence,
    raw: rawText,
  };
}

// Test cases
const testCases = [
  {
    name: 'Example A',
    input: `16404830
04163530414
0102`,
    expected: {
      phone: '04163530414',
      id: '16404830',
      bank: 'Banco de Venezuela'
    }
  },
  {
    name: 'Example B',
    input: `CI: 12591337
Teléfono: 04146109044
Banco provincial`,
    expected: {
      phone: '04146109044',
      id: '12591337',
      bank: 'Banco Provincial (BBVA)'
    }
  },
  {
    name: 'Example C',
    input: `0108/22323587/04120535855`,
    expected: {
      phone: '04120535855',
      id: '22323587',
      bank: 'Banco Provincial (BBVA)'
    }
  },
  {
    name: 'Example D',
    input: `04243413600
24375975
 Venezuela`,
    expected: {
      phone: '04243413600',
      id: '24375975',
      bank: 'Banco de Venezuela'
    }
  },
  {
    name: 'All in one line',
    input: '04121234567 30159901 Banesco',
    expected: {
      phone: '04121234567',
      id: '30159901',
      bank: 'Banesco'
    }
  },
  {
    name: 'With labels mixed order',
    input: 'Banco: Mercantil, CI: 28459123, Tel: 04167894561',
    expected: {
      phone: '04167894561',
      id: '28459123',
      bank: 'Mercantil'
    }
  }
];

console.log('🧪 Testing Customer Data Parser\n');
console.log('='.repeat(80) + '\n');

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  console.log(`Test ${index + 1}: ${test.name}`);
  console.log(`Input: ${JSON.stringify(test.input)}`);

  const result = parseCustomerData(test.input);

  console.log(`\nParsed Result:`);
  console.log(`  Phone: ${result.phone_number} (confidence: ${result.confidence.phone}%)`);
  console.log(`  ID: ${result.customer_id} (confidence: ${result.confidence.id}%)`);
  console.log(`  Bank: ${result.bank} (confidence: ${result.confidence.bank}%)`);
  console.log(`  Bank Code: ${result.bankCode}`);

  // Validation
  const phoneMatch = result.phone_number === test.expected.phone;
  const idMatch = result.customer_id === test.expected.id;
  const bankMatch = result.bank === test.expected.bank;

  console.log(`\nExpected:`);
  console.log(`  Phone: ${test.expected.phone} ${phoneMatch ? '✅' : '❌'}`);
  console.log(`  ID: ${test.expected.id} ${idMatch ? '✅' : '❌'}`);
  console.log(`  Bank: ${test.expected.bank} ${bankMatch ? '✅' : '❌'}`);

  if (phoneMatch && idMatch && bankMatch) {
    console.log(`\n✅ PASSED`);
    passed++;
  } else {
    console.log(`\n❌ FAILED`);
    failed++;
  }

  console.log('\n' + '='.repeat(80) + '\n');
});

console.log(`\n📊 Test Summary:`);
console.log(`   Passed: ${passed}/${testCases.length}`);
console.log(`   Failed: ${failed}/${testCases.length}`);
console.log(`   Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);
