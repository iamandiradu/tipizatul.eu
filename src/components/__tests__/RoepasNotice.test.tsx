import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RoepasNotice from '../RoepasNotice'

describe('RoepasNotice', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('reads as one clean sentence pair', () => {
    const { container } = render(<RoepasNotice />)
    expect(container.querySelector('p')?.textContent).toBe(
      'PCUe (eDirect) a fost înlocuit de ROePAS (roepas.ro) — o interfață mult mai bună decât vechea platformă. Nu înlocuiește Tipizatul.eu.',
    )
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
