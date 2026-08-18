/**
 * DASM Cluj-Napoca — cerere de efectuare a anchetei sociale pentru admiterea
 * într-un cămin pentru persoane vârstnice.
 *
 * Replica of `CERERE-INTERNARE-CAMIN-PERSOANE-VARSTNICE.pdf`, which the forms
 * page lists as "Cerere solicitare efectuare anchetă socială". Same shape as
 * dasm-cj-ingrijire-la-domiciliu — applicant, person to be admitted, consent
 * declaration — but the request is the anchetă socială that precedes admission.
 */

import {
  ORGANIZATION, COUNTY, SERVICES,
  dasmAddressee, registryLine, consentDeclaration, clujApplicant,
} from './_dasm-cluj.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-ancheta-camin-varstnici',
  name: 'Cerere anchetă socială — admitere în cămin pentru persoane vârstnice',
  title: 'CERERE',
  description:
    'Cerere adresată Direcției de Asistență Socială și Medicală Cluj-Napoca pentru efectuarea ' +
    'anchetei sociale necesare admiterii unei persoane vârstnice într-un cămin.',
  category: 'Asistență socială',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    registryLine(ctx, p, '804.1')
    dasmAddressee(ctx, p, SERVICES.varstnici)

    clujApplicant(ctx, p)

    p.paragraph(
      ctx,
      'solicit efectuarea anchetei sociale pentru admiterea într-un cămin pentru persoane ' +
        'vârstnice, pentru:',
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
