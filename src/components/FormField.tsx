import { useId } from 'react'
import type { TemplateField } from '@/types/template'
import type { UseFormRegister, FieldErrors } from 'react-hook-form'

interface FormFieldProps {
  field: TemplateField
  register: UseFormRegister<Record<string, unknown>>
  errors: FieldErrors<Record<string, unknown>>
}

const inputClass = 'block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm text-base focus:border-blue-500 focus:outline-none px-3 py-2 placeholder:text-gray-400 dark:placeholder:text-gray-500'

export default function FormField({ field, register, errors }: FormFieldProps) {
  const error = errors[field.pdfFieldName]
  const id = `field-${field.pdfFieldName}`
  const reactId = useId()
  const errorId = `${reactId}-error`
  const hintId = `${reactId}-hint`
  const describedBy = error ? errorId : field.hint ? hintId : undefined

  const labelEl = (
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {field.label}
      {field.isRequired && (
        <>
          <span className="text-red-500 ml-1" aria-hidden="true">*</span>
          <span className="sr-only"> (obligatoriu)</span>
        </>
      )}
    </label>
  )

  const errorEl = error && (
    <p id={errorId} role="alert" className="text-xs text-red-600 dark:text-red-400 mt-1">{String(error.message)}</p>
  )

  const hintEl = field.hint && !error && (
    <p id={hintId} className="text-xs text-gray-400 dark:text-gray-500 mt-1">{field.hint}</p>
  )

  if (field.type === 'checkbox') {
    return (
      <div className="flex items-start gap-2">
        <input
          id={id}
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600"
          aria-invalid={error ? true : undefined}
          aria-required={field.isRequired || undefined}
          aria-describedby={describedBy}
          {...register(field.pdfFieldName)}
        />
        <div>
          <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {field.label}
          </label>
          {hintEl}
          {errorEl}
        </div>
      </div>
    )
  }

  if (field.type === 'dropdown') {
    return (
      <div>
        {labelEl}
        <select
          id={id}
          className={inputClass}
          required={field.isRequired}
          aria-invalid={error ? true : undefined}
          aria-required={field.isRequired || undefined}
          aria-describedby={describedBy}
          {...register(field.pdfFieldName)}
        >
          <option value="">— Selectați —</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {hintEl}
        {errorEl}
      </div>
    )
  }

  if (field.type === 'radio') {
    return (
      <fieldset>
        <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {field.label}
          {field.isRequired && (
            <>
              <span className="text-red-500 ml-1" aria-hidden="true">*</span>
              <span className="sr-only"> (obligatoriu)</span>
            </>
          )}
        </legend>
        <div className="space-y-1">
          {(field.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                value={opt}
                className="h-4 w-4 border-gray-300 dark:border-gray-600 text-blue-600"
                aria-invalid={error ? true : undefined}
                aria-required={field.isRequired || undefined}
                aria-describedby={describedBy}
                {...register(field.pdfFieldName)}
              />
              {opt}
            </label>
          ))}
        </div>
        {hintEl}
        {errorEl}
      </fieldset>
    )
  }

  if (field.isMultiline) {
    return (
      <div>
        {labelEl}
        <textarea
          id={id}
          rows={3}
          maxLength={field.maxLength ?? undefined}
          placeholder={field.placeholder}
          className={`${inputClass} resize-y`}
          required={field.isRequired}
          aria-invalid={error ? true : undefined}
          aria-required={field.isRequired || undefined}
          aria-describedby={describedBy}
          {...register(field.pdfFieldName)}
        />
        {hintEl}
        {errorEl}
      </div>
    )
  }

  return (
    <div>
      {labelEl}
      <input
        id={id}
        type="text"
        maxLength={field.maxLength ?? undefined}
        placeholder={field.placeholder}
        className={inputClass}
        required={field.isRequired}
        aria-invalid={error ? true : undefined}
        aria-required={field.isRequired || undefined}
        aria-describedby={describedBy}
        {...register(field.pdfFieldName)}
      />
      {hintEl}
      {errorEl}
    </div>
  )
}
