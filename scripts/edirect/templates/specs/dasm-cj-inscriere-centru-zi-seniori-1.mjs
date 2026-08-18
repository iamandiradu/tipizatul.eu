/**
 * DASM Cluj-Napoca — cerere de înscriere la Centrul de zi pentru seniori nr. 1.
 * Replica of `Cerere-de-inscriere-la-Centrul-de-zi-pentru-seniori-nr.1.odt`.
 */

import { ORGANIZATION, COUNTY } from './_dasm-cluj.mjs'
import { czvBody } from './_dasm-czv.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-inscriere-centru-zi-seniori-1',
  name: 'Cerere înscriere — Centrul de zi pentru seniori nr. 1',
  title: 'CERERE DE ÎNSCRIERE',
  description:
    'Cerere de înscriere la activitățile Centrului de zi pentru seniori nr. 1 din structura ' +
    'Direcției de Asistență Socială și Medicală Cluj-Napoca.',
  category: 'Asistență socială',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    czvBody(ctx, p, {
      centre: 1,
      exclusivity: 'alt centru de zi pentru seniori din structura instituției',
    })
  },
}

export default spec
