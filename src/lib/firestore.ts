import {
  getFirestore,
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
import { firebaseApp } from '@/lib/firebase'
import type { Template, SlimTemplate } from '@/types/template'

export const firestoreDb = getFirestore(firebaseApp)

const TEMPLATES = 'templates'
const CATALOG_INDEX_DOC = 'catalog/index'

export async function fetchAllTemplates(): Promise<Template[]> {
  const q = query(collection(firestoreDb, TEMPLATES), orderBy('name'))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => d.data() as Template)
    .filter((t) => !t.archived)
}

// Read the slim aggregate. One Firestore read regardless of catalog size.
// Handles both inline (`encoding: 'json'`) and gzipped (`encoding: 'gzip+json'`)
// payloads — see scripts/edirect/build-catalog-index.mjs.
export async function fetchCatalog(): Promise<SlimTemplate[]> {
  const [collectionId, docId] = CATALOG_INDEX_DOC.split('/')
  const snap = await getDoc(doc(firestoreDb, collectionId, docId))
  if (!snap.exists()) return []
  const data = snap.data()
  if (data.encoding === 'gzip+json') {
    const compressed = (data.compressed as Bytes).toUint8Array()
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))
    const json = await new Response(stream).text()
    return JSON.parse(json) as SlimTemplate[]
  }
  return (data.templates as SlimTemplate[] | undefined) ?? []
}

export async function fetchTemplate(id: string): Promise<Template | null> {
  const snap = await getDoc(doc(firestoreDb, TEMPLATES, id))
  return snap.exists() ? (snap.data() as Template) : null
}

export async function saveTemplate(template: Template): Promise<void> {
  // Firestore rejects `undefined` values — JSON round-trip strips them cleanly
  const data = JSON.parse(JSON.stringify(template)) as Template
  await setDoc(doc(firestoreDb, TEMPLATES, template.id), data)
}

export async function patchTemplate(id: string, patch: Partial<Template>): Promise<void> {
  await setDoc(doc(firestoreDb, TEMPLATES, id), patch, { merge: true })
}

// ── Proposals ───────────────────────────────────────────────────────────────

export async function submitProposal(title: string, description: string): Promise<void> {
  await addDoc(collection(firestoreDb, 'proposals'), {
    title,
    description,
    createdAt: serverTimestamp(),
  })
}
