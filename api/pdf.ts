import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GoogleAuth } from 'google-auth-library'

let authClient: Awaited<ReturnType<GoogleAuth['getClient']>> | null = null

async function getAuthClient() {
  if (authClient) return authClient

  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY ?? '{}')
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })
  authClient = await auth.getClient()
  return authClient
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { fileId } = req.query
  if (!fileId || typeof fileId !== 'string') {
    return res.status(400).end('fileId required')
  }

  try {
    const client = await getAuthClient()
    const token = await client.getAccessToken()

    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
      { headers: { Authorization: `Bearer ${token.token}` } },
    )

    if (!driveRes.ok) {
      const body = await driveRes.text().catch(() => '')
      return res.status(driveRes.status).end(`Drive error ${driveRes.status}: ${body}`)
    }

    const buffer = await driveRes.arrayBuffer()
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.send(Buffer.from(buffer))
  } catch (err) {
    console.error('PDF proxy error:', err)
    return res.status(500).end('Failed to fetch PDF from Drive')
  }
}
