/**
 * Archetype #1 — Cerere tip (generic application/request to an institution).
 *
 * This is the skeleton ~1,750 catalog files share: institution header →
 * applicant identity block → request body → date + signature. Authoring it
 * once and stamping the institution slot replaces field detection on all of
 * them. See TOP-20-ARCHETYPES.md.
 */

import { identityBlock } from './_shared.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'cerere-tip',
  name: 'Cerere tip',
  title: 'CERERE',
  description:
    'Cerere tip adresată unei instituții publice. Completați datele de ' +
    'identificare și obiectul cererii, apoi descărcați PDF-ul gata de semnat.',
  category: 'Cereri',

  body(ctx, p) {
    // Required institution slot — baked when an instance is supplied, an
    // editable required field otherwise. Always lands in the first rows.
    p.addressee(ctx)

    identityBlock(ctx, p)

    p.paragraph(
      ctx,
      'Prin prezenta, vă rog să binevoiți a aproba următoarea solicitare:',
      { size: 11, gap: 10 },
    )

    p.multilineField(
      ctx,
      {
        label: 'Obiectul cererii',
        name: 'obiectul_cererii',
        required: true,
        hint: 'Descrieți clar și concis ce solicitați.',
        group: 'Conținutul cererii',
      },
      { lines: 7 },
    )

    p.paragraph(
      ctx,
      'Vă mulțumesc pentru solicitudine.',
      { size: 11, gap: 6 },
    )

    p.signatureFooter(ctx)
  },
}

export default spec
