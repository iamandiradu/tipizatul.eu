import { createBrowserRouter, RouterProvider, Outlet, NavLink, Link } from 'react-router-dom'
import { lazy, Suspense, useState } from 'react'
import { Moon, Sun, Lightbulb, Github, AlertTriangle } from 'lucide-react'
import { useDarkMode } from '@/lib/useDarkMode'
import ProposalWidget from '@/components/ProposalWidget'
import Logo from '@/components/Logo'

const HomePage = lazy(() => import('@/pages/HomePage'))
const CatalogPage = lazy(() => import('@/pages/CatalogPage'))
const FillPage = lazy(() => import('@/pages/FillPage'))
const AdminLoginPage = lazy(() => import('@/pages/AdminLoginPage'))
const AdminPage = lazy(() => import('@/pages/AdminPage'))
const RequireAdmin = lazy(() => import('@/components/RequireAdmin'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const ErrorPage = lazy(() => import('@/pages/ErrorPage'))
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'))

function AppShell({ showBackLink }: { showBackLink?: boolean }) {
  const { dark, toggle } = useDarkMode()
  const [proposalOpen, setProposalOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white dark:focus:bg-gray-900 focus:text-gray-900 dark:focus:text-gray-100 focus:px-3 focus:py-2 focus:rounded-md focus:shadow-md"
      >
        Sări la conținut
      </a>
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {showBackLink ? (
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <Logo />
            </Link>
          ) : (
            <NavLink to="/" className="hover:opacity-80 transition-opacity">
              <Logo />
            </NavLink>
          )}
          <div className="flex items-center gap-1 relative">
            <button
              onClick={() => setProposalOpen((v) => !v)}
              aria-label="Propune un formular"
              aria-expanded={proposalOpen}
              aria-controls="proposal-panel"
              aria-haspopup="dialog"
              className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
            >
              <Lightbulb className="w-5 h-5" />
              <span className="hidden sm:inline">Propune</span>
            </button>
            <ProposalWidget open={proposalOpen} onClose={() => setProposalOpen(false)} />
            <a
              href="https://github.com/iamandiradu/tipizatul.eu"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Cod sursă pe GitHub (proiect open-source)"
              title="Open-source pe GitHub"
              className="p-2.5 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
            <button
              onClick={toggle}
              aria-label={dark ? 'Activează modul luminos' : 'Activează modul întunecat'}
              aria-pressed={dark}
              className="p-2.5 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>
      <div
        role="alert"
        className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200"
      >
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-start gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            <strong className="font-semibold">Platformă în fază incipientă.</strong>{' '}
            Conținutul și completarea formularelor pot conține erori — corectitudinea nu este garantată. Verifică datele înainte de a le folosi oficial.
          </p>
        </div>
      </div>
      <main id="main" className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
        <Suspense fallback={<div className="text-center py-16 text-gray-500 dark:text-gray-400">Se încarcă...</div>}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 mt-8">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-gray-500 dark:text-gray-400">
          <p>
            © {new Date().getFullYear()} Tipizatul.eu — gratuit, fără cont,{' '}
            <a
              href="https://github.com/iamandiradu/tipizatul.eu"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors underline-offset-2 hover:underline"
            >
              open-source
            </a>.
          </p>
          <nav className="flex items-center gap-5">
            <Link
              to="/confidentialitate"
              className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Confidențialitate
            </Link>
            <a
              href="https://github.com/iamandiradu/tipizatul.eu"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              GitHub
            </a>
          </nav>
        </div>
      </footer>
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
      { index: true, element: <HomePage /> },
      { path: 'formulare', element: <CatalogPage /> },
      { path: 'fill/:id', element: <FillPage /> },
      { path: 'confidentialitate', element: <PrivacyPage /> },
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
