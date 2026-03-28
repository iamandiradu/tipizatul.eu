import { z } from 'zod'
import type { Template } from '@/types/template'

export function buildZodSchema(template: Template): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {}

  for (const field of template.fields) {
    if (field.hidden) continue

    let schema: z.ZodTypeAny

    if (field.type === 'checkbox') {
      schema = z.boolean()
      if (!field.isRequired) {
        schema = schema.optional()
      }
    } else if (field.type === 'dropdown' || field.type === 'radio') {
      const options = field.options ?? []
      if (options.length > 0) {
        schema = z.enum(options as [string, ...string[]])
      } else {
        schema = z.string()
      }
      if (!field.isRequired) {
        schema = schema.optional()
      }
    } else {
      // text
      let str = z.string()

      if (field.validation?.pattern) {
        str = str.regex(
          new RegExp(field.validation.pattern),
          field.validation.customMessage ?? `Format invalid pentru câmpul "${field.label}"`,
        )
      }
      if (field.maxLength) {
        str = str.max(
          field.maxLength,
          `Maxim ${field.maxLength} caractere`,
        )
      }
      if (field.validation?.min !== undefined) {
        str = str.min(
          field.validation.min,
          field.validation.customMessage ?? `Minim ${field.validation.min} caractere`,
        )
      }

      if (field.isRequired) {
        str = str.min(1, `"${field.label}" este obligatoriu`)
        schema = str
      } else {
        schema = str.optional()
      }
    }

    shape[field.pdfFieldName] = schema
  }

  return z.object(shape)
}
