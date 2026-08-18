/**
 * DASM Cluj-Napoca — cerere de încheiere a contractului de închiriere pentru
 * o locuință socială (formularul 815.02).
 */

import { ORGANIZATION, COUNTY } from './_dasm-cluj.mjs'
import {
  locativHeader, locativApplicant, locuintaBlock, declaratieOlografa,
  annexList, emailOptions, locativGdpr,
} from './_dasm-locativ.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-locativ-incheiere-contract',
  name: 'Cerere încheiere contract de închiriere — locuință socială',
  title: 'CERERE',
  description:
    'Cerere adresată Consiliului Local al municipiului Cluj-Napoca, prin Direcția de Asistență ' +
    'Socială și Medicală, pentru încheierea contractului de închiriere având ca obiect o ' +
    'locuință socială.',
  category: 'Fond locativ',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    locativHeader(ctx, p)
    locativApplicant(ctx, p)

    p.paragraph(
      ctx,
      'formulez prezenta CERERE prin care solicit încheierea contractului de închiriere având ca ' +
        'obiect locuința socială de mai jos, potrivit actelor administrative în vigoare la data ' +
        'prezentei, respectiv calcularea chiriei stabilită prin acte normative.',
      { size: 10.5, gap: 8 },
    )
    locuintaBlock(ctx, p)

    declaratieOlografa(ctx, p, 'încheierii contractului de închiriere')
    annexList(ctx, p)
    emailOptions(ctx, p)
    p.signatureFooter(ctx)
    locativGdpr(ctx, p)
  },
}

export default spec
