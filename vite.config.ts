import { config as dotenvConfig } from 'dotenv'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// Load .env.local into process.env so non-VITE_ vars are available
dotenvConfig({ path: '.env.local' })

function driveProxyPlugin(): Plugin {
  return {
    name: 'drive-pdf-proxy',
    configureServer(server) {
      server.middlewares.use('/api/pdf', async (req, res) => {
        const url = new URL(req.url ?? '', 'http://localhost')
        const fileId = url.searchParams.get('fileId')
        if (!fileId) {
          res.statusCode = 400
          res.end('fileId required')
          return
        }

        try {
          const { GoogleAuth } = await import('google-auth-library')
          const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY

          if (!raw) { res.statusCode = 500; res.end('GOOGLE_SERVICE_ACCOUNT_KEY not set'); return }
          let credentials: Record<string, unknown>
          try { credentials = JSON.parse(raw) } catch { credentials = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) }
          const auth = new GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
          })
          const client = await auth.getClient()
          const token = await client.getAccessToken()

          const driveRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
            { headers: { Authorization: `Bearer ${token.token}` } },
          )

          if (!driveRes.ok) {
            const body = await driveRes.text().catch(() => '')
            res.statusCode = driveRes.status
            res.end(`Drive error ${driveRes.status}: ${body}`)
            return
          }

          const buffer = Buffer.from(await driveRes.arrayBuffer())
          res.setHeader('Content-Type', 'application/pdf')
          res.end(buffer)
        } catch (err) {
          console.error('PDF proxy error:', err)
          res.statusCode = 500
          res.end('Failed to fetch PDF')
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    driveProxyPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
