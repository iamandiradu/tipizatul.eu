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

// Where the AcroForm in `driveFileId` came from.
//   'original'  — the source institution's PDF already contained an
//                 AcroForm. Field labels can be trusted as-is.
//   'generated' — our detection pipeline (paddle or llm) produced the
//                 AcroForm from a non-fillable source. Labels are
//                 statistically reliable but need review before they
//                 become a public "completabil online" promise.
// Missing (undefined) on legacy templates uploaded before this field
// existed. Filters that surface only trustworthy forms must treat
// undefined as not-original.
export type AcroFormOrigin = 'original' | 'generated'

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
  // The eDirect listing record id (index.json `id`). Lets us match this
  // editable template back to a specific entry in `procedure.documents[]`
  // so the procedure detail page can offer a "Completează online" link
  // next to the right document.
  eDirectDocId?: string
  // Every eDirect document this one template serves. Authored archetypes are
  // published once and shared by all the documents that matched them (decision
  // 1: one generic template + `?institution=` prefill, no stamped instances),
  // so a single `eDirectDocId` cannot express the join — 23 archetypes cover
  // ~1,291 files. `eDirectDocId` stays as the primary/back-compat key for
  // one-to-one detected templates; readers should consult both.
  eDirectDocIds?: string[]
  version: number
  createdAt: string
  fields: TemplateField[]
  // Authored-archetype spec id (scripts/edirect/templates/specs/<id>.mjs)
  // this template was generated from. Lets the catalog group "the same form
  // at other institutions" and ties a published template back to its spec
  // for regeneration. Absent on hand-annotated and detected templates.
  archetype?: string
  archived?: boolean
  // Mean confidence of the field detector that produced this AcroForm, 0..1.
  // Written by upload-templates.mjs. Only meaningful when the AcroForm was
  // generated — an 'original' form had nothing to detect, and an authored
  // replica was written by hand, so both ignore it.
  detectorConfidence?: number
  // Set by the upload pipeline when the detector's output looked unreliable
  // (low confidence, no fields found, or far fewer AcroForm fields than the
  // detector expected). Surfaced to users as an explicit caution.
  needsReview?: boolean
  driveFileId: string
  // Drive file id of the truly-untouched bundle PDF (no AcroForm fields,
  // straight from eDirect). Optional during the backfill rollout.
  originalDriveFileId?: string
  acroFormOrigin?: AcroFormOrigin
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
  eDirectDocId?: string
  // Every eDirect document this one template serves. Authored archetypes are
  // published once and shared by all the documents that matched them (decision
  // 1: one generic template + `?institution=` prefill, no stamped instances),
  // so a single `eDirectDocId` cannot express the join — 23 archetypes cover
  // ~1,291 files. `eDirectDocId` stays as the primary/back-compat key for
  // one-to-one detected templates; readers should consult both.
  eDirectDocIds?: string[]
  version: number
  visibleFieldCount: number
  archetype?: string
  archived?: boolean
  detectorConfidence?: number
  needsReview?: boolean
  driveFileId: string
  originalDriveFileId?: string
  acroFormOrigin?: AcroFormOrigin
  voteCount?: VoteCount
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
  // eDirect listing record id, joined in by build-procedures.mjs from
  // index.json. Same key Templates carry, so the procedure detail page
  // can pair this document with its editable Template if one exists.
  eDirectDocId?: string
  // Drive file id of our byte-identical copy of `downloadUrl`, written by
  // mirror-documents.mjs. Present only for documents we managed to mirror;
  // `downloadUrl` stays the fallback (and the attribution link) for the rest.
  // Served via /api/file — not /api/pdf, since most source documents are
  // .doc/.docx rather than PDFs.
  mirrorFileId?: string
  // Extension and MIME of the mirrored bytes, carried so the UI can label the
  // download ("DOCX · 42 KB") without a round-trip to Drive.
  mirrorExt?: string
  mirrorMimeType?: string
  mirrorBytes?: number
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
