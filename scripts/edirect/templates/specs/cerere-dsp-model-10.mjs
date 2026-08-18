/**
 * Phase 3 replica — „Model nr. 10" (Legea farmaciei nr. 266/2008): cerere de
 * planificare a inspecției la NOUL sediu al unei unități farmaceutice deja
 * autorizate. 25 files across the county DSPs.
 *
 * Differs from Model 13 only in the request sentence: this one covers a move
 * to a new address, Model 13 covers changes to the existing space. Same
 * skeleton otherwise, which is why both share _dsp-inspectie.mjs.
 */

import { dspInspectieBody } from './_dsp-inspectie.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'cerere-dsp-model-10',
  name: 'Cerere planificare inspecție — sediu nou al unității farmaceutice (Model 10)',
  title: 'CERERE',
  description:
    'Cerere adresată Direcției de Sănătate Publică pentru planificarea ' +
    'inspecției la noul sediu cu activitate al unei unități farmaceutice, ' +
    'în vederea verificării condițiilor de autorizare (Model nr. 10, ' +
    'Legea farmaciei nr. 266/2008).',
  category: 'Cereri',
  body: dspInspectieBody({
    model: 'Model nr. 10',
    requestText:
      'vă rog să planificați inspecția la noul sediu cu activitate al unității ' +
      'farmaceutice aflat la adresa de mai jos, în vederea verificării ' +
      'condițiilor de autorizare.',
    withAutorizatie: true,
  }),
}

export default spec
