/**
 * Archetype #2 — Cerere (simplă / liberă).
 *
 * The plainest request: the same cerere skeleton as cerere-tip, but the body
 * is a single large free-text area where the applicant writes the request in
 * their own words, with no pre-structured "obiectul cererii" framing.
 */

import { identityBlock } from './_shared.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'cerere',
  name: 'Cerere',
  title: 'CERERE',
  description:
    'Cerere liberă adresată unei instituții publice. Completați datele de ' +
    'identificare și redactați solicitarea, apoi descărcați PDF-ul.',
  category: 'Cereri',

  body(ctx, p) {
    p.addressee(ctx)
    identityBlock(ctx, p)

    p.multilineField(
      ctx,
      {
        label: 'Conținutul cererii',
        name: 'continut',
        required: true,
        hint: 'Redactați solicitarea dumneavoastră.',
        group: 'Conținutul cererii',
      },
      { lines: 11 },
    )

    p.signatureFooter(ctx)
  },
}

export default spec
