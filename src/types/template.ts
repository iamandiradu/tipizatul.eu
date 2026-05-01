export type FieldType = 'text' | 'checkbox' | 'dropdown' | 'radio' | 'unsupported'

export interface FieldValidation {
  pattern?: string
  min?: number
  max?: number
  customMessage?: string
}

export interface TemplateField {
  pdfFieldName: string
  type: FieldType
  label: string
  placeholder?: string
  hint?: string
  group?: string
  order?: number
  isRequired: boolean
  isMultiline?: boolean
  maxLength?: number | null
  options?: string[]
  validation?: FieldValidation
  hidden?: boolean
}

export interface Template {
  id: string
  name: string
  description?: string
  category?: string
  organization?: string
  county?: string
  version: number
  createdAt: string
  fields: TemplateField[]
  archived?: boolean
  driveFileId: string
}

export type FormValues = Record<string, string | boolean>
