import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import ErrorPage from '../ErrorPage'

function renderErrorRoute(error: Error) {
  function ThrowingRoute(): null {
    throw error
  }
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <ThrowingRoute />,
        errorElement: <ErrorPage />,
      },
    ],
    { initialEntries: ['/'] },
  )
  return render(<RouterProvider router={router} />)
}

describe('ErrorPage smoke', () => {
  it('renders a friendly message and never leaks the raw error text', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderErrorRoute(new Error('SECRET_TOKEN=abc123 leaked stack'))

    expect(
      screen.getByText(/A apărut o problemă la încărcarea paginii/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/SECRET_TOKEN/)).not.toBeInTheDocument()
    consoleSpy.mockRestore()
  })

  it('exposes a Reîncarcă action and a back-home link', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderErrorRoute(new Error('boom'))

    expect(screen.getByRole('button', { name: /Reîncarcă/i })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Înapoi la pagina principală/i }),
    ).toBeInTheDocument()
    consoleSpy.mockRestore()
  })

  it('logs the underlying error to the console', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderErrorRoute(new Error('boom'))
    // React Router and the ErrorPage both log; just assert ErrorPage's tag appears.
    const calls = consoleSpy.mock.calls.flat().map(String).join(' ')
    expect(calls).toContain('[ErrorPage]')
    consoleSpy.mockRestore()
  })
})
