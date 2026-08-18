/**
 * DASM Cluj-Napoca — cerere pentru acordarea zilelor libere plătite pentru
 * evenimente familiale (art. 24 alin. (1) lit. b) din H.G. nr. 250/1992).
 *
 * Replica of `Cerere-pentru-acordarea-zilelor-platite-pentru-evenimente-
 * familiale.pdf`, including the closing NOTĂ in which the HR service states the
 * entitlement for the event declared.
 */

import { ORGANIZATION, COUNTY, hrHeader, employeeRows } from './_dasm-hr.mjs'

const C = 'Zilele libere solicitate'
const N = 'Notă — Serviciul Resurse Umane, Salarizare'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-hr-zile-libere-evenimente',
  name: 'Cerere zile libere plătite pentru evenimente familiale',
  title: 'CERERE PENTRU ACORDAREA ZILELOR PLĂTITE PENTRU EVENIMENTE FAMILIALE',
  description:
    'Cererea salariaților Direcției de Asistență Socială și Medicală Cluj-Napoca pentru acordarea ' +
    'zilelor libere plătite pentru evenimente familiale, conform art. 24 alin. (1) lit. b) din ' +
    'H.G. nr. 250/1992.',
  category: 'Resurse umane',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    hrHeader(ctx, p)
    employeeRows(ctx, p)

    p.paragraph(
      ctx,
      'Conform prevederilor art. 24 alin. (1) lit. b) din H.G. nr. 250/1992, vă rog să-mi aprobați:',
      { size: 10.5, gap: 6 },
    )
    p.twoColFields(
      ctx,
      { label: 'Număr de zile libere plătite', name: 'zile_solicitate', required: true, maxLength: 3, group: C },
      { label: 'În perioada', name: 'perioada', required: true, group: C },
    )
    p.labeledField(ctx, {
      label: 'Pentru următoarele evenimente familiale', name: 'eveniment', required: true, group: C,
    })
    p.multilineField(
      ctx,
      { label: 'Anexez prezentei următoarele documente (în copie)', name: 'documente_anexate', group: C },
      { lines: 3 },
    )

    p.signatureFooter(ctx, { signatureLabel: 'Semnătura salariatului' })
    p.paragraph(ctx, 'Șef serviciu: ____________________', { size: 10, gap: 12 })

    p.paragraph(ctx, 'NOTĂ — Serviciul Resurse Umane, Salarizare', { size: 11, gap: 6 })
    p.paragraph(
      ctx,
      'Conform prevederilor legale în vigoare, salariatul are dreptul la numărul de zile libere ' +
        'plătite menționat mai jos, având anexate documentele doveditoare.',
      { size: 9.5, gap: 4 },
    )
    p.twoColFields(
      ctx,
      { label: 'Zile libere plătite la care are dreptul', name: 'nota_zile', maxLength: 3, group: N },
      { label: 'Pentru evenimentul', name: 'nota_eveniment', group: N },
    )
  },
}

export default spec
