import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'
import { firestoreDb } from '@/lib/firebase'
import type { Template, Vote, VoteCount, VoteValue } from '@/types/template'

const TEMPLATES = 'templates'
const VOTES = 'votes'
const DEVICE_ID_KEY = 'tipizatul:deviceId'
const COMMENT_MAX = 1000

// One UUID per browser, persisted in localStorage. Used as the doc id of the
// vote sub-document so the rules can pin "one vote per device per template".
export function getDeviceId(): string {
  if (typeof window === 'undefined') return ''
  let id = window.localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = uuidv4()
    window.localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

function voteRef(templateId: string, deviceId: string) {
  return doc(firestoreDb, TEMPLATES, templateId, VOTES, deviceId)
}

function templateRef(templateId: string) {
  return doc(firestoreDb, TEMPLATES, templateId)
}

function normalizeComment(input: string | null | undefined): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null
  return trimmed.slice(0, COMMENT_MAX)
}

export async function fetchUserVote(templateId: string, deviceId: string): Promise<Vote | null> {
  if (!deviceId) return null
  const snap = await getDoc(voteRef(templateId, deviceId))
  if (!snap.exists()) return null
  return snap.data() as Vote
}

// Submit (or change) a vote in a single transaction so the denormalized
// counters on the template doc stay in sync with the sub-collection.
export async function submitVote({
  templateId,
  deviceId,
  value,
  comment,
}: {
  templateId: string
  deviceId: string
  value: VoteValue
  comment?: string | null
}): Promise<void> {
  if (!deviceId) throw new Error('Vot anonim necesită deviceId.')
  if (value !== 1 && value !== -1) throw new Error('Voturile pot fi doar +1 sau -1.')

  const cleanedComment = normalizeComment(comment)
  const tRef = templateRef(templateId)
  const vRef = voteRef(templateId, deviceId)

  await runTransaction(firestoreDb, async (tx) => {
    const [voteSnap, templateSnap] = await Promise.all([tx.get(vRef), tx.get(tRef)])
    if (!templateSnap.exists()) throw new Error('Formularul nu mai există.')

    const prior = voteSnap.exists() ? (voteSnap.data() as Vote) : null
    const existingCounts: VoteCount = (templateSnap.data().voteCount as VoteCount | undefined) ?? {
      up: 0,
      down: 0,
    }

    let up = existingCounts.up ?? 0
    let down = existingCounts.down ?? 0

    if (!prior) {
      if (value === 1) up += 1
      else down += 1
    } else if (prior.value !== value) {
      if (prior.value === 1) up = Math.max(0, up - 1)
      else down = Math.max(0, down - 1)
      if (value === 1) up += 1
      else down += 1
    }
    // Same value as prior: counters unchanged, just update comment/timestamp.

    const nowIso = new Date().toISOString()
    const votePayload: Vote = {
      deviceId,
      value,
      createdAt: prior?.createdAt ?? nowIso,
      updatedAt: nowIso,
      ...(cleanedComment !== null ? { comment: cleanedComment } : {}),
    }

    tx.set(vRef, votePayload)
    tx.update(tRef, {
      voteCount: { up, down, lastVoteAt: serverTimestamp() },
    })
  })
}

// Admin: pull templates with at least one downvote, ordered by downvote count
// descending. The query needs a Firestore composite index on
// (voteCount.down DESC) — Firestore will print a console URL on first run if
// it's missing. `voteCount.down > 0` filters out the long tail of unvoted docs.
export async function fetchMostDownvotedTemplates(limit = 100): Promise<Template[]> {
  const q = query(
    collection(firestoreDb, TEMPLATES),
    where('voteCount.down', '>', 0),
    orderBy('voteCount.down', 'desc'),
    fsLimit(limit),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as Template)
}

export interface AdminVote extends Vote {
  // The vote doc only stores ISO strings on createdAt/updatedAt for the public
  // path, but the admin read may surface a Firestore Timestamp. Either way,
  // toIsoString below normalizes for the UI.
  createdAtIso: string
  updatedAtIso: string
}

export async function fetchVotesForTemplate(templateId: string): Promise<AdminVote[]> {
  const q = query(
    collection(firestoreDb, TEMPLATES, templateId, VOTES),
    orderBy('updatedAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const v = d.data() as Vote
    return {
      ...v,
      createdAtIso: toIsoString(v.createdAt),
      updatedAtIso: toIsoString(v.updatedAt),
    }
  })
}

function toIsoString(input: unknown): string {
  if (!input) return ''
  if (input instanceof Timestamp) return input.toDate().toISOString()
  if (typeof input === 'string') return input
  if (typeof input === 'object' && input !== null && 'seconds' in (input as Record<string, unknown>)) {
    const seconds = Number((input as { seconds?: number }).seconds ?? 0)
    return new Date(seconds * 1000).toISOString()
  }
  return ''
}
