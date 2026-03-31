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
} from 'firebase/firestore'
import { firebaseApp } from '@/lib/firebase'
import type { Template } from '@/types/template'

export const firestoreDb = getFirestore(firebaseApp)

const TEMPLATES = 'templates'

export async function fetchAllTemplates(): Promise<Template[]> {
  const q = query(collection(firestoreDb, TEMPLATES), orderBy('name'))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => d.data() as Template)
    .filter((t) => !t.archived)
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
