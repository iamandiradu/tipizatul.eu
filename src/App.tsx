import { createBrowserRouter, RouterProvider, Outlet, NavLink, Link } from 'react-router-dom'
import { lazy, Suspense, useState } from 'react'
import { Moon, Sun, Lightbulb } from 'lucide-react'
import { useDarkMode } from '@/lib/useDarkMode'
import ProposalWidget from '@/components/ProposalWidget'

const CatalogPage = lazy(() => import('@/pages/CatalogPage'))
const FillPage = lazy(() => import('@/pages/FillPage'))
const AdminLoginPage = lazy(() => import('@/pages/AdminLoginPage'))
const AdminPage = lazy(() => import('@/pages/AdminPage'))
const RequireAdmin = lazy(() => import('@/components/RequireAdmin'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const ErrorPage = lazy(() => import('@/pages/ErrorPage'))

function AppShell({ showBackLink }: { showBackLink?: boolean }) {
  const { dark, toggle } = useDarkMode()
  const [proposalOpen, setProposalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {showBackLink ? (
            <Link to="/" className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
              tipizatul.eu
            </Link>
          ) : (
            <NavLink to="/" className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
              tipizatul.eu
            </NavLink>
          )}
          <div className="flex items-center gap-1 relative">
            <button
              onClick={() => setProposalOpen((v) => !v)}
              aria-label="Propune un formular"
              className="flex items-center gap-1.5 px-2 py-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
            >
              <Lightbulb className="w-5 h-5" />
              <span className="hidden sm:inline">Propune</span>
            </button>
            <ProposalWidget open={proposalOpen} onClose={() => setProposalOpen(false)} />
            <button
              onClick={toggle}
              aria-label={dark ? 'Activează modul luminos' : 'Activează modul întunecat'}
              className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Suspense fallback={<div className="text-center py-16 text-gray-500 dark:text-gray-400">Se încarcă...</div>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}

function DarkModeOnly() {
  // Applies dark mode class without rendering a layout — used for the login page
  // which has its own full-screen layout.
  useDarkMode()
  return (
    <Suspense fallback={null}>
      <Outlet />
    </Suspense>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <CatalogPage /> },
      { path: 'fill/:id', element: <FillPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/admin/login',
    element: <DarkModeOnly />,
    children: [{ index: true, element: <AdminLoginPage /> }],
  },
  {
    path: '/admin',
    element: <AppShell showBackLink />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={null}>
            <RequireAdmin>
              <AdminPage />
            </RequireAdmin>
          </Suspense>
        ),
      },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
