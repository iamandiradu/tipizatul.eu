/**
 * DASM Cluj-Napoca — cerere de efectuare a anchetei sociale pentru Comisia
 * pentru Protecția Copilului Cluj / Comisia de Orientare Școlară și
 * Profesională.
 *
 * Replica of `Cerere-ancheta-sociala-comisie-copil-si-orientare-scolara.doc`.
 * The reason for the appointment (evaluare inițială / reevaluare / orientare
 * școlară și profesională / altele) decides which commission sits and what the
 * social worker documents, so the four options are reproduced as a choice with
 * a free-text slot for „altele".
 */

import {
  ORGANIZATION, COUNTY, SERVICES,
  dasmAddressee, registryLine, emailConsent, gdprNotice, clujApplicant,
} from './_dasm-cluj.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-ancheta-comisie-copil',
  name: 'Cerere anchetă socială — Comisia pentru Protecția Copilului / orientare școlară',
  title: 'CERERE',
  description:
    'Cerere adresată Direcției de Asistență Socială și Medicală Cluj-Napoca pentru ' +
    'efectuarea anchetei sociale necesare dosarului pentru Comisia pentru Protecția ' +
    'Copilului Cluj sau pentru Comisia de Orientare Școlară și Profesională.',
  category: 'Asistență socială',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    registryLine(ctx, p, '802')
    dasmAddressee(ctx, p, SERVICES.dizabilitati)

    clujApplicant(ctx, p)

    const G = 'Copilul și programarea la Comisie'
    p.paragraph(ctx, 'în calitate de (bifați):', { size: 11, gap: 4 })
    p.checkbox(ctx, { label: 'părinte;', name: 'calitate_parinte', group: G })
    p.checkbox(ctx, { label: 'reprezentant legal.', name: 'calitate_reprezentant_legal', group: G })

    p.labeledField(ctx, {
      label: 'Al copilului (nume și prenume)', name: 'copil_nume', required: true, group: G,
    })
    p.paragraph(
      ctx,
      'solicit efectuarea unei anchete sociale necesare întocmirii dosarului pentru Comisia ' +
        'pentru Protecția Copilului Cluj / Comisia de Orientare Școlară și Profesională.',
      { size: 11, gap: 8 },
    )
    p.labeledField(ctx, {
      label: 'Menționez că sunt programat/ă la Comisie în data de',
      name: 'data_programare',
      required: true,
      group: G,
    })
    p.paragraph(ctx, 'Tipul programării (bifați):', { size: 11, gap: 4 })
    p.checkbox(ctx, { label: 'evaluare inițială;', name: 'evaluare_initiala', group: G })
    p.checkbox(ctx, { label: 'reevaluare;', name: 'reevaluare', group: G })
    p.checkbox(ctx, { label: 'orientare școlară și profesională;', name: 'orientare_scolara', group: G })
    p.checkbox(ctx, { label: 'altele:', name: 'altele', group: G })
    p.labeledField(ctx, { label: 'Altele (detaliați)', name: 'altele_detalii', group: G })

    emailConsent(ctx, p)
    p.signatureFooter(ctx, { signatureLabel: 'Semnătură' })
    gdprNotice(ctx, p)
  },
}

export default spec
