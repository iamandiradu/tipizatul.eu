import { getAuth, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, onAuthStateChanged, type User } from 'firebase/auth'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import { useState, useEffect } from 'react'
import { firebaseApp } from '@/lib/firebase'
import { useSessionStore } from '@/stores/sessionStore'

export const auth = getAuth(firebaseApp)
export const db = getFirestore(firebaseApp)

const googleProvider = new GoogleAuthProvider()
// Request Drive scope so the admin can upload PDFs directly from the app
googleProvider.addScope('https://www.googleapis.com/auth/drive.file')

export async function signInAsAdmin(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider)

  // Verify admin allowlist
  const adminDoc = await getDoc(doc(db, 'admins', result.user.email ?? ''))
  if (!adminDoc.exists()) {
    await firebaseSignOut(auth)
    throw new Error('Adresa de email nu este autorizată.')
  }

  // Store the OAuth access token for Drive API calls (expires in ~1h)
  const credential = GoogleAuthProvider.credentialFromResult(result)
  if (credential?.accessToken) {
    useSessionStore.getState().setDriveAccessToken(credential.accessToken)
  }

  return result.user
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
  useSessionStore.getState().clearSession()
}

export function useAdminAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setLoading(false)
        return
      }
      // Re-verify against Firestore on every auth state change
      const adminDoc = await getDoc(doc(db, 'admins', firebaseUser.email ?? ''))
      if (adminDoc.exists()) {
        setUser(firebaseUser)
      } else {
        await firebaseSignOut(auth)
        setUser(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return { user, loading }
}
