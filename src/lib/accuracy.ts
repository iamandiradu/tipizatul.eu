import type { SlimTemplate, Template } from '@/types/template'

// How much a user should trust that this form's input boxes land in the right
// places and that nothing was lost against the institution's original.
//
// The tier comes from *how the form was made*, which is the honest signal —
// not from a single number. A detector's 0.92 and a hand-authored replica are
// not the same kind of claim, and averaging them into one score would hide
// exactly the distinction a user needs.
export type AccuracyTier = 'official' | 'replica' | 'detected' | 'unverified'

export interface FormAccuracy {
  tier: AccuracyTier
  /** Short Romanian label for the badge. */
  label: string
  /** One sentence explaining what the tier means, for a tooltip or caption. */
  detail: string
  /** Detector confidence as a percentage, only for the 'detected' tier. */
  confidencePercent?: number
  /** True when the pipeline explicitly flagged this form for human review. */
  needsReview: boolean
  /** Community corroboration, when anyone has voted. */
  votes?: { up: number; down: number; agreementPercent: number }
}

type AnyTemplate = Pick<
  Template & SlimTemplate,
  'acroFormOrigin' | 'archetype' | 'detectorConfidence' | 'needsReview'
> & { voteCount?: { up: number; down: number } }

// Below this the upload pipeline already sets needsReview; we mirror the same
// threshold so the UI never calls a form reliable that the pipeline doubted.
const LOW_CONFIDENCE = 0.75

export function formAccuracy(t: AnyTemplate): FormAccuracy {
  const needsReview = !!t.needsReview

  const up = t.voteCount?.up ?? 0
  const down = t.voteCount?.down ?? 0
  const votes =
    up + down > 0
      ? { up, down, agreementPercent: Math.round((up / (up + down)) * 100) }
      : undefined

  // Order matters: provenance beats any score. An institution's own AcroForm
  // is authoritative regardless of what a detector would have guessed.
  if (t.acroFormOrigin === 'original') {
    return {
      tier: 'official',
      label: 'Formular oficial',
      detail:
        'Formularul conține câmpurile completabile publicate chiar de instituție. ' +
        'Nu am modificat structura lui.',
      needsReview,
      votes,
    }
  }

  if (t.archetype) {
    return {
      tier: 'replica',
      label: 'Replică verificată',
      detail:
        'Am reconstruit acest formular după documentul oficial și l-am verificat ' +
        'automat: textul legal este identic, iar câmpurile au fost testate.',
      needsReview,
      votes,
    }
  }

  // The tier is decided by provenance alone, so a catalog card — which carries
  // `acroFormOrigin` but not the confidence number, to stay inside the 1 MB
  // catalog budget — still labels the form correctly. The percentage is an
  // enrichment shown wherever the full Template is loaded, not a precondition.
  if (t.acroFormOrigin === 'generated' || typeof t.detectorConfidence === 'number') {
    const c = t.detectorConfidence
    const hasScore = typeof c === 'number' && c > 0
    return {
      tier: 'detected',
      label: 'Completat automat',
      detail:
        'Câmpurile au fost detectate automat în documentul original. ' +
        'Verifică rezultatul înainte de a-l depune.',
      ...(hasScore ? { confidencePercent: Math.round(c * 100) } : {}),
      needsReview: needsReview || (hasScore && c < LOW_CONFIDENCE),
      votes,
    }
  }

  // Legacy templates predating the provenance fields. Claiming nothing is
  // better than implying a verification that never happened.
  return {
    tier: 'unverified',
    label: 'Neverificat',
    detail:
      'Nu avem informații despre modul în care au fost adăugate câmpurile. ' +
      'Compară cu documentul original înainte de a-l depune.',
    needsReview: true,
    votes,
  }
}

// Tailwind classes per tier, kept beside the model so a new tier can't be
// added without deciding how it looks.
export const ACCURACY_STYLES: Record<AccuracyTier, string> = {
  official:
    'bg-green-50 dark:bg-green-950/60 text-green-800 dark:text-green-300 border-green-200 dark:border-green-900/60',
  replica:
    'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900/60',
  detected:
    'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-900/60',
  unverified:
    'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
}
