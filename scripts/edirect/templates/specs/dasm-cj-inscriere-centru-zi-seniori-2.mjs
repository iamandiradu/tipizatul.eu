/**
 * DASM Cluj-Napoca — cerere de înscriere la Centrul de zi pentru seniori nr. 2.
 * Replica of `Cerere-de-inscriere-la-Centrul-de-zi-pentru-seniori-nr.-2.odt`.
 */

import { ORGANIZATION, COUNTY } from './_dasm-cluj.mjs'
import { czvBody } from './_dasm-czv.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-inscriere-centru-zi-seniori-2',
  name: 'Cerere înscriere — Centrul de zi pentru seniori nr. 2',
  title: 'CERERE DE ÎNSCRIERE',
  description:
    'Cerere de înscriere la activitățile Centrului de zi pentru seniori nr. 2 din structura ' +
    'Direcției de Asistență Socială și Medicală Cluj-Napoca.',
  category: 'Asistență socială',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    czvBody(ctx, p, {
      centre: 2,
      exclusivity: 'alt centru de zi sau la alt club de pensionari',
    })
  },
}

export default spec
