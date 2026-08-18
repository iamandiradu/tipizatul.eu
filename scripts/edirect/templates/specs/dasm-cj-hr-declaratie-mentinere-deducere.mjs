/**
 * DASM Cluj-Napoca — Anexa 3: declarația anuală că nu s-au schimbat condițiile
 * pe baza cărora s-a acordat deducerea personală.
 *
 * Replica of `Declaratie-pe-proprie-raspundere-anexa-32.pdf`. Filed at the
 * start of each year to confirm that the previous year's deduction still
 * applies, which is why the year being confirmed is a field.
 */

import { ORGANIZATION, COUNTY } from './_dasm-hr.mjs'

const G = 'Declarant'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-hr-declaratie-mentinere-deducere',
  name: 'Declarație privind menținerea condițiilor de deducere personală (Anexa 3)',
  title: 'DECLARAȚIE PE PROPRIE RĂSPUNDERE',
  description:
    'Declarația salariatului că nu s-au schimbat condițiile în baza cărora a beneficiat de ' +
    'deducere personală și că îndeplinește condițiile prevăzute la art. 77 din Legea nr. 227/2015 ' +
    'privind Codul fiscal (Anexa 3).',
  category: 'Declarații',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    p.paragraph(ctx, 'Anexa 3', { size: 9, gap: 10 })

    p.labeledField(ctx, { label: 'Subsemnatul/a (nume și prenume)', name: 'nume_si_prenume', required: true, group: G })
    p.twoColFields(
      ctx,
      { label: 'Domiciliat/ă în localitatea', name: 'localitate', required: true, group: G },
      { label: 'Județul', name: 'judet', group: G },
    )
    p.labeledField(ctx, { label: 'Strada, nr., bl., sc., ap., sectorul', name: 'adresa', required: true, group: G })
    p.combField(ctx, { label: 'Codul numeric personal', name: 'cnp', required: true, group: G }, { cells: 13 })

    p.labeledField(ctx, {
      label: 'Declar pe propria răspundere că nu s-au schimbat condițiile în baza cărora am beneficiat de deducere personală în anul',
      name: 'an',
      required: true,
      maxLength: 4,
      group: G,
    })
    p.paragraph(
      ctx,
      'și că îndeplinesc condițiile prevăzute la art. 77 din Legea nr. 227/2015 privind Codul ' +
        'fiscal. De asemenea, mă angajez să anunț în termen de 3 zile, în scris, atunci când ' +
        'persoanele declarate în întreținere nu mai îndeplinesc condițiile prevăzute de art. 77 din ' +
        'Legea nr. 227/2015 privind Codul fiscal.',
      { size: 10, gap: 8 },
    )

    p.signatureFooter(ctx)
  },
}

export default spec
