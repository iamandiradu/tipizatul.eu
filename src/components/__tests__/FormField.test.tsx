import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import FormField from '../FormField'
import type { TemplateField } from '@/types/template'

function Harness({
  field,
  errorMessage,
}: {
  field: TemplateField
  errorMessage?: string
}) {
  const { register, formState } = useForm({
    defaultValues: { [field.pdfFieldName]: '' },
    errors: errorMessage
      ? { [field.pdfFieldName]: { type: 'manual', message: errorMessage } }
      : undefined,
  })
  // react-hook-form doesn't expose `errors` via the options arg in v7;
  // build the errors object manually for the harness.
  const errors = errorMessage
    ? { [field.pdfFieldName]: { type: 'manual', message: errorMessage } }
    : formState.errors
  return (
    <FormField
      field={field}
      register={register as unknown as Parameters<typeof FormField>[0]['register']}
      errors={errors as unknown as Parameters<typeof FormField>[0]['errors']}
    />
  )
}

const baseField: TemplateField = {
  pdfFieldName: 'name',
  type: 'text',
  label: 'Numele complet',
  isRequired: false,
}

describe('FormField smoke', () => {
  it('renders a labeled text input with the right value association', () => {
    render(<Harness field={baseField} />)
    const input = screen.getByLabelText('Numele complet')
    expect(input).toBeInTheDocument()
    expect(input.tagName).toBe('INPUT')
  })

  it('marks required fields with both visual asterisk and sr-only text', () => {
    render(<Harness field={{ ...baseField, isRequired: true }} />)
    const input = screen.getByLabelText(/Numele complet/)
    expect(input).toHaveAttribute('aria-required', 'true')
    expect(input).toBeRequired()
    // sr-only "obligatoriu" is part of the accessible name
    expect(screen.getByText(/obligatoriu/i)).toBeInTheDocument()
    // The visual asterisk is aria-hidden
    const asterisk = screen.getByText('*')
    expect(asterisk).toHaveAttribute('aria-hidden', 'true')
  })

  it('exposes errors via role=alert and aria-describedby', () => {
    render(<Harness field={{ ...baseField, isRequired: true }} errorMessage="Câmp obligatoriu" />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Câmp obligatoriu')
    const input = screen.getByLabelText(/Numele complet/)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input.getAttribute('aria-describedby')).toBe(alert.id)
  })

  it('renders a textarea when isMultiline is true', () => {
    render(<Harness field={{ ...baseField, isMultiline: true }} />)
    const textarea = screen.getByLabelText('Numele complet')
    expect(textarea.tagName).toBe('TEXTAREA')
  })

  it('renders dropdown options', () => {
    render(
      <Harness
        field={{ ...baseField, type: 'dropdown', options: ['Da', 'Nu'] }}
      />,
    )
    const select = screen.getByLabelText('Numele complet') as HTMLSelectElement
    expect(select.tagName).toBe('SELECT')
    expect(screen.getByRole('option', { name: 'Da' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Nu' })).toBeInTheDocument()
  })

  it('renders radio options inside a fieldset', () => {
    render(
      <Harness
        field={{
          ...baseField,
          type: 'radio',
          isRequired: true,
          options: ['Masculin', 'Feminin'],
        }}
      />,
    )
    expect(screen.getByRole('radio', { name: 'Masculin' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Feminin' })).toBeInTheDocument()
  })
})
