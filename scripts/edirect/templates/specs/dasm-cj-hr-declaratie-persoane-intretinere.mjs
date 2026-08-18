/**
 * DASM Cluj-Napoca — Anexa 1: declarația salariatului privind persoanele aflate
 * în întreținere, pentru deducerea personală (art. 77 din Legea nr. 227/2015).
 *
 * Replica of `Declaratie-anexa-11.pdf`. The four „calitate" columns of the
 * source grid (soț/soție, copil sub 18 ani, copil peste 18 ani, altă rudă) are
 * collapsed into one column the declarant writes in: as a printed grid they are
 * tick boxes in a table, which the AcroForm table primitive has no cell type
 * for, and the value is the same either way.
 */

import { ORGANIZATION, COUNTY } from './_dasm-hr.mjs'

const G = 'Declarant'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-hr-declaratie-persoane-intretinere',
  name: 'Declarație privind persoanele aflate în întreținere (Anexa 1)',
  title: 'DECLARAȚIE',
  description:
    'Declarația salariatului privind persoanele aflate în întreținere, depusă pentru acordarea ' +
    'deducerii personale conform art. 77 din Legea nr. 227/2015 privind Codul fiscal (Anexa 1).',
  category: 'Declarații',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    p.paragraph(ctx, 'MUNICIPIUL CLUJ-NAPOCA · DIRECȚIA DE ASISTENȚĂ SOCIALĂ ȘI MEDICALĂ · Anexa 1', { size: 9, gap: 10 })

    p.labeledField(ctx, { label: 'Subsemnatul/a (nume și prenume)', name: 'nume_si_prenume', required: true, group: G })
    p.combField(ctx, { label: 'Cod numeric personal', name: 'cnp', required: true, group: G }, { cells: 13 })
    p.twoColFields(
      ctx,
      { label: 'Domiciliat în localitatea', name: 'localitate', required: true, group: G },
      { label: 'Județul', name: 'judet', group: G },
    )
    p.labeledField(ctx, { label: 'Strada, nr., apartament', name: 'adresa', required: true, group: G })

    p.paragraph(ctx, 'angajat în cadrul Primăriei Cluj-Napoca, am în întreținere următoarele persoane:', { size: 10.5, gap: 6 })
    p.table(ctx, {
      name: 'persoana',
      rows: 6,
      group: 'Persoane aflate în întreținere',
      columns: [
        { header: 'Numele și prenumele', key: 'nume' },
        { header: 'CNP', key: 'cnp', width: 96, maxLength: 13 },
        { header: 'Calitate (soț/soție, copil sub 18 ani, copil peste 18 ani, altă rudă)', key: 'calitate' },
      ],
    })

    p.paragraph(
      ctx,
      'Declar pe propria răspundere că sunt singurul beneficiar de deducere personală pentru ' +
        'persoanele cuprinse în declarație (excepție: copiii minori). De asemenea, mă angajez să ' +
        'anunț în termen de 3 zile, în scris, atunci când una dintre aceste persoane nu mai ' +
        'îndeplinește condițiile prevăzute de art. 77 din Legea nr. 227/2015 privind Codul fiscal.',
      { size: 9.5, gap: 8 },
    )
    p.signatureFooter(ctx)
  },
}

export default spec
