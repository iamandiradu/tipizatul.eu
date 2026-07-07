/**
 * Archetype #9 — Cerere de recunoaștere (diplome / titluri / calificări).
 *
 * The cerere skeleton plus the fields specific to recognition of a foreign
 * document: what is being recognized, the issuing institution, the issuing
 * country, and the year. ~41 catalog files match (mostly university/CNRED).
 */

import { identityBlock } from './_shared.mjs'

const GROUP = 'Actul supus recunoașterii'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'cerere-recunoastere',
  name: 'Cerere de recunoaștere',
  title: 'CERERE DE RECUNOAȘTERE',
  description:
    'Cerere de recunoaștere a unei diplome, a unui titlu sau a unei calificări ' +
    'obținute în străinătate.',
  category: 'Cereri',

  body(ctx, p) {
    p.addressee(ctx)
    identityBlock(ctx, p)

    p.labeledField(ctx, {
      label: 'Actul/titlul supus recunoașterii',
      name: 'act_recunoastere',
      required: true,
      group: GROUP,
    })

    p.labeledField(ctx, {
      label: 'Instituția emitentă',
      name: 'institutia_emitenta',
      required: true,
      group: GROUP,
    })

    p.twoColFields(
      ctx,
      { label: 'Țara emitentă', name: 'tara', required: true, group: GROUP },
      { label: 'Anul obținerii', name: 'anul', group: GROUP },
    )

    p.multilineField(
      ctx,
      {
        label: 'Mențiuni suplimentare',
        name: 'mentiuni',
        group: GROUP,
      },
      { lines: 4 },
    )

    p.signatureFooter(ctx)
  },
}

export default spec
