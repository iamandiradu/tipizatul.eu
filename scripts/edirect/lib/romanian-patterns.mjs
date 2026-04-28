/**
 * Romanian-specific field patterns for type inference and validation hints.
 */

export const FIELD_PATTERNS = [
  {
    id: 'cnp',
    labelPatterns: [/\bCNP\b/i, /\bCod\s+numeric\s+personal\b/i, /\bNIF\b/i],
    type: 'text',
    maxLength: 13,
    placeholder: '_ _ _ _ _ _ _ _ _ _ _ _ _',
  },
  {
    id: 'date',
    labelPatterns: [/\bdata\b/i, /\bla\s+data\b/i, /\bdin\s+data\b/i, /\bdata\s+nasterii\b/i, /\bnascut.*la\b/i],
    type: 'text',
    placeholder: 'ZZ.LL.AAAA',
  },
  {
    id: 'email',
    labelPatterns: [/\be-?mail\b/i, /\badresa\s+electronic/i],
    type: 'text',
    placeholder: 'exemplu@email.ro',
  },
  {
    id: 'phone',
    labelPatterns: [/\btelefon\b/i, /\btel\.\b/i, /\btel\/fax\b/i, /\bfax\b/i, /\bnr\.\s*tel/i],
    type: 'text',
    placeholder: '07XX XXX XXX',
  },
  {
    id: 'iban',
    labelPatterns: [/\bIBAN\b/i, /\bCont\s+IBAN\b/i],
    type: 'text',
    maxLength: 24,
    placeholder: 'ROXX XXXX XXXX XXXX XXXX XXXX',
  },
  {
    id: 'cui',
    labelPatterns: [/\bCUI\b/, /\bCIF\b/, /\bCod\s+fiscal\b/i, /\bCod\s+unic\b/i],
    type: 'text',
    maxLength: 10,
  },
  {
    id: 'seria_nr',
    labelPatterns: [/\bseria\b/i, /\bnr\.\s*carte/i, /\bCI\s+seria\b/i, /\bBI\s+seria\b/i],
    type: 'text',
  },
  {
    id: 'judet',
    labelPatterns: [/\bjude[tț]ul?\b/i, /\bjud\.\b/i],
    type: 'text',
  },
  {
    id: 'localitate',
    labelPatterns: [/\blocalitat/i, /\bora[sș]ul?\b/i, /\bmunicipiul?\b/i, /\bcomuna\b/i, /\bsatul?\b/i],
    type: 'text',
  },
  {
    id: 'adresa',
    labelPatterns: [/\badresa\b/i, /\bdomicili/i, /\bstr\.\b/i, /\bstrada\b/i, /\bbloc\b/i],
    type: 'text',
  },
  {
    id: 'nume',
    labelPatterns: [/\bnumele?\b/i, /\bnume\s+[sș]i\s+prenume\b/i],
    type: 'text',
  },
  {
    id: 'prenume',
    labelPatterns: [/\bprenumele?\b/i],
    type: 'text',
  },
  {
    id: 'signature',
    labelPatterns: [/\bsemn[aă]tur/i],
    type: 'text',
  },
]

/**
 * Labels that indicate non-field text (headers, instructions, footnotes).
 * A detected "field" near these labels should be treated with lower confidence.
 */
export const SKIP_PATTERNS = [
  /^Pag\.\s*\d/i,
  /^ANEX[AĂ]/i,
  /^Not[eaă]\s*:/i,
  /^\(\d+\)/,
  /^MONITORUL\s+OFICIAL/i,
  /^NECLASIFICAT/i,
]

/**
 * Match a label against known Romanian patterns.
 * Returns the first matching pattern or null.
 */
export function matchPattern(label) {
  for (const pattern of FIELD_PATTERNS) {
    for (const regex of pattern.labelPatterns) {
      if (regex.test(label)) return pattern
    }
  }
  return null
}

/**
 * Check if a label is a skip/non-field label.
 */
export function isSkipLabel(label) {
  return SKIP_PATTERNS.some(p => p.test(label.trim()))
}

/**
 * Transliterate Romanian characters and convert to snake_case for PDF field names.
 */
export function toFieldName(label) {
  return label
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[ăâ]/gi, 'a')
    .replace(/[îÎ]/gi, 'i')
    .replace(/[șşȘŞ]/gi, 's')
    .replace(/[țţȚŢ]/gi, 't')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
    .substring(0, 50)
}
