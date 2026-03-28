import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { FormValues } from '@/types/template'

interface FormDraft {
  templateId: string
  values: FormValues
}

interface SessionState {
  // Admin Google Drive access token (from OAuth sign-in, expires in ~1h)
  driveAccessToken: string | null
  // Current form fill progress — persists across page navigation within the tab
  formDraft: FormDraft | null
  setDriveAccessToken: (token: string | null) => void
  setFormDraft: (draft: FormDraft | null) => void
  clearSession: () => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      driveAccessToken: null,
      formDraft: null,
      setDriveAccessToken: (token) => set({ driveAccessToken: token }),
      setFormDraft: (draft) => set({ formDraft: draft }),
      clearSession: () => set({ driveAccessToken: null, formDraft: null }),
    }),
    {
      name: 'tipizatul-session',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
