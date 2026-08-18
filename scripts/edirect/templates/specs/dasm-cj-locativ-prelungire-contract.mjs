/**
 * DASM Cluj-Napoca — cerere de prelungire a termenului de locațiune prevăzut
 * în contractul de închiriere (formularul 815.03).
 */

import { ORGANIZATION, COUNTY } from './_dasm-cluj.mjs'
import {
  locativHeader, locativApplicant, locuintaBlock, declaratieOlografa,
  annexList, emailOptions, locativGdpr,
} from './_dasm-locativ.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-locativ-prelungire-contract',
  name: 'Cerere prelungire contract de închiriere — locuință socială',
  title: 'CERERE',
  description:
    'Cerere adresată Consiliului Local al municipiului Cluj-Napoca, prin Direcția de Asistență ' +
    'Socială și Medicală, pentru prelungirea termenului de locațiune prevăzut în contractul de ' +
    'închiriere al unei locuințe sociale.',
  category: 'Fond locativ',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    locativHeader(ctx, p)
    locativApplicant(ctx, p)

    p.paragraph(
      ctx,
      'formulez prezenta CERERE prin care solicit prelungirea termenului de locațiune prevăzut în ' +
        'contractul de închiriere:',
      { size: 10.5, gap: 6 },
    )
    p.twoColFields(
      ctx,
      { label: 'Contractul de închiriere nr.', name: 'contract_nr', required: true, group: 'Contractul de închiriere' },
      { label: 'Din data de', name: 'contract_data', required: true, group: 'Contractul de închiriere' },
    )
    locuintaBlock(ctx, p)
    p.paragraph(
      ctx,
      'potrivit actelor administrative în vigoare la data prezentei, respectiv calcularea chiriei ' +
        'stabilită prin acte normative.',
      { size: 10.5, gap: 8 },
    )

    declaratieOlografa(ctx, p, 'prelungirii contractului de închiriere')
    annexList(ctx, p)
    emailOptions(ctx, p)
    p.signatureFooter(ctx)
    locativGdpr(ctx, p)
  },
}

export default spec
