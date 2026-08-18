/**
 * DASM Cluj-Napoca — bilet de voie.
 *
 * Replica of `bilet_de_voie-2.pdf`: the slip a salariat fills in to leave
 * during working hours for personal reasons, countersigned by the head of
 * service.
 */

import { ORGANIZATION, COUNTY } from './_dasm-hr.mjs'

const G = 'Bilet de voie'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-hr-bilet-de-voie',
  name: 'Bilet de voie',
  title: 'BILET DE VOIE',
  description:
    'Biletul de voie prin care un salariat al Direcției de Asistență Socială și Medicală ' +
    'Cluj-Napoca este învoit în interes personal, cu indicarea intervalului orar.',
  category: 'Resurse umane',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    p.paragraph(ctx, 'Direcția de Asistență Socială și Medicală', { size: 10, gap: 4 })
    p.twoColFields(
      ctx,
      { label: 'Nr.', name: 'numar', group: G },
      { label: 'Data', name: 'data_inregistrare', group: G },
    )

    p.labeledField(ctx, {
      label: 'Doamna/Domnul (nume și prenume)', name: 'nume_si_prenume', required: true, group: G,
    })
    p.paragraph(ctx, 'este învoit(ă) pentru interes personal:', { size: 11, gap: 6 })
    p.labeledField(ctx, { label: 'În data de', name: 'data_invoirii', required: true, group: G })
    p.twoColFields(
      ctx,
      { label: 'De la ora', name: 'ora_inceput', required: true, maxLength: 5, group: G },
      { label: 'La ora', name: 'ora_sfarsit', required: true, maxLength: 5, group: G },
    )

    p.signatureFooter(ctx, { dateLabel: 'Data', signatureLabel: 'Șef serviciu' })
  },
}

export default spec
