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
  // eDirect procedure this template belongs to; both backfilled from
  // index.json by joining on the eDirect document id baked into the
  // upload filename stem (`..._<docId>.pdf`). See Procedure.
  procedure?: string
  procedureId?: string
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
  procedure?: string
  procedureId?: string
  version: number
  visibleFieldCount: number
  archived?: boolean
  driveFileId: string
  originalDriveFileId?: string
}

// One eDirect procedure — the layer between an institution and its
// individual documents. Sourced from procedures.json (the
// fetch-procedures.mjs scrape) and lives in `procedures/{procedureId}`
// in Firestore.
//
// Document downloadUrls are nullable because non-form attachments
// (`Document scanat`, `Fotografie`, `Dovada de plata`...) carry no link.
export interface ProcedureDocument {
  nr: string
  name: string
  description?: string
  required: boolean
  eSignature: boolean
  type: string
  downloadUrl: string | null
}

export interface ProcedureOutputDocument {
  nr: string
  name: string
  type: string
  downloadUrl: string | null
}

export interface ProcedureLaw {
  nr: string
  name: string
  downloadUrl: string | null
}

export interface ProcedureRawField {
  label: string
  valueHtml: string
  valueText: string
}

// Mapped, well-known fields. Unknown labels stay in `rawFields` so the
// schema can grow without dropping data.
export interface ProcedureFields {
  descriere?: string
  caiDeAtac?: string
  dateContact?: string
  institutiaResponsabila?: string
  modalitatePrestare?: string
  timpSolutionare?: string
  termenArhivare?: string
  termenCompletareDosar?: string
  taxe?: string
  // Labels surfaced by the crawl that don't yet have a dedicated key.
  // Kept on the type so consumers can opt-in without parsing rawFields.
  notificareLaExpirareTermen?: string
  registruDeLinkuri?: string
  seAplicaAprobareaTacita?: string
}

export interface Procedure {
  procedureId: string
  title: string | null
  // Joined from index.json. The scrape itself doesn't carry these — they
  // come from the bundle listing that owns each procedureId.
  institution?: string
  county?: string | null
  city?: string | null
  // Set when the eDirect listing shows the "Procedura este informationala
  // si nu permite lansarea de solicitari" notice — the institution does
  // not accept online submissions for this procedure.
  informational: boolean
  informationalNotice: string | null
  fields: ProcedureFields
  // rawFields preserved on the full Firestore record; the slimmed
  // bundle in public/procedures.json drops them.
  rawFields?: ProcedureRawField[]
  documents: ProcedureDocument[]
  outputDocuments: ProcedureOutputDocument[]
  laws: ProcedureLaw[]
  fetchedAt?: string
}

export type FormValues = Record<string, string | boolean>
