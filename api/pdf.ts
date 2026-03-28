import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { fileId } = req.query
  if (!fileId || typeof fileId !== 'string') {
    return res.status(400).end('fileId required')
  }

  const apiKey = process.env.GOOGLE_DRIVE_API_KEY
  if (!apiKey) {
    return res.status(500).end('Drive API key not configured')
  }

  const driveRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${apiKey}`,
  )

  if (!driveRes.ok) {
    return res.status(driveRes.status).end(`Drive error: ${driveRes.statusText}`)
  }

  const buffer = await driveRes.arrayBuffer()
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.send(Buffer.from(buffer))
}
