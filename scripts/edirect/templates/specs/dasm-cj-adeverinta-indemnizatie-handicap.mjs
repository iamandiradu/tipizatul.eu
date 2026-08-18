/**
 * DASM Cluj-Napoca — cerere de eliberare a unei adeverințe privind
 * indemnizația de handicap pentru copil.
 *
 * Replica of `Cerere-adeverinta-indemnizatie.doc`, which the forms page lists
 * twice ("Cerere indemnizatie persoane cu handicap" and "Cerere adeverință –
 * indemnizație") behind the same file.
 *
 * „beneficiez/nu beneficiez" is the whole point of the adeverință — the
 * institution certifies one or the other — so it is a two-option choice here
 * rather than a slash the applicant crosses out by hand.
 */

import {
  ORGANIZATION, COUNTY, SERVICES,
  dasmAddressee, registryLine, emailConsent, gdprNotice, clujApplicant,
} from './_dasm-cluj.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-adeverinta-indemnizatie-handicap',
  name: 'Cerere adeverință — indemnizație de handicap pentru copil',
  title: 'CERERE',
  description:
    'Cerere adresată Direcției de Asistență Socială și Medicală Cluj-Napoca pentru ' +
    'eliberarea unei adeverințe din care să reiasă dacă solicitantul beneficiază de ' +
    'indemnizația de handicap pentru copilul încadrat în gradul grav de handicap.',
  category: 'Asistență socială',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    registryLine(ctx, p, '802')
    dasmAddressee(ctx, p, SERVICES.dizabilitati)

    clujApplicant(ctx, p)

    p.paragraph(
      ctx,
      'solicit eliberarea unei adeverințe din care să reiasă că (bifați varianta care ' +
        'corespunde situației dumneavoastră):',
      { size: 11, gap: 6 },
    )
    const G = 'Obiectul cererii'
    p.checkbox(ctx, {
      label: 'beneficiez de indemnizația de handicap pentru copilul menționat mai jos;',
      name: 'beneficiez',
      group: G,
    })
    p.checkbox(ctx, {
      label: 'nu beneficiez de indemnizația de handicap pentru copilul menționat mai jos.',
      name: 'nu_beneficiez',
      group: G,
    })

    p.labeledField(ctx, {
      label: 'Copilul (nume și prenume)',
      name: 'copil_nume',
      required: true,
      hint: 'Copilul încadrat în gradul grav de handicap.',
      group: G,
    })
    p.labeledField(ctx, {
      label: 'Menționez că adeverința îmi este necesară la',
      name: 'necesara_la',
      required: true,
      group: G,
    })

    emailConsent(ctx, p)
    p.signatureFooter(ctx, { signatureLabel: 'Semnătură' })
    gdprNotice(ctx, p)
  },
}

export default spec
