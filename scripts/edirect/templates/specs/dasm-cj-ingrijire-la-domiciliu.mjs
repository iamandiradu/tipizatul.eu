/**
 * DASM Cluj-Napoca — cerere de luare în evidență pentru servicii de îngrijire
 * la domiciliu pentru persoane vârstnice.
 *
 * Replica of `CERERE-INGRIJIRE-LA-DOMICILIU-refacut-27062023.pdf` (Serviciul
 * Asistența Persoanelor Vârstnice). The applicant and the person to be cared
 * for are usually different people, so both address blocks are reproduced,
 * followed by the service's full consent declaration.
 */

import {
  ORGANIZATION, COUNTY, SERVICES,
  dasmAddressee, registryLine, consentDeclaration, clujApplicant,
} from './_dasm-cluj.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-ingrijire-la-domiciliu',
  name: 'Cerere servicii de îngrijire la domiciliu pentru persoane vârstnice',
  title: 'CERERE',
  description:
    'Cerere adresată Direcției de Asistență Socială și Medicală Cluj-Napoca pentru luarea în ' +
    'evidența Serviciului Asistența Persoanelor Vârstnice în vederea acordării serviciilor de ' +
    'îngrijire la domiciliu.',
  category: 'Asistență socială',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    registryLine(ctx, p, '804.1')
    dasmAddressee(ctx, p, SERVICES.varstnici)

    clujApplicant(ctx, p)

    p.paragraph(
      ctx,
      'prin prezenta solicit luarea în evidența Serviciului Asistența Persoanelor Vârstnice din ' +
        'cadrul Direcției de Asistență Socială și Medicală Cluj-Napoca pentru a beneficia de ' +
        'servicii de îngrijiri la domiciliu pentru persoane vârstnice, pentru:',
      { size: 11, gap: 8 },
    )

    const G = 'Persoana vârstnică'
    p.labeledField(ctx, {
      label: 'Domnul/Doamna (nume și prenume)', name: 'beneficiar_nume', required: true, group: G,
    })
    p.labeledField(ctx, {
      label: 'Domiciliat/ă în Cluj-Napoca, str.', name: 'beneficiar_adresa', required: true, group: G,
    })
    p.twoColFields(
      ctx,
      { label: 'Nr.', name: 'beneficiar_nr', maxLength: 8, group: G },
      { label: 'Ap.', name: 'beneficiar_ap', maxLength: 8, group: G },
    )
    p.labeledField(ctx, { label: 'Telefon de contact', name: 'telefon', required: true, group: 'Contact' })

    consentDeclaration(ctx, p)
    p.signatureFooter(ctx)
  },
}

export default spec
