/**
 * DASM Cluj-Napoca — cerere de efectuare a anchetei sociale pentru admiterea
 * într-un Centru de îngrijire și asistență.
 *
 * Replica of `Cerere-admitere-centru-de-ingrijire-si-asistenta.doc`
 * (Serviciul Asistența Persoanelor cu Dizabilități). The applicant and the
 * person to be admitted are separate people on this form — a relative usually
 * files it — so both address blocks are reproduced.
 */

import {
  ORGANIZATION, COUNTY, SERVICES,
  dasmAddressee, registryLine, emailConsent, gdprNotice, clujApplicant,
} from './_dasm-cluj.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-ancheta-centru-ingrijire',
  name: 'Cerere anchetă socială — admitere în centru de îngrijire și asistență',
  title: 'CERERE',
  description:
    'Cerere adresată Direcției de Asistență Socială și Medicală Cluj-Napoca pentru ' +
    'efectuarea anchetei sociale necesare admiterii unei persoane într-un Centru de ' +
    'îngrijire și asistență.',
  category: 'Asistență socială',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    registryLine(ctx, p, '802')
    dasmAddressee(ctx, p, SERVICES.dizabilitati)

    clujApplicant(ctx, p)

    p.paragraph(
      ctx,
      'solicit efectuarea anchetei sociale pentru admiterea într-un Centru de îngrijire ' +
        'și asistență, pentru:',
      { size: 11, gap: 8 },
    )

    const G = 'Persoana pentru care se solicită ancheta'
    p.labeledField(ctx, {
      label: 'Domnul/Doamna (nume și prenume)',
      name: 'beneficiar_nume',
      required: true,
      group: G,
    })
    p.labeledField(ctx, {
      label: 'Domiciliat/ă în Cluj-Napoca, str.',
      name: 'beneficiar_adresa',
      required: true,
      group: G,
    })
    p.twoColFields(
      ctx,
      { label: 'Nr.', name: 'beneficiar_nr', maxLength: 8, group: G },
      { label: 'Ap.', name: 'beneficiar_ap', maxLength: 8, group: G },
    )

    emailConsent(ctx, p)
    p.signatureFooter(ctx)
    gdprNotice(ctx, p)
  },
}

export default spec
