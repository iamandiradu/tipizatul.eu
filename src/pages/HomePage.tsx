import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, FileText, Stamp, Printer, Clock, Wifi } from 'lucide-react'
import { fetchCatalog } from '@/lib/firestore'
import { useDocumentMeta } from '@/lib/useDocumentMeta'

// Decorative paper sheet that drifts across the hero background. Several of
// these stack at different speeds, opacities and Y offsets — the impression
// is "an avalanche of forms passing slowly by".
function PaperSheet({
  className,
  top,
  size = 'md',
}: {
  className: string
  top: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const dims =
    size === 'sm' ? 'w-24 h-32' : size === 'lg' ? 'w-44 h-56' : 'w-32 h-40'
  return (
    <div
      aria-hidden
      className={`absolute ${className} ${dims} bg-white dark:bg-gray-200/90 rounded-sm shadow-md/30 ring-1 ring-gray-300/50 dark:ring-gray-400/40 will-change-transform pointer-events-none`}
      style={{ top }}
    >
      {/* Faux text lines so it reads as "a form" at a glance */}
      <div className="px-3 pt-4 space-y-1.5">
        <div className="h-1.5 w-3/4 bg-gray-300 dark:bg-gray-400 rounded" />
        <div className="h-1.5 w-1/2 bg-gray-300 dark:bg-gray-400 rounded" />
        <div className="h-1.5 w-2/3 bg-gray-300 dark:bg-gray-400 rounded" />
        <div className="h-1.5 w-3/5 bg-gray-300 dark:bg-gray-400 rounded mt-3" />
        <div className="h-1.5 w-4/5 bg-gray-300 dark:bg-gray-400 rounded" />
      </div>
    </div>
  )
}

// Counts a number up from 0 to `target` over `durationMs`. Hooks into
// `prefers-reduced-motion` and renders the final number directly when set.
function CountUp({ target, durationMs = 1500 }: { target: number; durationMs?: number }) {
  const [n, setN] = useState(0)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || target <= 0) {
      setN(target)
      return
    }
    const t0 = performance.now()
    let frame = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / durationMs)
      // Ease-out cubic for the "settling" feel
      const eased = 1 - Math.pow(1 - k, 3)
      setN(Math.round(eased * target))
      if (k < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs])

  return <span className="tabular-nums">{n.toLocaleString('ro-RO')}</span>
}

export default function HomePage() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    fetchCatalog()
      .then((all) => setCount(all.filter((t) => !t.archived).length))
      .catch(() => setCount(null))
  }, [])

  useDocumentMeta({
    title: 'Tipizatul.eu — Statul digital există. Doar nu pe hârtie.',
    description:
      'În 2026, statul român încă îți cere să tipărești PDF-uri. Browserele există, AcroForm există de 25 de ani. Decizia de a nu le folosi e politică, nu tehnică. Tipizatul.eu digitalizează ce statul refuză să digitalizeze.',
    canonical: 'https://tipizatul.eu/',
  })

  return (
    <div>
      {/* ── Hero (full-bleed, breaks out of AppShell's max-w container) ───── */}
      <section
        className="relative left-1/2 right-1/2 -translate-x-1/2 -mt-8 w-screen overflow-hidden bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950"
        style={{ minHeight: 'calc(100dvh - 3.5rem)' }}
      >
        {/* Drifting paper sheets — pure decoration, hidden from a11y tree */}
        <div aria-hidden className="absolute inset-0 opacity-25 dark:opacity-15 pointer-events-none">
          <PaperSheet className="anim-drift-1 left-0" top="8%" size="md" />
          <PaperSheet className="anim-drift-2 left-0" top="22%" size="sm" />
          <PaperSheet className="anim-drift-3 left-0" top="55%" size="lg" />
          <PaperSheet
            className="anim-drift-1 left-0"
            top="70%"
            size="sm"
          />
          <PaperSheet
            className="anim-drift-2 left-0"
            top="38%"
            size="md"
          />
        </div>

        {/* Soft radial vignette so the headline always wins against the bg */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(249,250,251,0.85)_70%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(3,7,18,0.85)_70%)] pointer-events-none"
        />

        <div className="relative max-w-5xl mx-auto px-4 pt-12 pb-16 sm:pt-20 sm:pb-24 flex flex-col items-center text-center">
          {/* Stamp icon "slammed down" with an ink-spread halo */}
          <div className="relative mb-6">
            <span
              aria-hidden
              className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-blue-500/30 dark:bg-blue-400/30 anim-ink"
            />
            <span className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30 dark:shadow-blue-400/20 anim-stamp">
              <Stamp className="w-8 h-8" strokeWidth={2.25} />
            </span>
          </div>

          <p className="text-xs sm:text-sm font-mono uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-4 anim-word-up" style={{ animationDelay: '0.05s' }}>
            în anul 2026 d.Hr.
          </p>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-gray-900 dark:text-gray-100 max-w-3xl">
            <span className="inline-block anim-word-up" style={{ animationDelay: '0.15s' }}>Statul</span>{' '}
            <span className="inline-block anim-word-up" style={{ animationDelay: '0.25s' }}>digital</span>{' '}
            <span className="inline-block anim-word-up" style={{ animationDelay: '0.35s' }}>există.</span>{' '}
            <br className="hidden sm:block" />
            <span className="inline-block anim-word-up text-blue-600 dark:text-blue-400" style={{ animationDelay: '0.55s' }}>Doar</span>{' '}
            <span className="inline-block anim-word-up text-blue-600 dark:text-blue-400" style={{ animationDelay: '0.65s' }}>nu</span>{' '}
            <span className="inline-block anim-word-up text-blue-600 dark:text-blue-400" style={{ animationDelay: '0.75s' }}>pe</span>{' '}
            <span className="inline-block anim-word-up text-blue-600 dark:text-blue-400" style={{ animationDelay: '0.85s' }}>hârtie.</span>
          </h1>

          <p className="mt-8 max-w-2xl text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed anim-fade-in">
            Browserele există de 35 de ani. Formularele PDF cu câmpuri editabile (AcroForm) există de 25 de ani.
            <br className="hidden sm:block" />
            Și totuși: în România le tipărim, le completăm cu pixul, le ștampilăm și le depunem la ghișeu.
            <br className="hidden sm:block" />
            <strong className="text-gray-900 dark:text-gray-100">
              Asta nu e o limitare tehnică. E o alegere.
            </strong>
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-3 anim-fade-in">
            <Link
              to="/proceduri"
              className="group inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-md font-medium shadow-sm transition-colors"
            >
              {count !== null ? (
                <>
                  Vezi cele <CountUp target={count} /> formulare
                </>
              ) : (
                <>Vezi formularele</>
              )}
              <ArrowRight className="w-4 h-4 anim-arrow" />
            </Link>
            <a
              href="#manifest"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-md font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Citește de ce e nevoie de noi
            </a>
          </div>
        </div>
      </section>

      {/* ── Manifesto ─────────────────────────────────────────────────────── */}
      <section id="manifest" className="max-w-3xl mx-auto py-16 sm:py-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          Birocrația pe hârtie nu e o problemă tehnică. E o decizie politică.
        </h2>

        <div className="space-y-6 text-base sm:text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
          <p>
            Fiecare instituție publică din România deja produce formulare în format PDF.
            Le pune pe site. Le numește „formulare-tip". <strong>Și se așteaptă ca tu să le tipărești.</strong>
          </p>
          <p>
            Tehnologia care permite completarea unui PDF direct în browser există de la sfârșitul anilor '90.
            Nu vorbim de inteligență artificială sau de blockchain. Vorbim de <em>câmpuri editabile</em>{' '}
            — o caracteristică standard a formatului PDF, ignorată sistematic de aproape toate instituțiile statului român.
          </p>
          <p>
            De ce? Pentru că un sistem care funcționează pe hârtie are nevoie de oameni care
            mută hârtii, ștampilează hârtii, arhivează hârtii. Pentru că ghișeul e un
            instrument de control. Pentru că lentoarea e profitabilă pentru cei care o
            întrețin.
          </p>
          <p className="text-gray-900 dark:text-gray-100 font-medium">
            Tipizatul.eu nu așteaptă ca statul să se digitalizeze.
            Luăm formularele oficiale, le facem completabile online, și le returnăm cetățeanului — gratuit, fără cont, open-source.
          </p>
        </div>
      </section>

      {/* ── Pe hârtie vs Digital ──────────────────────────────────────────── */}
      <section className="relative left-1/2 right-1/2 -translate-x-1/2 w-screen bg-gray-100 dark:bg-gray-900 py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-gray-100 mb-12">
            Aceeași hârtie. Două realități.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Paper column — slight chaos */}
            <div className="relative rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-8">
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-red-600 dark:text-red-400 mb-4">
                <Printer className="w-4 h-4" /> pe hârtie
              </div>
              <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><Clock className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /> Cozi la ghișeu, program 9–13.</li>
                <li className="flex gap-2"><Printer className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /> Tipărești acasă, pe imprimanta care nu mai are toner.</li>
                <li className="flex gap-2"><FileText className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /> Greșești o cifră → tipărești din nou.</li>
                <li className="flex gap-2"><Stamp className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /> Ștampila contează mai mult decât conținutul.</li>
              </ul>
            </div>

            {/* Digital column — calm */}
            <div className="relative rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 p-8">
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-blue-700 dark:text-blue-300 mb-4">
                <Wifi className="w-4 h-4" /> digital
              </div>
              <ul className="space-y-3 text-sm text-gray-800 dark:text-gray-200">
                <li className="flex gap-2"><Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" /> Completezi în 3 minute, oricând.</li>
                <li className="flex gap-2"><FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" /> Câmpuri validate; nu poți greși un CNP.</li>
                <li className="flex gap-2"><Wifi className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" /> Datele se salvează automat în browser.</li>
                <li className="flex gap-2"><ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" /> Descarci PDF-ul gata de imprimat sau de trimis.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto py-16 sm:py-24 text-center">
        {count !== null && count > 0 && (
          <p className="text-5xl sm:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            <CountUp target={count} />
          </p>
        )}
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-8">
          formulare deja online. Și numărăm.
        </p>
        <Link
          to="/proceduri"
          className="group inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-7 py-4 rounded-md text-base font-medium shadow-sm transition-colors"
        >
          Vezi catalogul
          <ArrowRight className="w-4 h-4 anim-arrow" />
        </Link>
        <p className="mt-8 text-xs text-gray-500 dark:text-gray-500">
          Tipizatul.eu este gratuit, fără cont și{' '}
          <a href="https://github.com/iamandiradu/tipizatul.eu" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
            open-source
          </a>.
        </p>
      </section>
    </div>
  )
}
