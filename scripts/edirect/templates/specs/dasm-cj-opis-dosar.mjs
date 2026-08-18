/**
 * DASM Cluj-Napoca — OPIS: lista actelor anexate la dosarul de alocație,
 * indemnizație creștere copil sau stimulent de inserție.
 *
 * Replica of `opis.pdf`, which the forms page attaches to all four
 * alocații/indemnizații groups. Twelve numbered lines on the source, kept as
 * twelve fields — the clerk checks the file against them one by one.
 */

import { ORGANIZATION, COUNTY } from './_dasm-cluj.mjs'

const G = 'Date de identificare'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-opis-dosar',
  name: 'Opis — acte anexate la dosar',
  title: 'OPIS',
  description:
    'Opisul actelor anexate la dosarul depus la Direcția de Asistență Socială și Medicală ' +
    'Cluj-Napoca (alocație de stat, indemnizație creștere copil, stimulent de inserție).',
  category: 'Cereri',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    p.labeledField(ctx, { label: 'La dosarul cu nr.', name: 'dosar_nr', required: true, group: G })
    p.labeledField(ctx, { label: 'Subsemnata/ul (nume și prenume)', name: 'nume_si_prenume', required: true, group: G })
    p.labeledField(ctx, {
      label: 'Domiciliat/ă în municipiul Cluj-Napoca, str.', name: 'adresa', required: true, group: G,
    })
    p.twoColFields(
      ctx,
      { label: 'Nr.', name: 'nr', maxLength: 8, group: G },
      { label: 'Ap.', name: 'ap', maxLength: 8, group: G },
    )
    p.twoColFields(
      ctx,
      { label: 'B.I./C.I. seria și nr.', name: 'act_identitate', required: true, group: G },
      { label: 'CNP', name: 'cnp', required: true, group: G },
    )

    p.paragraph(
      ctx,
      'declar pe proprie răspundere că anexez la dosar următoarele acte:',
      { size: 11, gap: 6 },
    )
    for (let i = 1; i <= 12; i++) {
      p.labeledField(ctx, { label: `${i}.`, name: `act_${i}`, group: 'Acte anexate' })
    }

    p.paragraph(
      ctx,
      'Am luat la cunoștință că informațiile din prezenta cerere și din actele atașate la aceasta ' +
        'vor fi prelucrate de DASM/ANPIS/AJPIS cu respectarea prevederilor Regulamentului (UE) ' +
        '2016/679 privind protecția persoanelor fizice în ceea ce privește prelucrarea datelor cu ' +
        'caracter personal și libera circulație a acestor date.',
      { size: 9, gap: 8 },
    )
    p.signatureFooter(ctx)
  },
}

export default spec
