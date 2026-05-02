import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { SlimTemplate } from '@/types/template'

const fetchCatalogMock = vi.fn()

vi.mock('@/lib/firestore', () => ({
  fetchCatalog: () => fetchCatalogMock(),
}))

import CatalogPage from '../CatalogPage'

const sampleTemplates: SlimTemplate[] = [
  {
    id: 't1',
    name: 'Cerere certificat de urbanism',
    organization: 'Primăria Cluj-Napoca',
    county: 'Cluj',
    version: 1,
    visibleFieldCount: 12,
    driveFileId: 'drive-1',
  },
  {
    id: 't2',
    name: 'Adeverință de venit',
    organization: 'ANAF',
    // Diacritic form on purpose — verifies that canonicalizeCounty buckets it
    // under "Bucuresti" alongside ASCII data.
    county: 'București',
    version: 1,
    visibleFieldCount: 5,
    driveFileId: 'drive-2',
  },
]

function renderCatalog() {
  return render(
    <MemoryRouter>
      <CatalogPage />
    </MemoryRouter>,
  )
}

describe('CatalogPage smoke', () => {
  beforeEach(() => {
    fetchCatalogMock.mockReset()
    localStorage.clear()
  })

  it('shows the skeleton state while loading', () => {
    fetchCatalogMock.mockReturnValue(new Promise(() => {}))
    const { container } = renderCatalog()
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('shows the empty state when no templates are returned', async () => {
    fetchCatalogMock.mockResolvedValue([])
    renderCatalog()
    expect(await screen.findByText(/Niciun formular disponibil/i)).toBeInTheDocument()
  })

  it('renders county and organization sections from the catalog', async () => {
    fetchCatalogMock.mockResolvedValue(sampleTemplates)
    renderCatalog()
    // Counties and organizations show as soon as data resolves (org panels are
    // collapsed by default, so we assert their heading rows, not template names).
    expect(await screen.findByRole('heading', { level: 2, name: 'Cluj' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Bucuresti' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Primăria Cluj-Napoca' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'ANAF' })).toBeInTheDocument()
  })

  it('filters templates by search input', async () => {
    fetchCatalogMock.mockResolvedValue(sampleTemplates)
    const user = userEvent.setup()
    renderCatalog()
    await screen.findByRole('heading', { level: 3, name: 'Primăria Cluj-Napoca' })

    const search = screen.getByLabelText(/Caută/i)
    await user.type(search, 'adeverință')

    // The non-matching organization is filtered out; the matching one stays.
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { level: 3, name: 'Primăria Cluj-Napoca' }),
      ).not.toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { level: 3, name: 'ANAF' })).toBeInTheDocument()
    // Counter chip reflects filtered count.
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    // Auto-open: searching expands the matching org, so the template name is
    // now in the DOM without requiring a click. Regression guard for the
    // useState(defaultOpen) bug we fixed.
    expect(await screen.findByText('Adeverință de venit')).toBeInTheDocument()
  })

  it('toggles the "Cum funcționează" intro and persists to localStorage', async () => {
    fetchCatalogMock.mockResolvedValue(sampleTemplates)
    const user = userEvent.setup()
    renderCatalog()
    await screen.findByRole('heading', { level: 2, name: 'Cluj' })

    const toggle = screen.getByRole('button', { name: /Cum funcționează/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(localStorage.getItem('tipizatul.intro.expanded')).toBe('false')
  })
})
