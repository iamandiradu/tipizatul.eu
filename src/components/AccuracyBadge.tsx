import { AlertTriangle, BadgeCheck, ScanLine, ShieldQuestion } from 'lucide-react'
import { ACCURACY_STYLES, formAccuracy, type AccuracyTier } from '@/lib/accuracy'
import type { SlimTemplate, Template } from '@/types/template'

const ICON: Record<AccuracyTier, typeof BadgeCheck> = {
  official: BadgeCheck,
  replica: BadgeCheck,
  detected: ScanLine,
  unverified: ShieldQuestion,
}

type Props = {
  template: Parameters<typeof formAccuracy>[0] & Partial<Template & SlimTemplate>
  /** `full` adds the explanation and vote line; `compact` is badge-only. */
  variant?: 'full' | 'compact'
  className?: string
}

/**
 * Tells the user how this form's fillable fields came to exist, so they can
 * judge how much to trust them. Deliberately not a single 0–100 score: a
 * hand-verified replica and a detector's guess are different kinds of claim.
 */
export default function AccuracyBadge({ template, variant = 'compact', className = '' }: Props) {
  const a = formAccuracy(template)
  const Icon = ICON[a.tier]

  const badge = (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${ACCURACY_STYLES[a.tier]}`}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {a.label}
      {a.confidencePercent !== undefined && (
        <span className="font-medium tabular-nums">{a.confidencePercent}%</span>
      )}
    </span>
  )

  if (variant === 'compact') {
    return (
      <span className={className} title={a.detail}>
        {badge}
      </span>
    )
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        {badge}
        {a.votes && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {a.votes.agreementPercent}% din {a.votes.up + a.votes.down}{' '}
            {a.votes.up + a.votes.down === 1 ? 'utilizator' : 'utilizatori'} confirmă că
            formularul e corect
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{a.detail}</p>
      {a.needsReview && (
        <p className="mt-1.5 inline-flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden="true" />
          Acest formular nu a trecut încă o verificare umană — compară-l cu documentul
          original înainte de a-l depune.
        </p>
      )}
    </div>
  )
}
