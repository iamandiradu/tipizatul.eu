/**
 * DASM Cluj-Napoca — cerere de concediu de odihnă pentru personalul
 * cabinetelor medicale.
 *
 * Replica of `cerere-concediu-odihna-Cabinete-Medicale.doc`. Same instrument as
 * dasm-cj-hr-concediu-odihna, but the cabinet version names a single
 * replacement rather than a delegation table, and carries the cabinet doctor's
 * endorsement alongside the head of service.
 */

import { ORGANIZATION, COUNTY, hrHeader, employeeRows } from './_dasm-hr.mjs'

const C = 'Concediul solicitat'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-hr-concediu-odihna-cabinete',
  name: 'Cerere de concediu de odihnă — cabinete medicale',
  title: 'CERERE DE CONCEDIU',
  description:
    'Cererea de concediu de odihnă pentru personalul cabinetelor medicale din cadrul Direcției de ' +
    'Asistență Socială și Medicală Cluj-Napoca, cu înlocuitorul pe durata concediului și ' +
    'referatul Serviciului Resurse Umane, Salarizare.',
  category: 'Resurse umane',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    hrHeader(ctx, p, { service: 'Serviciul Resurse Umane, Salarizare · Cabinete medicale' })
    employeeRows(ctx, p)

    p.paragraph(ctx, 'vă rog a-mi aproba concediul de odihnă, după cum urmează:', { size: 11, gap: 6 })
    p.twoColFields(
      ctx,
      { label: 'Număr de zile lucrătoare', name: 'zile_solicitate', required: true, maxLength: 3, group: C },
      { label: 'Din concediul de odihnă pe anul', name: 'anul_concediului', required: true, maxLength: 4, group: C },
    )
    p.twoColFields(
      ctx,
      { label: 'De la data de', name: 'data_inceput', required: true, group: C },
      { label: 'Până la data de (inclusiv)', name: 'data_sfarsit', required: true, group: C },
    )
    p.labeledField(ctx, { label: 'Fiind programat/ă pentru perioada', name: 'perioada_programata', group: C })
    p.labeledField(ctx, {
      label: 'Pe durata concediului de odihnă voi fi înlocuit/ă de către',
      name: 'inlocuitor',
      required: true,
      group: C,
    })

    p.signatureFooter(ctx, { signatureLabel: 'Semnătura salariatului' })
    p.paragraph(ctx, 'Șef serviciu: ____________________     Avizat medic cabinet: ____________________', { size: 10, gap: 12 })

    const R = 'Referat — Serviciul Resurse Umane, Salarizare'
    p.paragraph(ctx, 'REFERAT — Serviciul Resurse Umane, Salarizare', { size: 11, gap: 6 })
    p.twoColFields(
      ctx,
      { label: 'Zile de concediu rămase pe anul curent', name: 'referat_zile_ramase', maxLength: 3, group: R },
      { label: 'Din care solicită', name: 'referat_zile_solicitate', maxLength: 3, group: R },
    )
    p.twoColFields(
      ctx,
      { label: 'Anul următor', name: 'referat_an', maxLength: 4, group: R },
      { label: 'Zile de concediu la care are dreptul', name: 'referat_zile_an', maxLength: 3, group: R },
    )
  },
}

export default spec
