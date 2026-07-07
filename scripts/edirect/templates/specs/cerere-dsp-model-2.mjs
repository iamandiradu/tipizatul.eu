/**
 * National „Modelul nr. 2" (Legea farmaciei 266/2008) — request to the county
 * DSP to schedule the pharmacy-unit inspection (Raport de inspecție +
 * Decizie de conformitate). Faithful replica; see _dsp-farma.mjs.
 */

import { dspFarmaBody } from './_dsp-farma.mjs'

const body = dspFarmaBody({
  requestText:
    'Vă rog să planificați inspecția la unitatea farmaceutică aflată la adresa ' +
    'de mai jos, în vederea emiterii Raportului de inspecție de verificare a ' +
    'conformității spațiului unității farmaceutice și a Deciziei de conformitate pentru:',
})

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'cerere-dsp-model-2',
  name: 'Cerere tip către DSP (Modelul nr. 2 — inspecție unitate farmaceutică)',
  title: 'CERERE',
  description:
    'Modelul nr. 2 conform Legii farmaciei nr. 266/2008 — cerere adresată ' +
    'Direcției de Sănătate Publică județene pentru planificarea inspecției ' +
    'unei unități farmaceutice.',
  category: 'Cereri',

  body(ctx, p, instance) {
    // Model 2 is addressed to the COUNTY DSP — the county is the only variable
    // part, so the addressee slot carries it (baked per-DSP, or an editable
    // required field on the generic build).
    p.addressee(ctx, {
      lead: 'Către,',
      label: 'Direcția de Sănătate Publică a Județului',
      name: 'dsp_judet',
    })
    body(ctx, p, instance)
  },
}

export default spec
