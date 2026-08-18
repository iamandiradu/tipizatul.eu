/**
 * DASM Cluj-Napoca — cerere de efectuare a anchetei sociale pentru Comisia de
 * Evaluare a Persoanelor Adulte cu Handicap.
 *
 * Replica of `Cerere-ancheta-sociala-comisie-handicap-adult.pdf`. The adult
 * counterpart of dasm-cj-ancheta-comisie-copil: same service, same block, but
 * the applicant is the person being evaluated and the only programming options
 * are evaluare inițială / reevaluare.
 */

import {
  ORGANIZATION, COUNTY, SERVICES,
  dasmAddressee, registryLine, emailConsent, gdprNotice, clujApplicant,
} from './_dasm-cluj.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-ancheta-comisie-adulti',
  name: 'Cerere anchetă socială — Comisia de Evaluare a Persoanelor Adulte cu Handicap',
  title: 'CERERE',
  description:
    'Cerere adresată Direcției de Asistență Socială și Medicală Cluj-Napoca pentru ' +
    'efectuarea anchetei sociale necesare întocmirii dosarului pentru Comisia de Evaluare ' +
    'a Persoanelor Adulte cu Handicap.',
  category: 'Asistență socială',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    registryLine(ctx, p, '802')
    dasmAddressee(ctx, p, SERVICES.dizabilitati)

    clujApplicant(ctx, p)

    const G = 'Programarea la Comisie'
    p.paragraph(
      ctx,
      'solicit efectuarea unei anchete sociale necesare întocmirii dosarului pentru Comisia ' +
        'de Evaluare a Persoanelor Adulte cu Handicap.',
      { size: 11, gap: 8 },
    )
    p.labeledField(ctx, {
      label: 'Menționez că sunt programat/ă la Comisie în data de',
      name: 'data_programare',
      required: true,
      group: G,
    })
    p.checkbox(ctx, { label: 'evaluare inițială;', name: 'evaluare_initiala', group: G })
    p.checkbox(ctx, { label: 'reevaluare.', name: 'reevaluare', group: G })

    emailConsent(ctx, p)
    p.signatureFooter(ctx, { signatureLabel: 'Semnătură' })
    gdprNotice(ctx, p)
  },
}

export default spec
