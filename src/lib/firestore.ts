import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
  Bytes,
} from 'firebase/firestore'
import { firestoreDb } from '@/lib/firebase'
import type { Template, SlimTemplate } from '@/types/template'

export { firestoreDb }

const TEMPLATES = 'templates'
const CATALOG_INDEX_DOC = 'catalog/index'

// ── Catalog cache (localStorage, stale-while-revalidate) ─────────────────────
//
// The slim aggregate is ~500KB compressed. We cache its decompressed form in
// localStorage so repeat visits show the catalog instantly. Anything fresher
// than CATALOG_FRESH_MS skips the network entirely; older caches are returned
// immediately while a background refetch updates the store for next time.
//
// Bump CATALOG_CACHE_VERSION whenever the SlimTemplate shape changes — old
// entries from previous deploys are then ignored instead of crashing the page.

const CATALOG_CACHE_KEY = 'tipizatul:catalog:v1'
const CATALOG_CACHE_VERSION = 1
const CATALOG_FRESH_MS = 5 * 60 * 1000 // 5 minutes

interface CachedCatalog {
  version: number
  cachedAt: number
  generatedAt: string
  templates: SlimTemplate[]
}

function readCatalogCache(): CachedCatalog | null {
  try {
    const raw = localStorage.getItem(CATALOG_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedCatalog
    if (parsed?.version !== CATALOG_CACHE_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

function writeCatalogCache(c: CachedCatalog) {
  try {
    localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(c))
  } catch {
    // Quota exceeded or storage disabled — degrade silently.
  }
}

export function invalidateCatalogCache(): void {
  try { localStorage.removeItem(CATALOG_CACHE_KEY) } catch { /* ignore */ }
}

let _backgroundRevalidate: Promise<void> | null = null

async function fetchCatalogFromServer(): Promise<SlimTemplate[]> {
  const [collectionId, docId] = CATALOG_INDEX_DOC.split('/')
  const snap = await getDoc(doc(firestoreDb, collectionId, docId))
  if (!snap.exists()) return []
  const data = snap.data()

  let templates: SlimTemplate[]
  if (data.encoding === 'gzip+json') {
    const compressed = (data.compressed as Bytes).toUint8Array()
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))
    const json = await new Response(stream).text()
    templates = JSON.parse(json) as SlimTemplate[]
  } else {
    templates = (data.templates as SlimTemplate[] | undefined) ?? []
  }

  writeCatalogCache({
    version: CATALOG_CACHE_VERSION,
    cachedAt: Date.now(),
    generatedAt: data.generatedAt || '',
    templates,
  })
  return templates
}

// One Firestore read regardless of catalog size, and zero on a fresh cache
// hit. Stale cache is served immediately while a single background refetch
// populates the cache for the next call.
export async function fetchCatalog(): Promise<SlimTemplate[]> {
  const cached = readCatalogCache()
  const isFresh = cached && Date.now() - cached.cachedAt < CATALOG_FRESH_MS

  if (cached && isFresh) {
    return cached.templates
  }

  if (cached) {
    if (!_backgroundRevalidate) {
      _backgroundRevalidate = fetchCatalogFromServer()
        .catch(() => { /* keep existing cache on error */ })
        .finally(() => { _backgroundRevalidate = null }) as Promise<void>
    }
    return cached.templates
  }

  return fetchCatalogFromServer()
}

// ── Per-template cache (in-memory, session-only) ─────────────────────────────

const _templateCache = new Map<string, Template>()

export async function fetchTemplate(id: string): Promise<Template | null> {
  const cached = _templateCache.get(id)
  if (cached) return cached
  const snap = await getDoc(doc(firestoreDb, TEMPLATES, id))
  if (!snap.exists()) return null
  const t = snap.data() as Template
  _templateCache.set(id, t)
  return t
}

export function invalidateTemplateCache(id?: string): void {
  if (id) _templateCache.delete(id)
  else _templateCache.clear()
}

// ── Templates collection ────────────────────────────────────────────────────

export async function fetchAllTemplates(): Promise<Template[]> {
  const q = query(collection(firestoreDb, TEMPLATES), orderBy('name'))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => d.data() as Template)
    .filter((t) => !t.archived)
}

export async function saveTemplate(template: Template): Promise<void> {
  // Firestore rejects `undefined` values — JSON round-trip strips them cleanly
  const data = JSON.parse(JSON.stringify(template)) as Template
  await setDoc(doc(firestoreDb, TEMPLATES, template.id), data)
  _templateCache.set(template.id, template)
  invalidateCatalogCache()
}

export async function patchTemplate(id: string, patch: Partial<Template>): Promise<void> {
  await setDoc(doc(firestoreDb, TEMPLATES, id), patch, { merge: true })
  invalidateTemplateCache(id)
  invalidateCatalogCache()
}

// ── Proposals ───────────────────────────────────────────────────────────────

export async function submitProposal(title: string, description: string): Promise<void> {
  await addDoc(collection(firestoreDb, 'proposals'), {
    title,
    description,
    createdAt: serverTimestamp(),
  })
}
