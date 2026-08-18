/**
 * Phase 3 replica — „Modelul nr. 4" (Legea farmaciei nr. 266/2008): cerere de
 * planificare a inspecției în vederea OBȚINERII autorizației de funcționare.
 * 25 files across the county DSPs.
 *
 * The only model of the three inspection requests signed by two people — the
 * administrator/manager and the farmacist-șef — and the only one that chooses
 * what the authorisation is for, because it is the request that creates one.
 * It therefore cites no existing authorisation number.
 */

import { dspInspectieBody } from './_dsp-inspectie.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'cerere-dsp-model-4',
  name: 'Cerere planificare inspecție — autorizare unitate farmaceutică (Model 4)',
  title: 'CERERE',
  description:
    'Cerere adresată Direcției de Sănătate Publică pentru planificarea ' +
    'inspecției în vederea obținerii autorizației de funcționare a unei ' +
    'unități farmaceutice (Modelul nr. 4, Legea farmaciei nr. 266/2008).',
  category: 'Cereri',
  body: dspInspectieBody({
    model: 'Modelul nr. 4',
    requestText:
      'vă rog să planificați inspecția la sediul unității aflate la adresa de mai jos, ' +
      'în vederea obținerii autorizației de funcționare.',
    withUnitTypes: true,
    dualSignatory: true,
  }),
}

export default spec
