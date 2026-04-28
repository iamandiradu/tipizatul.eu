/**
 * Parses decoded PDF content streams into structured text items and drawing operations.
 * Uses pdf-lib's decodePDFRawStream to get raw bytes, then applies a state-machine
 * parser over the operators.
 */

import { PDFDocument, PDFName, PDFDict, PDFArray, decodePDFRawStream } from 'pdf-lib'

// ── ToUnicode CMap parser ────────────────────────────────────────────────────

/**
 * Parse a ToUnicode CMap stream into a Map<glyphId, unicodeString>.
 */
function parseCMap(cmapText) {
  const map = new Map()

  // bfchar entries: <srcCode> <dstUnicode>
  const charRegex = /<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>/g
  const charSections = cmapText.matchAll(/beginbfchar\n([\s\S]*?)endbfchar/g)
  for (const section of charSections) {
    let m
    charRegex.lastIndex = 0
    const body = section[1]
    while ((m = charRegex.exec(body)) !== null) {
      const src = parseInt(m[1], 16)
      const dst = hexToString(m[2])
      map.set(src, dst)
    }
  }

  // bfrange entries: <srcLo> <srcHi> <dstStart>
  const rangeSections = cmapText.matchAll(/beginbfrange\n([\s\S]*?)endbfrange/g)
  const rangeRegex = /<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>/g
  for (const section of rangeSections) {
    rangeRegex.lastIndex = 0
    let m
    while ((m = rangeRegex.exec(section[1])) !== null) {
      const lo = parseInt(m[1], 16)
      const hi = parseInt(m[2], 16)
      let dstStart = parseInt(m[3], 16)
      for (let code = lo; code <= hi; code++) {
        map.set(code, String.fromCodePoint(dstStart++))
      }
    }
  }

  return map
}

function hexToString(hex) {
  let str = ''
  for (let i = 0; i < hex.length; i += 4) {
    const cp = parseInt(hex.substring(i, i + 4), 16)
    str += String.fromCodePoint(cp)
  }
  return str
}

// ── Font info extractor ──────────────────────────────────────────────────────

function extractFontMaps(doc, page) {
  const fontMaps = new Map() // fontName -> CMap
  const resources = page.node.Resources()
  if (!resources) return fontMaps

  const fonts = resources.get(PDFName.of('Font'))
  if (!(fonts instanceof PDFDict)) return fontMaps

  for (const [name, ref] of fonts.entries()) {
    const font = doc.context.lookup(ref)
    if (!font) continue
    const toUnicode = font.get(PDFName.of('ToUnicode'))
    if (toUnicode) {
      try {
        const stream = doc.context.lookup(toUnicode)
        const decoded = decodePDFRawStream(stream).decode()
        const cmapText = Buffer.from(decoded).toString('utf-8')
        fontMaps.set(name.toString(), parseCMap(cmapText))
      } catch { /* skip undecodable cmaps */ }
    }
  }

  return fontMaps
}

// ── Content stream tokenizer & parser ────────────────────────────────────────

/**
 * Decode a TJ array string like `[(text)kern<hex>kern(text2)]` into text.
 * Uses the CMap to decode hex sequences.
 */
function decodeTJArray(tjStr, cmap) {
  let text = ''
  const regex = /\(([^)]*)\)|<([0-9A-Fa-f]+)>/g
  let m
  while ((m = regex.exec(tjStr)) !== null) {
    if (m[1] !== undefined) {
      // Literal text in parens — handle escape sequences
      text += m[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\')
    } else if (m[2] !== undefined && cmap) {
      // Hex-encoded glyph IDs — decode via CMap
      const hex = m[2]
      for (let i = 0; i < hex.length; i += 4) {
        const code = parseInt(hex.substring(i, i + 4), 16)
        const ch = cmap.get(code)
        text += ch ?? `\uFFFD` // replacement char if unknown
      }
    }
  }
  return text
}

/**
 * Parse a single Tj operand `(text)` into text string.
 */
function decodeTjString(str, cmap) {
  if (str.startsWith('(') && str.endsWith(')')) {
    return str.slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\')
  }
  if (str.startsWith('<') && str.endsWith('>') && cmap) {
    const hex = str.slice(1, -1)
    let text = ''
    for (let i = 0; i < hex.length; i += 4) {
      const code = parseInt(hex.substring(i, i + 4), 16)
      text += cmap.get(code) ?? '\uFFFD'
    }
    return text
  }
  return str
}

/**
 * Parse a decoded content stream string into text items and drawing operations.
 */
function parseContentStream(streamText, fontMaps) {
  const textItems = []
  const drawingOps = []

  // State
  let currentFont = null
  let fontSize = 12
  let tmX = 0, tmY = 0
  let scaleX = 1, scaleY = 1
  let inText = false

  // Operand stack (simplified)
  const stack = []

  // Tokenize: split on whitespace but respect strings (...) and hex <...>
  const tokens = tokenize(streamText)

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]

    if (tok === 'BT') {
      inText = true
      tmX = 0; tmY = 0; scaleX = 1; scaleY = 1
      stack.length = 0
      continue
    }
    if (tok === 'ET') {
      inText = false
      stack.length = 0
      continue
    }

    if (inText) {
      if (tok === 'Tf') {
        // stack: [fontName, size]
        if (stack.length >= 2) {
          fontSize = parseFloat(stack[stack.length - 1]) || fontSize
          currentFont = stack[stack.length - 2]
        }
        stack.length = 0
        continue
      }

      if (tok === 'Tm') {
        // stack: [a, b, c, d, e, f] — text matrix
        if (stack.length >= 6) {
          const vals = stack.slice(-6).map(Number)
          scaleX = vals[0]
          scaleY = vals[3]
          tmX = vals[4]
          tmY = vals[5]
        }
        stack.length = 0
        continue
      }

      if (tok === 'Td' || tok === 'TD') {
        if (stack.length >= 2) {
          const tx = parseFloat(stack[stack.length - 2]) || 0
          const ty = parseFloat(stack[stack.length - 1]) || 0
          tmX += tx * scaleX
          tmY += ty * scaleY
        }
        stack.length = 0
        continue
      }

      if (tok === 'TJ') {
        // stack should contain the TJ array as a joined string
        const tjStr = stack.join(' ')
        const cmap = fontMaps.get(currentFont)
        const text = decodeTJArray(tjStr, cmap)
        const effectiveSize = fontSize * Math.abs(scaleY)
        if (text.trim()) {
          textItems.push({
            text,
            x: tmX,
            y: tmY,
            fontSize: effectiveSize,
            font: currentFont,
            estimatedWidth: text.length * effectiveSize * 0.5,
          })
        }
        stack.length = 0
        continue
      }

      if (tok === 'Tj') {
        if (stack.length >= 1) {
          const cmap = fontMaps.get(currentFont)
          const text = decodeTjString(stack[stack.length - 1], cmap)
          const effectiveSize = fontSize * Math.abs(scaleY)
          if (text.trim()) {
            textItems.push({
              text,
              x: tmX,
              y: tmY,
              fontSize: effectiveSize,
              font: currentFont,
              estimatedWidth: text.length * effectiveSize * 0.5,
            })
          }
        }
        stack.length = 0
        continue
      }

      // T* — move to next line
      if (tok === 'T*') {
        tmY -= fontSize * scaleY
        stack.length = 0
        continue
      }

      // Accumulate operands
      stack.push(tok)
      continue
    }

    // Outside text block — look for drawing ops
    if (tok === 're') {
      // stack: [x, y, w, h]
      if (stack.length >= 4) {
        const vals = stack.slice(-4).map(Number)
        drawingOps.push({
          type: 'rect',
          x: vals[0],
          y: vals[1],
          width: vals[2],
          height: vals[3],
        })
      }
      stack.length = 0
      continue
    }

    if (tok === 'l') {
      // lineto: stack has [x, y], need previous moveto
      if (stack.length >= 2) {
        const x2 = parseFloat(stack[stack.length - 2])
        const y2 = parseFloat(stack[stack.length - 1])
        drawingOps.push({ type: 'lineto', x: x2, y: y2 })
      }
      stack.length = 0
      continue
    }

    if (tok === 'm') {
      // moveto
      if (stack.length >= 2) {
        const x1 = parseFloat(stack[stack.length - 2])
        const y1 = parseFloat(stack[stack.length - 1])
        drawingOps.push({ type: 'moveto', x: x1, y: y1 })
      }
      stack.length = 0
      continue
    }

    if (tok === 'S' || tok === 's') {
      // Stroke — convert preceding moveto+lineto into a line
      const ops = drawingOps
      const linetoIdx = findLastIndex(ops, o => o.type === 'lineto')
      const movetoIdx = findLastIndex(ops, o => o.type === 'moveto')
      if (linetoIdx >= 0 && movetoIdx >= 0 && movetoIdx < linetoIdx) {
        const mt = ops[movetoIdx]
        const lt = ops[linetoIdx]
        // Replace with a proper line op
        ops.push({
          type: 'line',
          x1: mt.x, y1: mt.y,
          x2: lt.x, y2: lt.y,
        })
      }
      stack.length = 0
      continue
    }

    if (tok === 'f' || tok === 'F' || tok === 'f*') {
      // Fill — mark last rect as filled
      stack.length = 0
      continue
    }

    // Clear stack on graphic state ops that don't produce items we care about
    if (['q', 'Q', 'W', 'W*', 'n', 'cm', 'gs', 'g', 'G', 'rg', 'RG',
         'cs', 'CS', 'sc', 'SC', 'w', 'J', 'j', 'd', 'M', 'i',
         'Do', 'sh', 'BI', 'ID', 'EI', 'BDC', 'BMC', 'EMC', 'MP', 'DP'].includes(tok)) {
      stack.length = 0
      continue
    }

    // Accumulate as operand
    stack.push(tok)
  }

  return { textItems, drawingOps }
}

function findLastIndex(arr, pred) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (pred(arr[i])) return i
  }
  return -1
}

/**
 * Tokenize a PDF content stream. Handles:
 * - String literals: (...) with nesting and escapes
 * - Hex strings: <...>
 * - Array brackets: [ ]
 * - Regular tokens split by whitespace
 */
function tokenize(str) {
  const tokens = []
  let i = 0
  const len = str.length

  while (i < len) {
    // Skip whitespace
    if (/\s/.test(str[i])) { i++; continue }

    // Comment
    if (str[i] === '%') {
      while (i < len && str[i] !== '\n' && str[i] !== '\r') i++
      continue
    }

    // String literal (...)
    if (str[i] === '(') {
      let depth = 1
      let s = '('
      i++
      while (i < len && depth > 0) {
        if (str[i] === '\\') {
          s += str[i] + (str[i + 1] || '')
          i += 2
          continue
        }
        if (str[i] === '(') depth++
        if (str[i] === ')') depth--
        s += str[i]
        i++
      }
      tokens.push(s)
      continue
    }

    // Hex string <...>
    if (str[i] === '<' && str[i + 1] !== '<') {
      let s = '<'
      i++
      while (i < len && str[i] !== '>') {
        s += str[i]
        i++
      }
      if (i < len) { s += '>'; i++ }
      tokens.push(s)
      continue
    }

    // Array brackets
    if (str[i] === '[' || str[i] === ']') {
      tokens.push(str[i])
      i++
      continue
    }

    // Dict markers << >>
    if (str[i] === '<' && str[i + 1] === '<') {
      // Skip dict contents — we don't parse inline dicts
      let depth = 1
      i += 2
      while (i < len - 1 && depth > 0) {
        if (str[i] === '<' && str[i + 1] === '<') { depth++; i += 2; continue }
        if (str[i] === '>' && str[i + 1] === '>') { depth--; i += 2; continue }
        i++
      }
      continue
    }

    // Regular token (operator or number or name)
    let tok = ''
    while (i < len && !/[\s()[\]<>%]/.test(str[i])) {
      tok += str[i]
      i++
    }
    if (tok) tokens.push(tok)
  }

  return tokens
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse all pages of a PDF into text items and drawing operations.
 * @param {Buffer|Uint8Array} pdfBytes
 * @returns {Promise<Array<{ pageIndex: number, width: number, height: number, textItems: Array, drawingOps: Array }>>}
 */
export async function parsePdf(pdfBytes) {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  const pages = doc.getPages()
  const results = []

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const page = pages[pageIdx]
    const { width, height } = page.getSize()
    const fontMaps = extractFontMaps(doc, page)

    // Get content stream(s)
    const contents = page.node.Contents()
    if (!contents) {
      results.push({ pageIndex: pageIdx, width, height, textItems: [], drawingOps: [] })
      continue
    }

    let streams = []
    if (contents instanceof PDFArray) {
      for (let i = 0; i < contents.size(); i++) {
        streams.push(doc.context.lookup(contents.get(i)))
      }
    } else {
      streams.push(contents)
    }

    // Concatenate all streams for the page
    let fullText = ''
    for (const stream of streams) {
      try {
        const decoded = decodePDFRawStream(stream).decode()
        fullText += Buffer.from(decoded).toString('latin1') + '\n'
      } catch { /* skip undecoded streams */ }
    }

    const { textItems, drawingOps } = parseContentStream(fullText, fontMaps)
    results.push({ pageIndex: pageIdx, width, height, textItems, drawingOps })
  }

  return results
}
