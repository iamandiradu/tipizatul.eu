#!/usr/bin/env node
/**
 * inspect-catalog-index.mjs — print what's actually inside the slim
 * `catalog/index` doc. Use to verify the homepage count source after a rebuild.
 */

import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { config as loadDotenv } from 'dotenv'
import admin from 'firebase-admin'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadDotenv({ path: resolve(__dirname, '../../.env.local') })
loadDotenv({ path: resolve(__dirname, '../../.env') })

function parseServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY env var not set')
  try { return JSON.parse(raw) } catch {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'))
  }
}

async function main() {
  const credentials = parseServiceAccount()
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(credentials),
      projectId: credentials.project_id || process.env.FIREBASE_PROJECT_ID,
    })
  }
  const db = admin.firestore()
  const snap = await db.collection('catalog').doc('index').get()
  console.log(`snap.exists: ${snap.exists}`)
  if (!snap.exists) return
  const data = snap.data()
  console.log(`fields: ${Object.keys(data).join(', ')}`)
  console.log(`encoding: ${data.encoding}`)
  console.log(`count field: ${data.count}`)
  console.log(`generatedAt: ${data.generatedAt}`)

  let templates
  if (data.encoding === 'gzip+json') {
    const blob = data.compressed
    let bytes
    if (blob && typeof blob.toUint8Array === 'function') {
      bytes = blob.toUint8Array()
    } else if (Buffer.isBuffer(blob)) {
      bytes = blob
    } else {
      bytes = Buffer.from(blob)
    }
    console.log(`compressed bytes: ${bytes.length}`)
    const json = gunzipSync(Buffer.from(bytes)).toString('utf-8')
    templates = JSON.parse(json)
  } else {
    templates = data.templates ?? []
  }

  const total = templates.length
  const active = templates.filter((t) => !t.archived).length
  console.log(`templates: ${total} total, ${active} active`)
  if (total > 0) {
    console.log(`first: ${JSON.stringify(templates[0])}`)
    console.log(`last:  ${JSON.stringify(templates[total - 1])}`)
  }
}

main().catch((err) => {
  process.stderr.write(`fatal: ${err?.stack || err}\n`)
  process.exit(1)
})
