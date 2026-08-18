/**
 * Phase 3 replica — „Modelul nr. 13" (Legea farmaciei nr. 266/2008): cerere de
 * planificare a inspecției ca urmare a modificărilor aduse spațiului unei
 * unități farmaceutice. 27 files across the county DSPs — the widest-reaching
 * of the three inspection models.
 */

import { dspInspectieBody } from './_dsp-inspectie.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'cerere-dsp-model-13',
  name: 'Cerere planificare inspecție — modificări aduse spațiului (Model 13)',
  title: 'CERERE',
  description:
    'Cerere adresată Direcției de Sănătate Publică pentru planificarea ' +
    'inspecției în vederea verificării condițiilor de autorizare, ca urmare a ' +
    'modificărilor aduse spațiului unității farmaceutice (Modelul nr. 13, ' +
    'Legea farmaciei nr. 266/2008).',
  category: 'Cereri',
  body: dspInspectieBody({
    model: 'Modelul nr. 13',
    requestText:
      'vă rog să planificați inspecția la sediul unității aflat la adresa de mai ' +
      'jos, în vederea verificării condițiilor de autorizare, ca urmare a ' +
      'modificărilor aduse spațiului unității farmaceutice.',
    withAutorizatie: true,
  }),
}

export default spec
