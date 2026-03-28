import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAdminAuth } from '@/lib/auth'

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAdminAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Se verifică autentificarea...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}
