/**
 * DASM Cluj-Napoca — foaie de prezență lunară pentru asistenții personali.
 *
 * Replica of `foaie-de-pontaj-AS.PERS_.1.pdf`. The source is a spreadsheet with
 * one column per day of the month and two rows (start and end of the working
 * day); it is reproduced as a 31-row grid instead, one row per day, because a
 * 31-column table does not fit an A4 page at a legible size and the data is the
 * same either way.
 *
 * The legend is kept verbatim: C.O. for concediu de odihnă, C.M. for concediu
 * medical, and the note that weekends and public holidays are hatched — a
 * timesheet is read against that legend.
 */

import { ORGANIZATION, COUNTY } from './_dasm-hr.mjs'

const G = 'Foaia de prezență'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-ap-foaie-pontaj',
  name: 'Foaie de prezență — asistent personal',
  title: 'FOAIE DE PREZENȚĂ',
  description:
    'Foaia de prezență lunară a asistentului personal al persoanei cu handicap grav, depusă la ' +
    'Direcția de Asistență Socială și Medicală Cluj-Napoca și vizată de Serviciul Resurse Umane, ' +
    'Salarizare.',
  category: 'Resurse umane',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    p.paragraph(
      ctx,
      'ROMÂNIA · JUDEȚUL CLUJ · CONSILIUL LOCAL AL MUNICIPIULUI CLUJ-NAPOCA · DIRECȚIA DE ' +
        'ASISTENȚĂ SOCIALĂ ȘI MEDICALĂ',
      { size: 8.5, gap: 8 },
    )

    p.labeledField(ctx, {
      label: 'Numele și prenumele asistentului personal', name: 'nume_si_prenume', required: true, group: G,
    })
    p.twoColFields(
      ctx,
      { label: 'CIM nr.', name: 'contract_nr', required: true, group: G },
      { label: 'Pentru luna', name: 'luna', required: true, group: G },
    )

    p.paragraph(
      ctx,
      'Repartizarea programului de lucru: luni, marți, miercuri în intervalul orar 8:00–16:00; joi ' +
        '8:00–17:30; vineri 8:00–14:30, conform contractului colectiv de muncă aplicabil pe unitate.',
      { size: 9, gap: 4 },
    )
    p.paragraph(
      ctx,
      'Se hașurează în coloana datei zilele de sâmbătă, duminică și sărbătorile legale. ' +
        'Înregistrarea în foaia de prezență se face cu C.O. pentru concediul de odihnă și C.M. ' +
        'pentru concediul medical.',
      { size: 9, gap: 8 },
    )

    p.table(ctx, {
      name: 'zi',
      rows: 31,
      group: 'Prezența pe zile',
      columns: [
        { header: 'Ora de începere a programului de lucru', key: 'ora_inceput' },
        { header: 'Ora de sfârșit a programului de lucru', key: 'ora_sfarsit' },
        { header: 'Mențiuni (C.O./C.M.)', key: 'mentiuni' },
      ],
    })
    p.labeledField(ctx, { label: 'TOTAL ORE LUCRATE', name: 'total_ore', required: true, group: G })

    p.signatureFooter(ctx, { signatureLabel: 'Semnătura asistentului personal' })
    p.paragraph(ctx, 'Vizat, Resurse Umane Salarizare: ____________________', { size: 10, gap: 0 })
  },
}

export default spec
