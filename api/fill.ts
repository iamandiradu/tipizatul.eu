import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Vercel SSR for /fill/:id — injects per-template meta tags and JSON-LD into
// the SPA shell so search engines and social previews see real content
// instead of the loading state. The hydrated SPA replaces these afterwards
// with the same values, so users see exactly the same UI.

interface SlimTemplate {
  id: string
  name: string
  description?: string
  organization?: string
  county?: string
  archived?: boolean
}

const SITE = 'https://tipizatul.eu'

// ── HTML template (read once, cached) ────────────────────────────────────────

let _indexHtml: string | null = null
function indexHtml(): string {
  if (_indexHtml) return _indexHtml
  const candidates = [
    join(process.cwd(), 'dist', 'index.html'),
    join(process.cwd(), 'index.html'),
  ]
  for (const p of candidates) {
    try {
      _indexHtml = readFileSync(p, 'utf-8')
      return _indexHtml
    } catch {
      /* try next */
    }
  }
  throw new Error('index.html not found in dist/ or project root')
}

// ── Slim catalog map (read once per warm container, 5 min TTL) ───────────────

let _slimMap: Map<string, SlimTemplate> | null = null
let _slimMapAt = 0
const SLIM_TTL_MS = 5 * 60 * 1000

function parseCredentials(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw) } catch {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'))
  }
}

async function getSlimMap(): Promise<Map<string, SlimTemplate>> {
  if (_slimMap && Date.now() - _slimMapAt < SLIM_TTL_MS) return _slimMap

  if (!getApps().length) {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not set')
    initializeApp({ credential: cert(parseCredentials(raw) as Parameters<typeof cert>[0]) })
  }
  const db = getFirestore()
  const snap = await db.collection('catalog').doc('index').get()
  if (!snap.exists) {
    if (_slimMap) return _slimMap
    return new Map()
  }
  const data = snap.data() as { encoding?: string; templates?: SlimTemplate[]; compressed?: unknown }

  let templates: SlimTemplate[]
  if (data.encoding === 'gzip+json' && data.compressed) {
    const blob = data.compressed as { toUint8Array?: () => Uint8Array } | Buffer | Uint8Array
    let bytes: Buffer
    if (blob && typeof (blob as { toUint8Array?: () => Uint8Array }).toUint8Array === 'function') {
      bytes = Buffer.from((blob as { toUint8Array: () => Uint8Array }).toUint8Array())
    } else if (Buffer.isBuffer(blob)) {
      bytes = blob
    } else {
      bytes = Buffer.from(blob as Uint8Array)
    }
    templates = JSON.parse(gunzipSync(bytes).toString('utf-8'))
  } else {
    templates = data.templates ?? []
  }

  _slimMap = new Map(templates.map((t) => [t.id, t]))
  _slimMapAt = Date.now()
  return _slimMap
}

// ── Meta injection ───────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function injectMeta(html: string, t: SlimTemplate, id: string): string {
  const title = `${t.name}${t.organization ? ' — ' + t.organization : ''} | Tipizatul.eu`
  const description = `Completați online formularul „${t.name}"${
    t.organization ? ` emis de ${t.organization}` : ''
  }${t.county ? ` (${t.county})` : ''}. Descărcați PDF-ul gata de imprimat sau de transmis prin canalele oficiale.`
  const canonical = `${SITE}/fill/${id}`

  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'DigitalDocument',
    name: t.name,
    description,
    inLanguage: 'ro',
    isAccessibleForFree: true,
    fileFormat: 'application/pdf',
    url: canonical,
  }
  if (t.organization) ld.publisher = { '@type': 'GovernmentOrganization', name: t.organization }
  if (t.county) ld.spatialCoverage = { '@type': 'AdministrativeArea', name: t.county }

  const eTitle = escapeHtml(title)
  const eDesc = escapeHtml(description)

  // The JSON-LD `</` sequence (e.g. inside a description) must be escaped to
  // avoid prematurely closing the inline <script>.
  const ldJson = JSON.stringify(ld).replace(/<\/script>/gi, '<\\/script>')

  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${eTitle}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${eDesc}" />`)
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${eTitle}" />`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${eDesc}" />`)
    .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${eTitle}" />`)
    .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${eDesc}" />`)
    .replace('</head>', `    <script type="application/ld+json" data-ssr>${ldJson}</script>\n  </head>`)
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : undefined
  const html = indexHtml()

  if (!id) {
    res.status(200).setHeader('content-type', 'text/html; charset=utf-8').send(html)
    return
  }

  let template: SlimTemplate | undefined
  try {
    const map = await getSlimMap()
    template = map.get(id)
  } catch (err) {
    console.error('[fill ssr] catalog fetch failed, falling back to plain shell:', err)
  }

  if (template && !template.archived) {
    const customized = injectMeta(html, template, id)
    res
      .status(200)
      .setHeader('content-type', 'text/html; charset=utf-8')
      .setHeader('cache-control', 'public, s-maxage=3600, stale-while-revalidate=86400')
      .send(customized)
    return
  }

  // Unknown id or archived — keep the SPA's 404 UX but tell crawlers not to
  // index this URL.
  const noindexed = html.replace(
    /<meta name="robots"[^>]*>/,
    '<meta name="robots" content="noindex,follow" />',
  )
  res
    .status(template?.archived ? 410 : 404)
    .setHeader('content-type', 'text/html; charset=utf-8')
    .send(noindexed)
}
