/**
 * Archetype #3 — Cerere tip către DSP (Direcția de Sănătate Publică).
 *
 * The cerere skeleton plus the fields a DSP request typically carries: the
 * type of request/service and the unit/workplace it concerns. ~235 catalog
 * files match this ("cerere tip către DSP" + variants).
 */

import { identityBlock } from './_shared.mjs'

const GROUP = 'Detalii solicitare'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'cerere-dsp',
  name: 'Cerere tip către DSP',
  title: 'CERERE',
  description:
    'Cerere tip adresată Direcției de Sănătate Publică. Completați datele de ' +
    'identificare și detaliile solicitării.',
  category: 'Cereri',

  body(ctx, p) {
    p.addressee(ctx)
    identityBlock(ctx, p)

    p.labeledField(ctx, {
      label: 'Tipul solicitării (aviz/autorizație/notificare)',
      name: 'tip_solicitare',
      required: true,
      group: GROUP,
    })

    p.labeledField(ctx, {
      label: 'Unitatea / obiectivul vizat',
      name: 'unitate',
      group: GROUP,
    })

    p.multilineField(
      ctx,
      {
        label: 'Obiectul cererii',
        name: 'obiectul_cererii',
        required: true,
        hint: 'Descrieți solicitarea adresată DSP.',
        group: GROUP,
      },
      { lines: 6 },
    )

    p.signatureFooter(ctx)
  },
}

export default spec
