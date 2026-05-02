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
  // Drive file id of the truly-untouched bundle PDF (no AcroForm fields,
  // straight from eDirect). Optional during the backfill rollout.
  originalDriveFileId?: string
  // Denormalized vote counters; the source of truth is the
  // `templates/{id}/votes/{deviceId}` sub-collection. Both fields default to
  // 0 when missing (templates that have never been voted on).
  voteCount?: VoteCount
}

export interface VoteCount {
  up: number
  down: number
  // ISO timestamp of the most recent vote write, used by the admin sort.
  lastVoteAt?: string
}

export type VoteValue = 1 | -1

export interface Vote {
  // Mirrors the doc id; lets rules require self-identification on writes.
  deviceId: string
  value: VoteValue
  comment?: string
  createdAt: string
  updatedAt: string
}

// Catalog/admin list entries — same shape minus the heavy `fields[]` array,
// with a precomputed `visibleFieldCount` for the card label. Read in bulk
// from the `catalog/index` aggregate doc.
export interface SlimTemplate {
  id: string
  name: string
  description?: string
  category?: string
  organization?: string
  county?: string
  version: number
  visibleFieldCount: number
  archived?: boolean
  driveFileId: string
  originalDriveFileId?: string
}

export type FormValues = Record<string, string | boolean>
