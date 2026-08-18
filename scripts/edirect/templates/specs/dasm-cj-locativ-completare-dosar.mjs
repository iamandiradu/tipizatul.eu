/**
 * DASM Cluj-Napoca — completare dosar la Serviciul Fond Locativ Social
 * (formularul 815.06).
 *
 * The shortest of the locativ set: it names the file being topped up (what it
 * was for, and the registration number it was filed under) and lists the
 * documents now being handed in.
 */

import { ORGANIZATION, COUNTY } from './_dasm-cluj.mjs'
import { locativHeader, locativApplicant, locativGdpr } from './_dasm-locativ.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-locativ-completare-dosar',
  name: 'Completare dosar — Serviciul Fond Locativ Social',
  title: 'CERERE DE COMPLETARE A DOSARULUI',
  description:
    'Cerere adresată Consiliului Local al municipiului Cluj-Napoca, prin Direcția de Asistență ' +
    'Socială și Medicală, pentru completarea unui dosar depus la Serviciul Fond Locativ Social.',
  category: 'Fond locativ',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    locativHeader(ctx, p)
    locativApplicant(ctx, p)

    const G = 'Dosarul care se completează'
    p.labeledField(ctx, {
      label: 'Completez dosarul pentru',
      name: 'dosar_obiect',
      required: true,
      hint: 'Scopul pentru care a fost depus dosarul (încheiere contract, prelungire, transcriere…).',
      group: G,
    })
    p.twoColFields(
      ctx,
      { label: 'Depus cu nr. de înregistrare', name: 'dosar_nr', required: true, group: G },
      { label: 'Din data de', name: 'dosar_data', required: true, group: G },
    )

    p.multilineField(
      ctx,
      {
        label: 'Cu următoarele acte',
        name: 'acte_depuse',
        required: true,
        hint: 'Enumerați documentele depuse acum.',
        group: G,
      },
      { lines: 9 },
    )

    p.signatureFooter(ctx)
    locativGdpr(ctx, p)
  },
}

export default spec
