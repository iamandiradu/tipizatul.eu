/**
 * DASM Cluj-Napoca — cerere pentru eliberarea extrasului din registrul general
 * de evidență a salariaților (REGES).
 *
 * Replica of `Formular-REGES.doc`. Short by design: the extract's content is
 * fixed by law (activity, duration, salary, seniority in work and in
 * speciality), so the form only identifies who is asking.
 */

import { ORGANIZATION, COUNTY, SERVICE_RU, hrHeader, employeeRows } from './_dasm-hr.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-hr-extras-reges',
  name: 'Cerere extras REGES',
  title: 'CERERE',
  description:
    'Cererea prin care un salariat al Direcției de Asistență Socială și Medicală Cluj-Napoca ' +
    'solicită extrasul din registrul general de evidență a salariaților (REGES), care atestă ' +
    'activitatea desfășurată, durata activității, salariul, vechimea în muncă și în specialitate.',
  category: 'Resurse umane',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    hrHeader(ctx, p, { approval: false })
    p.addressee(ctx, { baked: SERVICE_RU, bakedAddress: 'Direcția de Asistență Socială și Medicală Cluj-Napoca' })

    employeeRows(ctx, p)

    p.paragraph(
      ctx,
      'vă rog a-mi elibera extras din registrul general de evidență a salariaților (REGES) care să ' +
        'ateste activitatea desfășurată, durata activității, salariul, vechimea în muncă și în ' +
        'specialitate.',
      { size: 11, gap: 8 },
    )

    p.signatureFooter(ctx)
  },
}

export default spec
