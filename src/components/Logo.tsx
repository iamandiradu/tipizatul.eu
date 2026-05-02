import { Stamp } from 'lucide-react'

// Wordmark: a stylized stamp glyph next to "tipizatul.eu" with the TLD in
// the brand accent color. The stamp is a wink at the joke on the homepage.
export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const text = size === 'sm' ? 'text-sm' : 'text-lg'
  const icon = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold tracking-tight ${text}`}>
      <span
        className="inline-flex items-center justify-center rounded-md bg-blue-600/10 dark:bg-blue-400/15 p-1 ring-1 ring-inset ring-blue-600/20 dark:ring-blue-400/30"
      >
        <Stamp className={`${icon} text-blue-600 dark:text-blue-400`} strokeWidth={2.25} />
      </span>
      <span className="text-gray-900 dark:text-gray-100">
        tipizatul<span className="text-blue-600 dark:text-blue-400">.eu</span>
      </span>
    </span>
  )
}
