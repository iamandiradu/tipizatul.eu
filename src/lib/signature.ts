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

// Glue a height-multiplier onto an existing data URL. Replaces any prior
// `#h=…` fragment so callers can re-emit without leaking old sizes.
export function encodeSignatureValue(dataUrl: string, heightMultiplier?: number): string {
  const base = dataUrl.replace(/#.*$/, '')
  if (heightMultiplier === undefined || !Number.isFinite(heightMultiplier)) return base
  return `${base}#h=${heightMultiplier}`
}

// Decode a data-URL into the raw bytes pdf-lib needs for embedJpg / embedPng
// plus the optional per-signature height multiplier. Returns null on
// malformed input rather than throwing — the fill loop should skip a
// corrupted signature, not abort the whole PDF.
export function decodeSignatureValue(
  value: string,
): { kind: 'png' | 'jpg'; bytes: Uint8Array; heightMultiplier?: number } | null {
  // Split fragment off first so the regex below doesn't have to tolerate it.
  const hashIdx = value.indexOf('#')
  const head = hashIdx >= 0 ? value.slice(0, hashIdx) : value
  const tail = hashIdx >= 0 ? value.slice(hashIdx + 1) : ''
  const m = /^data:image\/(png|jpe?g);base64,(.+)$/.exec(head)
  if (!m) return null
  const kind = m[1].startsWith('jp') ? 'jpg' : 'png'
  let heightMultiplier: number | undefined
  if (tail) {
    const hm = /(?:^|&)h=([0-9]+(?:\.[0-9]+)?)/.exec(tail)
    if (hm) {
      const n = Number.parseFloat(hm[1])
      if (Number.isFinite(n) && n > 0) heightMultiplier = n
    }
  }
  try {
    const binary = atob(m[2])
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return { kind, bytes, heightMultiplier }
  } catch {
    return null
  }
}
