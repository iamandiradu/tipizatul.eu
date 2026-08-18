import { describe, it, expect } from 'vitest'

import {
  parsePage,
  toProcedures,
  normalizeDocUrl,
  headingTitle,
  procedureIdFor,
  documentType,
  docIdForUrl,
  extOf,
} from './fetch.mjs'

// A cut-down copy of the real page's markup: WPBakery wraps every row in its
// own column stack, so headings and rows are siblings in document order rather
// than nested — which is what parsePage relies on.
const row = (label, linkBlockHtml) => `
  <div class="vc_row table-row">
    <div class="wpb_column"><div class="wpb_text_column table-row-text">
      <div class="wpb_wrapper"><p>${label}</p></div>
    </div></div>
    <div class="link-block wpb_column"><div class="wpb_text_column">
      <div class="wpb_wrapper"><p>${linkBlockHtml}</p></div>
    </div></div>
  </div>`

const PAGE = `<!doctype html><html><body><main><article>
  <div class="wpb_text_column section-title"><h2>Serviciul protecție socială</h2></div>
  ${row('Cerere cantina gratuită', '/wp-content/uploads/2026/03/Cerere-acordare-cantina-gratuita.pdf')}
  ${row('Informații utile', '/wp-content/uploads/2016/02/INFORMATII-HCL-522-ISR-660.pdf&#8221; title=&#8221;INFORMATII HCL 522&#8243;]')}
  <h2>Alocații și indemnizații creșterea copilului</h2>
  ${row('Informatii utile privind întocmirea dosarelor', 'https://dasmclujnapoca.ro/wp-content/uploads/2026/04/Informatii-utile.pdf')}
  <h3>1. Formulare alocație de stat + Lista actelor necesare (5 doc.)</h3>
  ${row('Opis', '/wp-content/uploads/2015/12/opis.pdf')}
  ${row('Declarație pe propria răspundere (PFA 2026)', '<a href="https://dasmclujnapoca.ro/wp-content/uploads/2026/08/ANAF-DECLARATIAPFA.pdf">Declarație pe propria răspundere (pfa 2026)</a>')}
  ${row('Rând fără link', 'nu este o adresă')}
</article></main></body></html>`

describe('normalizeDocUrl', () => {
  it('resolves site-relative paths against the site root', () => {
    expect(normalizeDocUrl('/wp-content/uploads/opis.pdf')).toBe(
      'https://dasmclujnapoca.ro/wp-content/uploads/opis.pdf',
    )
  })

  it('cuts the leftover shortcode tail the editor pasted after the URL', () => {
    expect(
      normalizeDocUrl('/wp-content/uploads/2016/02/INFORMATII.pdf” title=”INFORMATII HCL 522″]'),
    ).toBe('https://dasmclujnapoca.ro/wp-content/uploads/2016/02/INFORMATII.pdf')
  })

  it('returns null for text that is not a URL', () => {
    expect(normalizeDocUrl('nu este o adresă')).toBeNull()
    expect(normalizeDocUrl('')).toBeNull()
    expect(normalizeDocUrl(null)).toBeNull()
  })
})

describe('headingTitle', () => {
  it('strips the numbering and the document count the page prints on headings', () => {
    expect(headingTitle('1. Formulare alocație de stat + Lista actelor necesare (5 doc.)')).toBe(
      'Formulare alocație de stat + Lista actelor necesare',
    )
    expect(headingTitle('Ajutoare de încălzire 2025-2026 (11 doc)')).toBe(
      'Ajutoare de încălzire 2025-2026',
    )
  })
})

describe('procedureIdFor', () => {
  it('builds a short, namespaced slug from the service and sub-group', () => {
    expect(procedureIdFor('Serviciul protecție socială')).toBe('dasm-cj-serviciul-protectie-sociala')
    expect(
      procedureIdFor('Serviciul resurse umane salarizare', 'Formulare tip pentru funcții publice'),
    ).toBe('dasm-cj-serviciul-resurse-umane-salarizare-formulare-tip-pentru-functii-publice')
  })
})

describe('documentType', () => {
  it('separates forms from background reading by their label', () => {
    expect(documentType('Cerere cantina gratuită')).toBe('Formular tipizat')
    expect(documentType('Declarație GDPR')).toBe('Formular tipizat')
    expect(documentType('Acte necesare acordare prestatii')).toBe('Document informativ')
    expect(documentType('Lista bunurilor')).toBe('Document informativ')
    // "Cerere"/"Formular" wins even when the rest of the label reads informative.
    expect(documentType('Formular cerere pentru acordare tichete sociale')).toBe('Formular tipizat')
  })
})

describe('docIdForUrl', () => {
  it('is stable and namespaced, so it can never collide with a numeric eDirect id', () => {
    const id = docIdForUrl('https://dasmclujnapoca.ro/wp-content/uploads/2015/12/opis.pdf')
    expect(id).toMatch(/^dasm-cj-[0-9a-f]{8}$/)
    expect(docIdForUrl('https://dasmclujnapoca.ro/wp-content/uploads/2015/12/opis.pdf')).toBe(id)
    expect(docIdForUrl('https://dasmclujnapoca.ro/wp-content/uploads/2015/12/other.pdf')).not.toBe(id)
  })
})

describe('extOf', () => {
  it('reads the extension from the path, not the query', () => {
    expect(extOf('https://x.ro/a/b/CERERE.PDF')).toBe('pdf')
    expect(extOf('https://x.ro/a/b/cerere.odt?v=2')).toBe('odt')
  })
})

describe('parsePage', () => {
  const groups = parsePage(PAGE)

  it('groups rows under the heading that precedes them, in document order', () => {
    expect(groups.map((g) => g.title)).toEqual([
      'Serviciul protecție socială',
      'Alocații și indemnizații creșterea copilului',
      'Alocații și indemnizații creșterea copilului — Formulare alocație de stat + Lista actelor necesare',
    ])
    expect(groups[0].documents.map((d) => d.label)).toEqual([
      'Cerere cantina gratuită',
      'Informații utile',
    ])
  })

  it('prefers an anchor in the link block over its text', () => {
    const pfa = groups[2].documents.find((d) => d.label.startsWith('Declarație'))
    expect(pfa.url).toBe('https://dasmclujnapoca.ro/wp-content/uploads/2026/08/ANAF-DECLARATIAPFA.pdf')
  })

  it('skips rows whose link block holds no resolvable URL', () => {
    const labels = groups.flatMap((g) => g.documents.map((d) => d.label))
    expect(labels).not.toContain('Rând fără link')
  })
})

describe('toProcedures', () => {
  const procedures = toProcedures(parsePage(PAGE), '2026-08-18T00:00:00.000Z')

  it('emits Procedure-shaped records tagged with the institution and its source', () => {
    const p = procedures['dasm-cj-serviciul-protectie-sociala']
    expect(p.institution).toBe('Direcția de Asistență Socială și Medicală Cluj-Napoca')
    expect(p.county).toBe('Cluj')
    expect(p.city).toBe('Cluj-Napoca')
    expect(p.source).toBe('dasm-cluj-napoca')
    expect(p.sourceUrl).toBe('https://dasmclujnapoca.ro/formulare/')
    expect(p.informational).toBe(false)
  })

  it('numbers documents within a procedure and gives each a stable join id', () => {
    const docs = procedures['dasm-cj-serviciul-protectie-sociala'].documents
    expect(docs.map((d) => d.nr)).toEqual(['1', '2'])
    expect(docs[0].eDirectDocId).toBe(docIdForUrl(docs[0].downloadUrl))
    expect(docs[0].sourceExt).toBe('pdf')
    // The page states no per-document obligation; inventing one would show a
    // false "Obligatoriu" badge.
    expect(docs.every((d) => d.required === false)).toBe(true)
  })

  it('gives the same file the same id across procedures, so one join covers both', () => {
    const all = Object.values(procedures).flatMap((p) => p.documents)
    const byUrl = new Map(all.map((d) => [d.downloadUrl, d.eDirectDocId]))
    for (const d of all) expect(byUrl.get(d.downloadUrl)).toBe(d.eDirectDocId)
  })
})
