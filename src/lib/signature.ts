import type { TemplateField } from '@/types/template'

// Romanian admin forms label signature slots in a handful of ways
// (`Semnătura`, `semnătură`, `Semnaturi`, mixed-case + sometimes mis-spelled
// without the diacritic). The detector emits these as plain text fields, so
// we sniff the label at render-time and swap the UI without touching the
// stored schema. Punctuation and parenthetical embellishments
// (`(semnătura)`, `,Semnătura`) all collapse into the same match.
//
// Deliberately permissive on Unicode: NFD + diacritic-strip lets a single
// regex catch both `ă` and `a` forms (`semnatur` covers either after NFD).
const SIGNATURE_LABEL_RE = /\bsemn[aă]tur/i

function diacriticless(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function isSignatureField(field: Pick<TemplateField, 'type' | 'label'>): boolean {
  if (field.type !== 'text') return false
  if (!field.label) return false
  return SIGNATURE_LABEL_RE.test(diacriticless(field.label))
}

// Values flow through react-hook-form as plain strings; signature values are
// encoded as `data:image/png;base64,...` URLs (also accepting JPEG when the
// user uploads one). The user-chosen render size travels in the URL's
// fragment (`#h=<multiplier>`) — fragments aren't part of the base64
// payload, so atob() is unaffected and persistence stays a single string.
const SIGNATURE_VALUE_RE = /^data:image\/(png|jpe?g);base64,/

export function isSignatureValue(value: unknown): value is string {
  return typeof value === 'string' && SIGNATURE_VALUE_RE.test(value)
}

// Explicit override of where the signature should land, in PDF user-space
// (origin bottom-left). When present, pdf-fill uses these coordinates
// directly and ignores the field's widget rect. When absent, the legacy
// label-anchored flow takes over (widget rect + height multiplier).
export interface SignaturePlacement {
  pageIndex: number
  x: number
  y: number
  width: number
  height: number
}

// Glue size and/or placement onto an existing data URL. Replaces any prior
// fragment so callers can re-emit without leaking stale state.
export function encodeSignatureValue(
  dataUrl: string,
  opts: { heightMultiplier?: number; placement?: SignaturePlacement } = {},
): string {
  const base = dataUrl.replace(/#.*$/, '')
  const parts: string[] = []
  if (opts.heightMultiplier !== undefined && Number.isFinite(opts.heightMultiplier)) {
    parts.push(`h=${opts.heightMultiplier}`)
  }
  const p = opts.placement
  if (p && Number.isFinite(p.pageIndex) && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.width) && Number.isFinite(p.height)) {
    parts.push(
      `pi=${p.pageIndex}`,
      `px=${trim(p.x)}`,
      `py=${trim(p.y)}`,
      `pw=${trim(p.width)}`,
      `ph=${trim(p.height)}`,
    )
  }
  return parts.length ? `${base}#${parts.join('&')}` : base
}

function trim(n: number): string {
  // 2 decimals is enough for PDF user-space — sub-point precision is invisible
  // and keeps fragment URLs short.
  return Number.parseFloat(n.toFixed(2)).toString()
}

// Decode a data-URL into the raw bytes pdf-lib needs for embedJpg / embedPng
// plus optional per-signature size + placement. Returns null on malformed
// input rather than throwing — the fill loop should skip a corrupted
// signature, not abort the whole PDF.
export function decodeSignatureValue(
  value: string,
): {
  kind: 'png' | 'jpg'
  bytes: Uint8Array
  heightMultiplier?: number
  placement?: SignaturePlacement
} | null {
  // Split fragment off first so the regex below doesn't have to tolerate it.
  const hashIdx = value.indexOf('#')
  const head = hashIdx >= 0 ? value.slice(0, hashIdx) : value
  const tail = hashIdx >= 0 ? value.slice(hashIdx + 1) : ''
  const m = /^data:image\/(png|jpe?g);base64,(.+)$/.exec(head)
  if (!m) return null
  const kind = m[1].startsWith('jp') ? 'jpg' : 'png'

  let heightMultiplier: number | undefined
  let placement: SignaturePlacement | undefined
  if (tail) {
    const params = new Map<string, number>()
    for (const part of tail.split('&')) {
      const eq = part.indexOf('=')
      if (eq < 0) continue
      const n = Number.parseFloat(part.slice(eq + 1))
      if (Number.isFinite(n)) params.set(part.slice(0, eq), n)
    }
    const h = params.get('h')
    if (h !== undefined && h > 0) heightMultiplier = h
    const pi = params.get('pi')
    const px = params.get('px')
    const py = params.get('py')
    const pw = params.get('pw')
    const ph = params.get('ph')
    if (pi !== undefined && px !== undefined && py !== undefined && pw !== undefined && ph !== undefined && pw > 0 && ph > 0) {
      placement = { pageIndex: Math.max(0, Math.round(pi)), x: px, y: py, width: pw, height: ph }
    }
  }

  try {
    const binary = atob(m[2])
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return { kind, bytes, heightMultiplier, placement }
  } catch {
    return null
  }
}
