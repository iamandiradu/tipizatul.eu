/**
 * DASM Cluj-Napoca — cerere de luare în evidență pentru eliberarea
 * abonamentului de transport urban pentru persoanele cu handicap.
 *
 * Replica of `Cerere-transport-urban-persoane-cu-dizabilitati.doc`. Two extra
 * passes can be requested alongside the applicant's own — a nominal one for
 * the personal assistant (who must be named) and a non-nominal one for an
 * accompanying person — so each is its own option rather than a bullet list.
 */

import {
  ORGANIZATION, COUNTY, SERVICES,
  dasmAddressee, registryLine, emailConsent, gdprNotice, clujApplicant,
} from './_dasm-cluj.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-transport-urban-handicap',
  name: 'Cerere abonament transport urban pentru persoanele cu handicap',
  title: 'CERERE',
  description:
    'Cerere adresată Direcției de Asistență Socială și Medicală Cluj-Napoca pentru luarea ' +
    'în evidență în vederea eliberării abonamentului pentru transportul urban al persoanelor ' +
    'cu handicap.',
  category: 'Asistență socială',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    registryLine(ctx, p, '802')
    dasmAddressee(ctx, p, SERVICES.dizabilitati)

    clujApplicant(ctx, p)

    const G = 'Persoana cu handicap'
    p.paragraph(ctx, 'în calitate de (bifați):', { size: 11, gap: 4 })
    p.checkbox(ctx, { label: 'persoană cu handicap;', name: 'calitate_persoana_cu_handicap', group: G })
    p.checkbox(ctx, {
      label: 'reprezentant legal al persoanei cu handicap.',
      name: 'calitate_reprezentant_legal',
      group: G,
    })
    p.labeledField(ctx, {
      label: 'Persoana cu handicap (nume și prenume)',
      name: 'persoana_nume',
      hint: 'Se completează când cererea este depusă de reprezentantul legal.',
      group: G,
    })
    p.labeledField(ctx, {
      label: 'Cu domiciliul în Cluj-Napoca, str.', name: 'persoana_adresa', group: G,
    })
    p.twoColFields(
      ctx,
      { label: 'Nr.', name: 'persoana_nr', maxLength: 8, group: G },
      { label: 'Ap.', name: 'persoana_ap', maxLength: 8, group: G },
    )

    p.paragraph(
      ctx,
      'solicit luarea în evidență în vederea eliberării abonamentului pentru transportul urban.',
      { size: 11, gap: 8 },
    )

    const A = 'Abonamente solicitate suplimentar'
    p.paragraph(ctx, 'De asemenea solicit:', { size: 11, gap: 4 })
    p.checkbox(ctx, { label: 'un abonament nominal pentru asistentul personal;', name: 'abonament_asistent', group: A })
    p.labeledField(ctx, { label: 'Asistent personal (nume și prenume)', name: 'asistent_nume', group: A })
    p.labeledField(ctx, { label: 'Adresa asistentului personal', name: 'asistent_adresa', group: A })
    p.checkbox(ctx, { label: 'un abonament nenominal pentru însoțitor.', name: 'abonament_insotitor', group: A })

    p.paragraph(
      ctx,
      'Anexez prezentei: certificat de încadrare în grad de handicap; act de identitate al ' +
        'persoanei cu handicap; act de identitate al reprezentantului legal.',
      { size: 10, gap: 8 },
    )

    emailConsent(ctx, p)
    p.signatureFooter(ctx, { signatureLabel: 'Semnătură' })
    gdprNotice(ctx, p)
  },
}

export default spec
