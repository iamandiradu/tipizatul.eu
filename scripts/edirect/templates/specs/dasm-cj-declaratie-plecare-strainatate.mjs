/**
 * DASM Cluj-Napoca — declarație privind intenția de a pleca la muncă în
 * străinătate și persoana în îngrijirea căreia rămân copiii.
 *
 * Replica of `Declaratie-parinte-care-pleaca-la-munca-in-strainatate.doc`,
 * listed twice on the forms page ("Declaratie plecare părinte" and "Declarație
 * îngrijire") behind the same file. Required by Legea 272/2004 art. 104: the
 * parent notifies the local social service, which then monitors the child.
 *
 * The children are listed in a grid rather than on a ruled line — the source
 * asks for name, forename and date of birth per child, and a three-line blank
 * loses that structure.
 */

import { ORGANIZATION, COUNTY, SERVICES, dasmAddressee, registryLine } from './_dasm-cluj.mjs'

const G = 'Declarant'
const I = 'Persoana în îngrijirea căreia rămân copiii'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-declaratie-plecare-strainatate',
  name: 'Declarație — plecare la muncă în străinătate (copii în întreținere)',
  title: 'DECLARAȚIE',
  description:
    'Declarația părintelui care pleacă la muncă în străinătate, depusă la Direcția de Asistență ' +
    'Socială și Medicală Cluj-Napoca, cu indicarea persoanei în îngrijirea căreia rămân copiii ' +
    'minori.',
  category: 'Declarații',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    registryLine(ctx, p, '803')
    dasmAddressee(ctx, p, SERVICES.copil)

    p.labeledField(ctx, {
      label: 'Subsemnatul/a (nume și prenume)', name: 'nume_si_prenume', required: true, group: G,
    })
    p.twoColFields(
      ctx,
      { label: 'Localitatea', name: 'localitate', required: true, group: G },
      { label: 'Județul', name: 'judet', group: G },
    )
    p.labeledField(ctx, { label: 'Strada, nr., bl., sc., et., ap.', name: 'adresa', required: true, group: G })
    p.twoColFields(
      ctx,
      { label: 'Telefon', name: 'telefon', required: true, group: G },
      { label: 'Act de identitate (seria, nr.)', name: 'act_identitate', group: G },
    )
    p.combField(ctx, { label: 'CNP', name: 'cnp', required: true, group: G }, { cells: 13 })

    p.paragraph(
      ctx,
      'vă aduc la cunoștință intenția mea de a pleca la muncă în străinătate.',
      { size: 11, gap: 8 },
    )
    p.labeledField(ctx, {
      label: 'Declar pe propria răspundere că am în întreținere un număr de copii minori de',
      name: 'numar_copii',
      maxLength: 2,
      hint: 'Scrieți 0 dacă nu aveți copii minori în întreținere.',
      required: true,
      group: G,
    })

    p.paragraph(
      ctx,
      'Menționez că pe perioada în care voi fi plecat/plecată la muncă în străinătate ' +
        'copilul/copiii meu/mei:',
      { size: 11, gap: 6 },
    )
    p.table(ctx, {
      name: 'copil',
      rows: 4,
      group: 'Copiii minori',
      columns: [
        { header: 'Numele și prenumele copilului', key: 'nume' },
        { header: 'Data nașterii', key: 'data_nasterii', width: 110 },
      ],
    })

    p.paragraph(ctx, 'va/vor fi lăsat/lăsați în întreținerea și îngrijirea:', { size: 11, gap: 6 })
    p.labeledField(ctx, { label: 'Doamna/Domnul (nume și prenume)', name: 'ingrijitor_nume', required: true, group: I })
    p.labeledField(ctx, {
      label: 'În calitate de (gradul de rudenie)', name: 'ingrijitor_rudenie', required: true, group: I,
    })
    p.labeledField(ctx, { label: 'Domiciliat/ă în localitatea', name: 'ingrijitor_localitate', required: true, group: I })
    p.twoColFields(
      ctx,
      { label: 'Act de identitate (seria, nr.)', name: 'ingrijitor_act_identitate', group: I },
      { label: 'CNP', name: 'ingrijitor_cnp', required: true, group: I },
    )

    p.signatureFooter(ctx, { signatureLabel: 'Semnătura declarantului' })
  },
}

export default spec
