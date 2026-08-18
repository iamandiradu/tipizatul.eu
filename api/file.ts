import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GoogleAuth } from 'google-auth-library'

// Serves a mirrored eDirect document out of our Drive. api/pdf.ts is the
// narrow sibling of this route: it always claims application/pdf because every
// template PDF is one. Mirrored source documents are not — roughly 60% of what
// institutions publish is .doc/.docx/.xlsx/.rtf — so this route asks Drive what
// the file actually is and passes that through, along with a filename so the
// browser saves "cerere.docx" rather than a bare file id.

let authClient: Awaited<ReturnType<GoogleAuth['getClient']>> | null = null

function parseCredentials(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw)
  } catch {
    // Treat as base64-encoded JSON
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'))
  }
}

async function getAuthClient() {
  if (authClient) return authClient
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured')
  const auth = new GoogleAuth({
    credentials: parseCredentials(raw),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })
  authClient = await auth.getClient()
  return authClient
}

// Drive returns a Google-controlled name and MIME, but both land in response
// headers, so neither is trusted verbatim. Strip anything that could terminate
// the header or smuggle a path.
function sanitizeFileName(name: string): string {
  const cleaned = name
    .replace(/[\r\n"\\]/g, '')
    .replace(/[/\\]/g, '_')
    .trim()
    .slice(0, 150)
  return cleaned || 'document'
}

// Serving arbitrary Drive-reported MIME types would let an uploaded .html be
// rendered in our origin. Only the document types eDirect actually publishes
// pass through; anything else downloads as an opaque blob.
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/rtf',
  'application/vnd.oasis.opendocument.text',
  'text/plain',
  'image/jpeg',
  'image/png',
  'application/zip',
])

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { fileId } = req.query
  if (!fileId || typeof fileId !== 'string') {
    return res.status(400).end('fileId required')
  }

  try {
    const client = await getAuthClient()
    const token = await client.getAccessToken()
    const authHeader = { Authorization: `Bearer ${token.token}` }
    const encodedId = encodeURIComponent(fileId)

    // Metadata first: the authoritative name/MIME. Taking these from the query
    // string instead would let a crafted link mislabel any file we host.
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodedId}?fields=name,mimeType,size`,
      { headers: authHeader },
    )
    if (!metaRes.ok) {
      const body = await metaRes.text().catch(() => '')
      return res.status(metaRes.status).end(`Drive metadata error ${metaRes.status}: ${body}`)
    }
    const meta = (await metaRes.json()) as { name?: string; mimeType?: string; size?: string }

    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodedId}?alt=media`,
      { headers: authHeader },
    )
    if (!driveRes.ok) {
      const body = await driveRes.text().catch(() => '')
      return res.status(driveRes.status).end(`Drive error ${driveRes.status}: ${body}`)
    }

    const mime =
      meta.mimeType && ALLOWED_MIME.has(meta.mimeType)
        ? meta.mimeType
        : 'application/octet-stream'
    const fileName = sanitizeFileName(meta.name ?? 'document')

    const buffer = await driveRes.arrayBuffer()
    res.setHeader('Content-Type', mime)
    // `attachment` for everything except PDFs, which are worth previewing in
    // the browser's own viewer the way the eDirect links did.
    const disposition = mime === 'application/pdf' ? 'inline' : 'attachment'
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    )
    // Mirrored files are immutable — a corrected source becomes a new upload.
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable')
    res.send(Buffer.from(buffer))
  } catch (err) {
    console.error('File proxy error:', err)
    return res.status(500).end('Failed to fetch file from Drive')
  }
}
