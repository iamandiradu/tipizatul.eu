import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RoepasNotice from '../RoepasNotice'

describe('RoepasNotice', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('links to the new ROePAS portal', () => {
    render(<RoepasNotice />)
    expect(screen.getByRole('link', { name: 'roepas.ro' })).toHaveAttribute(
      'href',
      'https://roepas.ro/ro/',
    )
  })

  it('hides itself and remembers the dismissal', async () => {
    const { container, unmount } = render(<RoepasNotice />)
    await userEvent.click(screen.getByRole('button', { name: 'Închide anunțul' }))
    expect(container).toBeEmptyDOMElement()

    unmount()
    const remounted = render(<RoepasNotice />)
    expect(remounted.container).toBeEmptyDOMElement()
  })

  it('stays visible when it was never dismissed', () => {
    const { container } = render(<RoepasNotice />)
    expect(container).not.toBeEmptyDOMElement()
  })
})
