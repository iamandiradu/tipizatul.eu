/**
 * DASM Cluj-Napoca — cerere de eliberare a unei adeverințe de la Serviciul
 * Financiar, Contabilitate, Buget (medic, spitalizare, venit net, bancă, burse
 * școlare, locuințe sociale).
 *
 * Replica of `cerere-eliberare-adeverinte-FINANCIAR-1.odt`.
 */

import { ORGANIZATION, COUNTY } from './_dasm-hr.mjs'
import { apAdeverintaBody } from './_dasm-ap-adeverinta.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-ap-adeverinta-financiar',
  name: 'Cerere adeverință de venit — asistent personal (Financiar)',
  title: 'CERERE',
  description:
    'Cererea prin care un asistent personal solicită Serviciului Financiar, Contabilitate, Buget ' +
    'al Direcției de Asistență Socială și Medicală Cluj-Napoca o adeverință necesară la medic, ' +
    'spitalizare, pentru venitul net, la bancă, pentru burse școlare sau pentru locuințe sociale.',
  category: 'Resurse umane',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    apAdeverintaBody(ctx, p, {
      service: 'Serviciul Financiar, Contabilitate, Buget',
      registryLine: 'Nr. ______________ / ______________ / ______________',
    })
  },
}

export default spec
