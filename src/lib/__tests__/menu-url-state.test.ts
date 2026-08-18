import { describe, it, expect } from 'vitest'
import {
  institutionKey,
  isSectionOpen,
  parseMenuState,
  toggleSection,
  writeMenuState,
} from '../menu-url-state'

const state = (open: string[] = [], closed: string[] = []) => ({
  open: new Set(open),
  closed: new Set(closed),
})

describe('parseMenuState', () => {
  it('reads both key lists off the query string', () => {
    const s = parseMenuState(new URLSearchParams('q=x&open=Cluj*Alba&closed=Cluj>DSP'))
    expect([...s.open]).toEqual(['Cluj', 'Alba'])
    expect([...s.closed]).toEqual(['Cluj>DSP'])
  })

  it('yields empty sets when the params are absent or blank', () => {
    const s = parseMenuState(new URLSearchParams('open=&closed='))
    expect(s.open.size).toBe(0)
    expect(s.closed.size).toBe(0)
  })
})

describe('isSectionOpen', () => {
  it('defers to the heuristic for untouched sections', () => {
    expect(isSectionOpen(state(), 'Cluj', true)).toBe(true)
    expect(isSectionOpen(state(), 'Cluj', false)).toBe(false)
  })

  it('lets either override win over the heuristic', () => {
    expect(isSectionOpen(state(['Cluj']), 'Cluj', false)).toBe(true)
    expect(isSectionOpen(state([], ['Cluj']), 'Cluj', true)).toBe(false)
  })
})

describe('toggleSection', () => {
  it('records expanding a section the heuristic keeps closed', () => {
    const next = toggleSection(state(), 'Cluj', false)
    expect([...next.open]).toEqual(['Cluj'])
    expect(next.closed.size).toBe(0)
  })

  it('records collapsing a section the heuristic opens', () => {
    const next = toggleSection(state(), 'Cluj', true)
    expect([...next.closed]).toEqual(['Cluj'])
    expect(next.open.size).toBe(0)
  })

  it('drops the override instead of adding the opposite one', () => {
    expect(toggleSection(state(['Cluj']), 'Cluj', false)).toEqual(state())
    expect(toggleSection(state([], ['Cluj']), 'Cluj', true)).toEqual(state())
  })

  it('round-trips back to the heuristic after two toggles', () => {
    for (const heuristic of [true, false]) {
      const once = toggleSection(state(), 'Cluj', heuristic)
      expect(isSectionOpen(once, 'Cluj', heuristic)).toBe(!heuristic)
      const twice = toggleSection(once, 'Cluj', heuristic)
      expect(isSectionOpen(twice, 'Cluj', heuristic)).toBe(heuristic)
    }
  })
})

describe('writeMenuState', () => {
  it('writes the kept keys and prunes ones the filter no longer shows', () => {
    const params = new URLSearchParams('q=x')
    writeMenuState(
      params,
      state(['Cluj', 'Alba'], [institutionKey('Cluj', 'DSP')]),
      new Set(['Cluj', institutionKey('Cluj', 'DSP')]),
    )
    expect(params.get('q')).toBe('x')
    expect(params.get('open')).toBe('Cluj')
    expect(params.get('closed')).toBe('Cluj>DSP')
  })

  it('deletes a param that ends up empty', () => {
    const params = new URLSearchParams('open=Cluj&closed=Alba')
    writeMenuState(params, state([], ['Alba']), new Set(['Alba']))
    expect(params.has('open')).toBe(false)
    expect(params.get('closed')).toBe('Alba')
  })

  it('keeps every key when visibility is unknown', () => {
    const params = new URLSearchParams()
    writeMenuState(params, state(['Cluj', 'Alba']), null)
    expect(params.get('open')).toBe('Cluj*Alba')
  })
})
