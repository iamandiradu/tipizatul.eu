import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NotFoundPage from '../NotFoundPage'

describe('NotFoundPage smoke', () => {
  it('renders the 404 message and a link back home', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(
      screen.getByText(/Pagina nu a fost găsită/i),
    ).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Înapoi la pagina principală/i })
    expect(link).toHaveAttribute('href', '/')
  })
})
