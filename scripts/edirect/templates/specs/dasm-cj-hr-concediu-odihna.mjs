/**
 * DASM Cluj-Napoca — cerere de concediu de odihnă (personal contractual și
 * funcționari publici).
 *
 * Replica of `Model-cerere-de-concediu.odt`. Two halves on one sheet: the
 * employee's request with the delegation of duties during the leave, and the
 * REFERAT the HR service fills in underneath with the remaining entitlement.
 * The referat is reproduced — it is part of the same document and the file is
 * not complete without it — but its fields are marked as the service's.
 */

import { ORGANIZATION, COUNTY, hrHeader, employeeRows } from './_dasm-hr.mjs'

const C = 'Concediul solicitat'
const D = 'Delegarea atribuțiilor'
const R = 'Referat — Serviciul Resurse Umane, Salarizare'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-hr-concediu-odihna',
  name: 'Cerere de concediu de odihnă',
  title: 'CERERE DE CONCEDIU DE ODIHNĂ',
  description:
    'Cererea de concediu de odihnă a salariaților Direcției de Asistență Socială și Medicală ' +
    'Cluj-Napoca, cu delegarea atribuțiilor pe durata concediului și referatul Serviciului ' +
    'Resurse Umane, Salarizare.',
  category: 'Resurse umane',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    hrHeader(ctx, p)
    employeeRows(ctx, p)

    p.paragraph(ctx, 'vă rog a-mi aproba concediul de odihnă, după cum urmează:', { size: 11, gap: 6 })
    p.twoColFields(
      ctx,
      { label: 'Număr de zile lucrătoare', name: 'zile_solicitate', required: true, maxLength: 3, group: C },
      { label: 'Din concediul de odihnă pe anul', name: 'anul_concediului', required: true, maxLength: 4, group: C },
    )
    p.twoColFields(
      ctx,
      { label: 'Din data de', name: 'data_inceput', required: true, group: C },
      { label: 'Până în data de', name: 'data_sfarsit', required: true, group: C },
    )
    p.labeledField(ctx, { label: 'Fiind programat/ă pentru perioada', name: 'perioada_programata', group: C })

    p.signatureFooter(ctx, { signatureLabel: 'Semnătura salariatului' })

    p.paragraph(ctx, 'Pe durata concediului atribuțiile postului vor fi delegate:', { size: 10.5, gap: 4 })
    p.table(ctx, {
      name: 'delegat',
      rows: 3,
      group: D,
      columns: [
        { header: 'Numele și prenumele', key: 'nume' },
        { header: 'Semnătura', key: 'semnatura', width: 110 },
        { header: 'Data', key: 'data', width: 80 },
      ],
    })
    p.multilineField(
      ctx,
      {
        label: 'Mențiuni privind atribuțiile delegate',
        name: 'mentiuni_delegare',
        hint:
          'Dacă este necesar se precizează atribuțiile delegate fiecărui salariat și, după caz, ' +
          'atribuțiile care nu se deleagă. În lipsa acestor mențiuni se consideră că toate ' +
          'atribuțiile din fișa postului sunt delegate.',
        group: D,
      },
      { lines: 3 },
    )
    p.labeledField(ctx, { label: 'Șef serviciu/centru', name: 'sef_serviciu', group: D })

    p.paragraph(ctx, 'REFERAT — Serviciul Resurse Umane, Salarizare', { size: 11, gap: 6 })
    p.twoColFields(
      ctx,
      { label: 'Zile de concediu rămase pe anul curent', name: 'referat_zile_ramase', maxLength: 3, group: R },
      { label: 'Din care solicită', name: 'referat_zile_solicitate', maxLength: 3, group: R },
    )
    p.twoColFields(
      ctx,
      { label: 'Anul', name: 'referat_an_1', maxLength: 4, group: R },
      { label: 'Zile de concediu la care are dreptul', name: 'referat_zile_an_1', maxLength: 3, group: R },
    )
    p.twoColFields(
      ctx,
      { label: 'Anul', name: 'referat_an_2', maxLength: 4, group: R },
      { label: 'Zile de concediu la care are dreptul', name: 'referat_zile_an_2', maxLength: 3, group: R },
    )
  },
}

export default spec
