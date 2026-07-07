/**
 * National „Modelul nr. 3" (Legea farmaciei 266/2008) — request to the Health
 * Ministry for the pharmacy-unit operating authorization (Autorizație de
 * funcționare / Anexă). Faithful replica; see _dsp-farma.mjs.
 */

import { dspFarmaBody } from './_dsp-farma.mjs'

const body = dspFarmaBody({
  requestText:
    'Vă rog să emiteți Autorizația de funcționare / Anexa la Autorizația de ' +
    'funcționare pentru unitatea farmaceutică aflată la adresa de mai jos, pentru:',
  withReluare: true,
})

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'cerere-dsp-model-3',
  name: 'Cerere tip solicitant (Modelul nr. 3 — autorizație de funcționare)',
  title: 'CERERE',
  description:
    'Modelul nr. 3 conform Legii farmaciei nr. 266/2008 — cerere adresată ' +
    'Ministerului Sănătății pentru emiterea Autorizației de funcționare a ' +
    'unei unități farmaceutice.',
  category: 'Cereri',

  body(ctx, p, instance) {
    // Model 3's addressee is FIXED by law — always the Ministry — so it's
    // baked text, never a slot.
    p.paragraph(ctx, 'Către: MINISTERUL SĂNĂTĂȚII — Direcția Farmaceutică și Dispozitive Medicale', {
      size: 11.5, gap: 12,
    })
    body(ctx, p, instance)
  },
}

export default spec
