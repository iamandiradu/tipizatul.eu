/**
 * Archetype #17 — Contract de comodat (împrumut de folosință).
 *
 * Two-party gratuitous loan-for-use contract (art. 2146–2157 Cod civil) —
 * commonly required for registering a firm at a home address or using a
 * vehicle. Google top-10; absent from the public-institution catalog.
 */

import { partyBlock } from './_shared.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'contract-comodat',
  name: 'Contract de comodat',
  title: 'CONTRACT DE COMODAT',
  description:
    'Contract de comodat (împrumut de folosință) conform art. 2146–2157 din ' +
    'Codul civil — transmiterea gratuită a folosinței unui bun.',
  category: 'Contracte',

  body(ctx, p) {
    p.paragraph(ctx, 'I. Părțile contractante', { size: 12, gap: 6 })

    partyBlock(ctx, p, {
      prefix: 'comodant',
      heading: 'Comodantul (cel care dă bunul în folosință):',
      group: 'Comodant',
    })
    partyBlock(ctx, p, {
      prefix: 'comodatar',
      heading: 'Comodatarul (cel care primește bunul în folosință):',
      group: 'Comodatar',
    })

    p.paragraph(ctx, 'II. Obiectul contractului', { size: 12, gap: 6 })
    p.paragraph(
      ctx,
      'Comodantul transmite comodatarului, cu titlu gratuit, folosința ' +
        'următorului bun (descriere, adresă sau elemente de identificare):',
      { size: 11, gap: 6 },
    )
    p.multilineField(
      ctx,
      { label: 'Bunul dat în folosință', name: 'obiect_contract', required: true, group: 'Obiect' },
      { lines: 4 },
    )

    p.paragraph(ctx, 'III. Durata contractului', { size: 12, gap: 6 })
    p.twoColFields(
      ctx,
      { label: 'De la data', name: 'durata_de_la', required: true, group: 'Durată' },
      { label: 'Până la data', name: 'durata_pana_la', group: 'Durată' },
    )

    p.paragraph(ctx, 'IV. Obligațiile părților', { size: 12, gap: 6 })
    p.paragraph(
      ctx,
      'Comodatarul se obligă să folosească bunul potrivit destinației sale, ' +
        'să suporte cheltuielile de folosință, să nu cedeze folosința unei ' +
        'terțe persoane fără acordul comodantului și să restituie bunul la ' +
        'împlinirea termenului. Comodantul se obligă să predea bunul spre ' +
        'folosință și să nu îl împiedice pe comodatar în folosința acestuia ' +
        'până la termenul convenit. Prezentul contract este cu titlu gratuit.',
      { size: 10.5, gap: 8 },
    )

    p.multilineField(
      ctx,
      { label: 'V. Alte clauze (opțional)', name: 'alte_clauze', group: 'Clauze' },
      { lines: 3 },
    )

    p.twoColFields(
      ctx,
      { label: 'Încheiat astăzi (data)', name: 'data', required: true, group: 'Semnături' },
      { label: 'În număr de exemplare', name: 'nr_exemplare', group: 'Semnături' },
    )
    p.twoColFields(
      ctx,
      { label: 'Semnătura comodant', name: 'semnatura_comodant', group: 'Semnături' },
      { label: 'Semnătura comodatar', name: 'semnatura_comodatar', group: 'Semnături' },
    )
  },
}

export default spec
