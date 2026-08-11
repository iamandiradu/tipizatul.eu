/**
 * Archetype #12 — Cerere de eliberare a unui certificat / adeverințe.
 *
 * The cerere skeleton plus the fields a "cerere eliberare certificat" carries:
 * which certificate is requested, the purpose, and the number of copies.
 * ~39 catalog files match ("cerere eliberare certificat profesional curent").
 */

import { identityBlock } from './_shared.mjs'

const GROUP = 'Detalii certificat'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'cerere-eliberare-certificat',
  name: 'Cerere de eliberare certificat',
  title: 'CERERE DE ELIBERARE',
  description:
    'Cerere de eliberare a unui certificat sau a unei adeverințe. Indicați ' +
    'tipul documentului, scopul și numărul de exemplare.',
  category: 'Cereri',

  body(ctx, p) {
    p.addressee(ctx)
    identityBlock(ctx, p)

    p.labeledField(ctx, {
      label: 'Certificatul/adeverința solicitată',
      name: 'document_solicitat',
      required: true,
      group: GROUP,
    })

    p.twoColFields(
      ctx,
      { label: 'Scopul', name: 'scop', required: true, group: GROUP },
      { label: 'Nr. exemplare', name: 'nr_exemplare', group: GROUP },
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
