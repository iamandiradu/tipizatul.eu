/**
 * Shared blocks for the DASM Cluj-Napoca internal HR forms (Serviciul Resurse
 * Umane, Salarizare, and the asistenți personali set).
 *
 * These are staff-facing rather than citizen-facing: leave requests,
 * certificates, employment paperwork. They share a letterhead, an approval
 * slot the director signs, and the same „Subsemnatul(a) …, având funcția de …
 * în cadrul Serviciului/Centrului …" opening.
 *
 * The names printed on the source forms (the director, the head of service)
 * are deliberately NOT baked: a form that names whoever held the post when the
 * file was uploaded is wrong the day they change, and the signature line is
 * signed by hand anyway.
 */

export const ORGANIZATION = 'Direcția de Asistență Socială și Medicală Cluj-Napoca'
export const COUNTY = 'Cluj'
export const SERVICE_RU = 'Serviciul Resurse Umane, Salarizare'

/** The institution letterhead these forms carry, plus the approval slot. */
export function hrHeader(ctx, p, { service = SERVICE_RU, approval = true, compartment } = {}) {
  p.paragraph(
    ctx,
    'ROMÂNIA · JUDEȚUL CLUJ · CONSILIUL LOCAL AL MUNICIPIULUI CLUJ-NAPOCA',
    { size: 9, gap: 2 },
  )
  p.paragraph(ctx, `DIRECȚIA DE ASISTENȚĂ SOCIALĂ ȘI MEDICALĂ · ${service}`, { size: 9, gap: 6 })
  p.paragraph(
    ctx,
    compartment
      ? `Nr. ______________ /${compartment}/ ______________`
      : 'Nr. ______________ / ______________',
    { size: 10, gap: approval ? 4 : 12 },
  )
  if (approval) {
    p.paragraph(ctx, 'Aprobat, Director executiv: ____________________', { size: 10, gap: 12 })
  }
}

/** „Subsemnatul(a) …, având funcția de … în cadrul Serviciului/Centrului …" */
export function employeeRows(ctx, p, { group = 'Salariat', cnp = false, address = false } = {}) {
  p.labeledField(ctx, {
    label: 'Subsemnatul/a (nume și prenume)', name: 'nume_si_prenume', required: true, group,
  })
  if (cnp) p.labeledField(ctx, { label: 'CNP', name: 'cnp', required: true, group })
  if (address) {
    p.labeledField(ctx, { label: 'Domiciliat/ă în', name: 'adresa', required: true, group })
    p.labeledField(ctx, { label: 'Str., nr., bl., ap.', name: 'adresa_detalii', group })
  }
  p.twoColFields(
    ctx,
    { label: 'Având funcția de', name: 'functia', required: true, group },
    { label: 'În cadrul Serviciului/Centrului', name: 'serviciu', required: true, group },
  )
}
