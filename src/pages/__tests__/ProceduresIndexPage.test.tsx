import { describe, it, expect, beforeAll, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import type { Procedure } from '@/types/template'
import ProceduresIndexPage from '../ProceduresIndexPage'

vi.mock('@/lib/firestore', () => ({ fetchCatalog: () => Promise.resolve([]) }))

// Ten counties keeps the auto-expand heuristic off (it only opens everything
// for eight or fewer), so a section is open exactly when the URL says so.
const COUNTIES = [
  'Alba',
  'Arad',
  'Argeș',
  'Bacău',
  'Bihor',
  'Botoșani',
  'Brașov',
  'Brăila',
  'Buzău',
  'Cluj',
]

function procedure(county: string): Procedure {
  return {
    procedureId: `proc-${county}`,
    title: `Certificat ${county}`,
    institution: `Primăria ${county}`,
    county,
    informational: false,
    informationalNotice: null,
    fields: {},
    documents: [
      {
        nr: '1',
        name: 'Cerere',
        required: true,
        eSignature: false,
        type: 'pdf',
        downloadUrl: null,
      },
    ],
    outputDocuments: [],
    laws: [],
  }
}

beforeAll(() => {
  const payload = {
    builtAt: '2026-01-01T00:00:00.000Z',
    source: 'test',
    institutions: COUNTIES.map((c) => `Primăria ${c}`),
    total: COUNTIES.length,
    procedures: Object.fromEntries(COUNTIES.map((c) => [`proc-${c}`, procedure(c)])),
  }
  vi.stubGlobal('fetch', () =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(payload) } as Response),
  )
})

function CurrentSearch() {
  return <span data-testid="search">{useLocation().search}</span>
}

function renderPage(url = '/proceduri') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <ProceduresIndexPage />
      <CurrentSearch />
    </MemoryRouter>,
  )
}

const currentSearch = () => screen.getByTestId('search').textContent ?? ''

describe('ProceduresIndexPage menu state', () => {
  it('records an expanded county in the URL', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: /^Cluj/ }))
    await waitFor(() => expect(currentSearch()).toContain('open=Cluj'))
    expect(screen.getByRole('button', { name: /Primăria Cluj/ })).toBeInTheDocument()
  })

  it('records an expanded institution under its county', async () => {
    const user = userEvent.setup()
    renderPage('/proceduri?open=Cluj')
    await user.click(await screen.findByRole('button', { name: /Primăria Cluj/ }))
    await waitFor(() => expect(currentSearch()).toContain('open=Cluj*Cluj%3EPrim%C4%83ria+Cluj'))
    expect(screen.getByRole('link', { name: /Certificat Cluj/ })).toBeInTheDocument()
  })

  it('restores an expanded institution from the URL', async () => {
    renderPage('/proceduri?open=Cluj*Cluj%3EPrim%C4%83ria+Cluj')
    expect(await screen.findByRole('link', { name: /Certificat Cluj/ })).toBeInTheDocument()
  })

  it('restores the search and county filters from the URL', async () => {
    renderPage('/proceduri?q=Certificat+Cluj&county=Cluj')
    expect(await screen.findByDisplayValue('Certificat Cluj')).toBeInTheDocument()
    // A single hit fits under the auto-expand thresholds, so it shows without
    // any `open` key of its own.
    expect(await screen.findByRole('link', { name: /Certificat Cluj/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Certificat Alba/ })).not.toBeInTheDocument()
  })

  it('drops a collapsed county back out of the URL', async () => {
    const user = userEvent.setup()
    renderPage('/proceduri?open=Cluj')
    const header = await screen.findByRole('button', { name: /^Cluj/ })
    await user.click(header)
    await waitFor(() => expect(currentSearch()).not.toContain('open='))
    expect(screen.queryByRole('button', { name: /Primăria Cluj/ })).not.toBeInTheDocument()
  })
})
