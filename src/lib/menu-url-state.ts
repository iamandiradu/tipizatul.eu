/**
 * URL-backed expand/collapse state for the grouped procedure menu.
 *
 * The menu auto-expands sections based on how many results the current filter
 * leaves, so the URL stores only the reader's *deviations* from that
 * heuristic: `open` for sections expanded on top of it, `closed` for sections
 * collapsed against it. Encoding the diff rather than the full set keeps
 * shared links short — a broad search auto-expands hundreds of sections — and
 * leaves the heuristic in charge of everything the reader never touched.
 *
 * Keys are compared whole: a county key is the county name, an institution
 * key is `county>institution`. Only the `*` separator is structural.
 */
// `*` survives URLSearchParams serialization unescaped, which keeps a shared
// link readable; `>` does not, but it only shows up inside a key.
export const KEY_SEP = '*'
export const INSTITUTION_SEP = '>'

export interface MenuState {
  open: Set<string>
  closed: Set<string>
}

export function institutionKey(county: string, institution: string): string {
  return `${county}${INSTITUTION_SEP}${institution}`
}

function parseKeys(raw: string | null): Set<string> {
  if (!raw) return new Set()
  return new Set(raw.split(KEY_SEP).filter((k) => k !== ''))
}

export function parseMenuState(params: URLSearchParams): MenuState {
  return {
    open: parseKeys(params.get('open')),
    closed: parseKeys(params.get('closed')),
  }
}

export function isSectionOpen(
  state: MenuState,
  key: string,
  heuristicallyOpen: boolean,
): boolean {
  if (state.open.has(key)) return true
  if (state.closed.has(key)) return false
  return heuristicallyOpen
}

export function toggleSection(
  state: MenuState,
  key: string,
  heuristicallyOpen: boolean,
): MenuState {
  const open = new Set(state.open)
  const closed = new Set(state.closed)
  if (isSectionOpen(state, key, heuristicallyOpen)) {
    open.delete(key)
    // Collapsing something the heuristic wants open has to be recorded;
    // collapsing an explicitly-opened section just drops the override.
    if (heuristicallyOpen) closed.add(key)
  } else {
    closed.delete(key)
    if (!heuristicallyOpen) open.add(key)
  }
  return { open, closed }
}

/**
 * Writes the state onto `params`, dropping keys for sections the current
 * filter no longer shows so the URL doesn't accumulate stale groups. Pass
 * `visible: null` to keep every key (e.g. before the data has loaded).
 */
export function writeMenuState(
  params: URLSearchParams,
  state: MenuState,
  visible: Set<string> | null,
): void {
  const entries = [
    ['open', state.open],
    ['closed', state.closed],
  ] as const
  for (const [name, keys] of entries) {
    const kept = [...keys].filter((k) => visible === null || visible.has(k))
    if (kept.length === 0) params.delete(name)
    else params.set(name, kept.join(KEY_SEP))
  }
}
