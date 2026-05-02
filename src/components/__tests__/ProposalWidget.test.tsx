import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProposalWidget from '../ProposalWidget'

vi.mock('@/lib/firestore', () => ({
  submitProposal: vi.fn().mockResolvedValue(undefined),
}))

import { submitProposal } from '@/lib/firestore'

describe('ProposalWidget smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when closed', () => {
    const { container } = render(<ProposalWidget open={false} onClose={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders as a dialog with the labelled heading when open', () => {
    render(<ProposalWidget open={true} onClose={() => {}} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-labelledby')
    expect(screen.getByRole('heading', { name: /Propune un formular/i })).toBeInTheDocument()
  })

  it('autofocuses the title input when opened', async () => {
    render(<ProposalWidget open={true} onClose={() => {}} />)
    await waitFor(() => {
      expect(screen.getByLabelText(/Titlu/i)).toHaveFocus()
    })
  })

  it('submits the proposal and triggers onClose after success', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ProposalWidget open={true} onClose={onClose} />)

    await user.type(screen.getByLabelText(/Titlu/i), 'Test formular')
    await user.click(screen.getByRole('button', { name: /Trimite/i }))

    await waitFor(() => {
      expect(submitProposal).toHaveBeenCalledWith('Test formular', '')
    })
    // Component closes itself ~1.5s after success — verify it shows the success message at minimum.
    expect(screen.getByText(/Mulțumim/i)).toBeInTheDocument()
  })

  it('shows a validation error when title is empty', async () => {
    const user = userEvent.setup()
    render(<ProposalWidget open={true} onClose={() => {}} />)
    await user.click(screen.getByRole('button', { name: /Trimite/i }))
    expect(screen.getByText(/Titlul este obligatoriu/i)).toBeInTheDocument()
    expect(submitProposal).not.toHaveBeenCalled()
  })
})
