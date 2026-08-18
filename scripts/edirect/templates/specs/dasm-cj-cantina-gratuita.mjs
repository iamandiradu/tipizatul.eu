/**
 * DASM Cluj-Napoca — cerere pentru acordarea mesei gratuite la Cantina de
 * ajutor social (Legea nr. 208/1997, art. 4 alin. 1).
 *
 * Replica of `Cerere-acordare-cantina-gratuita.pdf` — the short, free-of-charge
 * counterpart of dasm-cj-cantina-contributie-30, which carries no household
 * table because no contribution is computed.
 */

import {
  ORGANIZATION, COUNTY, SERVICES, dasmAddressee, clujApplicant,
} from './_dasm-cluj.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-cantina-gratuita',
  name: 'Cerere masă gratuită la Cantina de ajutor social',
  title: 'CERERE',
  description:
    'Cerere adresată Direcției de Asistență Socială și Medicală Cluj-Napoca pentru acordarea ' +
    'mesei gratuite la Cantina de ajutor social, conform art. 4 alin. 1 din Legea nr. 208/1997.',
  category: 'Asistență socială',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    dasmAddressee(ctx, p, SERVICES.protectieSociala)

    clujApplicant(ctx, p, { cnp: true })

    p.paragraph(
      ctx,
      'prin prezenta solicit acordarea mesei gratuite la Cantina de ajutor social, conform ' +
        'prevederilor art. 4 alin. 1 din Legea nr. 208/1997 privind cantinele de ajutor social.',
      { size: 11, gap: 8 },
    )
    p.labeledField(ctx, { label: 'Telefon de contact', name: 'telefon', required: true, group: 'Contact' })

    p.signatureFooter(ctx)
  },
}

export default spec
