/**
 * Associates detected form fields with their text labels.
 * Only uses readable text (filters out hex-encoded garbage from fonts without ToUnicode).
 * Looks for the nearest readable label to the left or above each field.
 */

import { matchPattern, isSkipLabel, toFieldName } from './romanian-patterns.mjs'

const Y_TOLERANCE = 10      // vertical tolerance for "same line"
const LEFT_MAX_DIST = 300   // max horizontal distance for left-label
const ABOVE_MAX_DIST = 25   // max vertical distance for above-label

/**
 * Check if a text string is readable (not hex garbage or replacement chars).
 * Readable means it contains mostly Latin/Romanian characters.
 */
function isReadable(text) {
  if (!text || text.length === 0) return false
  // Count readable characters (Latin letters, digits, common punctuation, Romanian diacritics)
  const readable = text.match(/[a-zA-ZăâîșțĂÂÎȘȚşţŞŢ0-9\s.,;:!?()\/\-'"_@#%&*+=]/g)
  const readableCount = readable ? readable.length : 0
  // At least 60% must be readable chars
  return readableCount / text.length > 0.6
}

/**
 * Check if text is a field placeholder (dots, underscores, or similar)
 */
function isFieldPlaceholder(text) {
  const cleaned = text.trim()
  if (cleaned.length < 2) return true
  const dotUnderscoreRatio = (cleaned.match(/[._\-…]/g) || []).length / cleaned.length
  return dotUnderscoreRatio > 0.4
}

/**
 * Extract a clean label from text — strip trailing colons, dots, parens, etc.
 */
function cleanLabel(text) {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[:;,.\s]+$/, '')   // strip trailing punctuation
    .replace(/^\d+[.)]\s*/, '')  // strip leading numbering like "1." or "2)"
    .trim()
}

/**
 * Associate labels with detected fields.
 * @param {Array} fields - Detected fields from field-detector
 * @param {Array} pages - Parsed pages from content-stream-parser
 * @returns {Array} Fields with label, pdfFieldName, and pattern metadata
 */
export function associateLabels(fields, pages) {
  const usedNames = new Set()
  // Track how many times each base label appears for numbering
  const labelCounts = new Map()

  return fields.map((field, idx) => {
    const page = pages[field.page]
    if (!page) return enrichField(field, null, idx, usedNames, labelCounts)

    // Get all readable, non-field text items
    const labels = page.textItems.filter(t => {
      const text = t.text.trim()
      return text.length >= 2 && isReadable(text) && !isFieldPlaceholder(text)
    })

    // Strategy 1: Closest readable label to the LEFT on the same line
    let bestLabel = null
    let bestDist = Infinity

    for (const label of labels) {
      if (Math.abs(label.y - field.y) > Y_TOLERANCE) continue
      // Must be to the left of the field
      const labelRight = label.x + (label.estimatedWidth || 0)
      const dist = field.x - labelRight
      if (dist < -10 || dist > LEFT_MAX_DIST) continue
      if (dist < bestDist) {
        bestDist = dist
        bestLabel = label
      }
    }

    // Strategy 2: Nearest readable label ABOVE the field
    if (!bestLabel || bestDist > 150) {
      let bestAbove = null
      let bestAboveDist = Infinity

      for (const label of labels) {
        const vertDist = label.y - field.y
        if (vertDist < 0 || vertDist > ABOVE_MAX_DIST) continue
        // Must overlap horizontally (loosely)
        const labelRight = label.x + (label.estimatedWidth || 50)
        const fieldRight = field.x + field.width
        if (labelRight < field.x - 30 || label.x > fieldRight + 30) continue
        if (vertDist < bestAboveDist) {
          bestAboveDist = vertDist
          bestAbove = label
        }
      }

      // Prefer above-label only if there's no left-label or it's closer
      if (bestAbove && (!bestLabel || bestAboveDist < bestDist)) {
        bestLabel = bestAbove
      }
    }

    return enrichField(field, bestLabel, idx, usedNames, labelCounts)
  })
}

function enrichField(field, label, idx, usedNames, labelCounts) {
  const rawText = label ? label.text : ''
  const labelText = cleanLabel(rawText)

  // Only use the label if it's actually readable
  const usableLabel = (labelText && isReadable(labelText) && labelText.length >= 2)
    ? labelText
    : null

  // Match against Romanian patterns for type hints
  const pattern = usableLabel ? matchPattern(usableLabel) : null
  const isSkip = usableLabel ? isSkipLabel(usableLabel) : false

  // Generate field name from label
  let baseName = usableLabel ? toFieldName(usableLabel) : 'field'
  if (!baseName) baseName = 'field'

  // Track occurrences of this base name for numbering (Nume_1, Nume_2, etc.)
  const count = (labelCounts.get(baseName) || 0) + 1
  labelCounts.set(baseName, count)

  let name = count > 1 ? `${baseName}_${count}` : baseName
  // Ensure uniqueness across all fields
  while (usedNames.has(name)) {
    name = `${baseName}_${count}_p${field.page}`
  }
  usedNames.add(name)

  // Adjust confidence
  let confidence = field.confidence
  if (usableLabel) {
    confidence = Math.min(confidence + 0.03, 1.0)
    if (pattern) confidence = Math.min(confidence + 0.02, 1.0)
  }
  if (isSkip) confidence *= 0.5
  if (!usableLabel) confidence *= 0.7

  return {
    ...field,
    label: usableLabel,
    pdfFieldName: name,
    confidence,
    patternId: pattern?.id ?? null,
    maxLength: field.maxLength ?? pattern?.maxLength ?? null,
    placeholder: pattern?.placeholder ?? null,
    isMultiline: false,
  }
}
