/**
 * DASM Cluj-Napoca — cerere de eliberare a adeverinței care dovedește calitatea
 * de angajat al DASM, necesară la DGASPC.
 *
 * Replica of `cerere-eliberare-adeverinte-RUS.odt`.
 */

import { ORGANIZATION, COUNTY, SERVICE_RU } from './_dasm-hr.mjs'
import { apAdeverintaBody } from './_dasm-ap-adeverinta.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-ap-adeverinta-resurse-umane',
  name: 'Cerere adeverință calitate de angajat — asistent personal (Resurse Umane)',
  title: 'CERERE',
  description:
    'Cererea prin care un asistent personal solicită Serviciului Resurse Umane, Salarizare al ' +
    'Direcției de Asistență Socială și Medicală Cluj-Napoca o adeverință care să dovedească ' +
    'calitatea de angajat, necesară de regulă la DGASPC.',
  category: 'Resurse umane',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    apAdeverintaBody(ctx, p, {
      service: SERVICE_RU,
      registryLine: 'Nr. de înregistrare ______________ /804/ ______________',
    })
  },
}

export default spec
