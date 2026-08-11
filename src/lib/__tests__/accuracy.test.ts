import { describe, it, expect } from 'vitest'
import { formAccuracy } from '@/lib/accuracy'

describe('formAccuracy', () => {
  it('treats the institution\'s own AcroForm as official', () => {
    const a = formAccuracy({ acroFormOrigin: 'original' })
    expect(a.tier).toBe('official')
    expect(a.confidencePercent).toBeUndefined()
  })

  it('ranks provenance above any detector score', () => {
    // An original form has nothing to detect, so a stray low score must not
    // downgrade it — otherwise the most trustworthy forms look the worst.
    const a = formAccuracy({ acroFormOrigin: 'original', detectorConfidence: 0.1 })
    expect(a.tier).toBe('official')
  })

  it('reports an authored archetype as a verified replica', () => {
    const a = formAccuracy({ acroFormOrigin: 'generated', archetype: 'cerere-tip' })
    expect(a.tier).toBe('replica')
  })

  it('surfaces detector confidence as a percentage', () => {
    const a = formAccuracy({ acroFormOrigin: 'generated', detectorConfidence: 0.923 })
    expect(a.tier).toBe('detected')
    expect(a.confidencePercent).toBe(92)
  })

  it('flags low-confidence detections for review even when the pipeline did not', () => {
    const a = formAccuracy({ acroFormOrigin: 'generated', detectorConfidence: 0.4 })
    expect(a.needsReview).toBe(true)
  })

  it('does not flag a high-confidence detection', () => {
    const a = formAccuracy({ acroFormOrigin: 'generated', detectorConfidence: 0.95 })
    expect(a.needsReview).toBe(false)
  })

  it('honours an explicit needsReview flag from the pipeline', () => {
    const a = formAccuracy({ acroFormOrigin: 'generated', detectorConfidence: 0.99, needsReview: true })
    expect(a.needsReview).toBe(true)
  })

  it('claims nothing for legacy templates with no provenance', () => {
    const a = formAccuracy({})
    expect(a.tier).toBe('unverified')
    expect(a.needsReview).toBe(true)
  })

  it('computes vote agreement when votes exist', () => {
    const a = formAccuracy({ acroFormOrigin: 'original', voteCount: { up: 9, down: 1 } })
    expect(a.votes).toEqual({ up: 9, down: 1, agreementPercent: 90 })
  })

  it('omits the vote line entirely when nobody has voted', () => {
    const a = formAccuracy({ acroFormOrigin: 'original', voteCount: { up: 0, down: 0 } })
    expect(a.votes).toBeUndefined()
  })
})

describe('formAccuracy — catalog cards without the confidence number', () => {
  it('still labels a generated form as detected when the score was not projected', () => {
    // Catalog entries omit detectorConfidence to stay inside the 1 MB budget.
    // Falling through to "Neverificat" here would defame thousands of forms.
    const a = formAccuracy({ acroFormOrigin: 'generated' })
    expect(a.tier).toBe('detected')
    expect(a.confidencePercent).toBeUndefined()
  })

  it('does not claim a review is needed when no score is available to judge', () => {
    const a = formAccuracy({ acroFormOrigin: 'generated' })
    expect(a.needsReview).toBe(false)
  })

  it('reserves unverified for templates with no provenance at all', () => {
    expect(formAccuracy({}).tier).toBe('unverified')
  })
})
