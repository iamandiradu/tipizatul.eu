/**
 * Heuristic field detection from parsed PDF content.
 * Identifies dot sequences, underline rectangles, checkboxes, and underscore runs
 * as form field regions.
 */

/**
 * @typedef {{ type: string, x: number, y: number, width: number, height: number,
 *             page: number, confidence: number, context: string, fontSize: number }} DetectedField
 */

const DOT_THRESHOLD = 0.5    // text item is "dots" if >50% are dot chars
const MIN_DOT_LENGTH = 4     // minimum dot chars to count as a field
const MIN_UNDERSCORE_LENGTH = 4

const CHECKBOX_MIN = 5       // min side length for checkbox square
const CHECKBOX_MAX = 15      // max side length for checkbox square
const CHECKBOX_ASPECT = 2    // max abs(w-h) for a square

const UNDERLINE_MAX_H = 2    // max height for thin rect to be an underline
const UNDERLINE_MIN_W = 30   // min width for an underline field

/**
 * Detect form fields on a single parsed page.
 * @param {{ textItems: Array, drawingOps: Array, width: number, height: number, pageIndex: number }} page
 * @returns {DetectedField[]}
 */
export function detectFields(page) {
  const fields = []
  const { textItems, drawingOps, pageIndex } = page

  // ── A. Dot sequences ────────────────────────────────────────────────────
  for (const item of textItems) {
    const text = item.text
    const dotCount = (text.match(/\./g) || []).length
    if (dotCount >= MIN_DOT_LENGTH && dotCount / text.length > DOT_THRESHOLD) {
      fields.push({
        type: 'text',
        x: item.x,
        y: item.y - 2,
        width: item.estimatedWidth || text.length * item.fontSize * 0.5,
        height: item.fontSize + 4,
        page: pageIndex,
        confidence: 0.95,
        context: 'dot_sequence',
        fontSize: item.fontSize,
      })
    }
  }

  // ── B. Underscore sequences ─────────────────────────────────────────────
  for (const item of textItems) {
    const text = item.text
    const underscoreCount = (text.match(/_/g) || []).length
    if (underscoreCount >= MIN_UNDERSCORE_LENGTH && underscoreCount / text.length > DOT_THRESHOLD) {
      fields.push({
        type: 'text',
        x: item.x,
        y: item.y - 2,
        width: item.estimatedWidth || text.length * item.fontSize * 0.5,
        height: item.fontSize + 4,
        page: pageIndex,
        confidence: 0.93,
        context: 'underscore_sequence',
        fontSize: item.fontSize,
      })
    }
  }

  // ── C. Checkboxes (small squares) ───────────────────────────────────────
  for (const op of drawingOps) {
    if (op.type !== 'rect') continue
    const w = Math.abs(op.width)
    const h = Math.abs(op.height)
    if (w >= CHECKBOX_MIN && w <= CHECKBOX_MAX &&
        h >= CHECKBOX_MIN && h <= CHECKBOX_MAX &&
        Math.abs(w - h) <= CHECKBOX_ASPECT) {
      // Make sure this isn't already counted
      const y = op.height < 0 ? op.y + op.height : op.y
      fields.push({
        type: 'checkbox',
        x: op.x,
        y: y,
        width: w,
        height: h,
        page: pageIndex,
        confidence: 0.90,
        context: 'small_square',
        fontSize: 10,
      })
    }
  }

  // ── D. Underline rectangles (thin horizontal rects) ─────────────────────
  // Only add these if they're NOT already covered by a dot/underscore field
  // on the same line
  for (const op of drawingOps) {
    if (op.type !== 'rect') continue
    const w = Math.abs(op.width)
    const h = Math.abs(op.height)
    if (h <= UNDERLINE_MAX_H && w >= UNDERLINE_MIN_W) {
      const y = op.height < 0 ? op.y + op.height : op.y
      // Check if any text-based field already covers this area
      const alreadyCovered = fields.some(f =>
        f.page === pageIndex &&
        Math.abs(f.y - y) < 15 &&
        Math.abs(f.x - op.x) < 20
      )
      if (!alreadyCovered) {
        fields.push({
          type: 'text',
          x: op.x,
          y: y,
          width: w,
          height: 14, // standard field height for underline
          page: pageIndex,
          confidence: 0.85,
          context: 'underline_rect',
          fontSize: 10,
        })
      }
    }
  }

  // ── E. CNP digit boxes (13 small rects in a row) ────────────────────────
  const smallRects = drawingOps.filter(op =>
    op.type === 'rect' &&
    Math.abs(op.width) > 8 && Math.abs(op.width) < 25 &&
    Math.abs(op.height) > 8 && Math.abs(op.height) < 25
  )
  // Group by similar Y position
  const grouped = groupByY(smallRects, 3)
  for (const group of grouped) {
    if (group.length >= 13) {
      // Sort by X, check if roughly evenly spaced
      group.sort((a, b) => a.x - b.x)
      const first = group[0]
      const last = group[group.length - 1]
      const totalWidth = (last.x + Math.abs(last.width)) - first.x
      const y = first.height < 0 ? first.y + first.height : first.y

      // Remove individual checkbox detections in this area
      for (let i = fields.length - 1; i >= 0; i--) {
        if (fields[i].type === 'checkbox' &&
            fields[i].page === pageIndex &&
            Math.abs(fields[i].y - y) < 5 &&
            fields[i].x >= first.x - 5 &&
            fields[i].x <= last.x + Math.abs(last.width) + 5) {
          fields.splice(i, 1)
        }
      }

      fields.push({
        type: 'text',
        x: first.x,
        y: y,
        width: totalWidth,
        height: Math.abs(first.height),
        page: pageIndex,
        confidence: 0.92,
        context: 'cnp_digit_boxes',
        fontSize: 10,
        maxLength: group.length,
      })
    }
  }

  // Deduplicate overlapping fields
  return deduplicateFields(fields)
}

function groupByY(rects, tolerance) {
  const groups = []
  const sorted = [...rects].sort((a, b) => a.y - b.y)

  for (const rect of sorted) {
    const existing = groups.find(g =>
      Math.abs(g[0].y - rect.y) <= tolerance
    )
    if (existing) {
      existing.push(rect)
    } else {
      groups.push([rect])
    }
  }
  return groups
}

function deduplicateFields(fields) {
  const result = []
  for (const field of fields) {
    const overlap = result.find(f =>
      f.page === field.page &&
      f.type === field.type &&
      Math.abs(f.x - field.x) < 10 &&
      Math.abs(f.y - field.y) < 10
    )
    if (overlap) {
      // Keep the one with higher confidence
      if (field.confidence > overlap.confidence) {
        result.splice(result.indexOf(overlap), 1, field)
      }
    } else {
      result.push(field)
    }
  }
  return result
}
