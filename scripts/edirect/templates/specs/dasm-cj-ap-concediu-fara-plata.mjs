/**
 * DASM Cluj-Napoca — cerere pentru acordarea zilelor de concediu fără plată
 * (asistenți personali).
 *
 * Replica of `Cerere-CFS.pdf`. The closing NOTĂ records how many unpaid leave
 * days the assistant has already taken in the current year — the legal cap is
 * what the request is measured against — so it is reproduced.
 */

import { ORGANIZATION, COUNTY, hrHeader } from './_dasm-hr.mjs'

const G = 'Asistent personal'
const C = 'Concediul fără plată solicitat'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-ap-concediu-fara-plata',
  name: 'Cerere concediu fără plată — asistent personal',
  title: 'CERERE PENTRU ACORDAREA ZILELOR DE CONCEDIU FĂRĂ PLATĂ',
  description:
    'Cererea prin care asistentul personal al persoanei cu handicap grav solicită zile de concediu ' +
    'fără plată, în baza art. 25 din H.G. nr. 250/1992 și a art. 153 din Legea nr. 53/2003 — Codul ' +
    'muncii.',
  category: 'Resurse umane',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    hrHeader(ctx, p, { compartment: '804' })

    p.labeledField(ctx, { label: 'Subsemnatul/a (nume și prenume)', name: 'nume_si_prenume', required: true, group: G })
    p.combField(ctx, { label: 'CNP', name: 'cnp', required: true, group: G }, { cells: 13 })
    p.labeledField(ctx, {
      label: 'Încadrat/ă cu contract individual de muncă nr.', name: 'contract_nr', required: true, group: G,
    })
    p.labeledField(ctx, {
      label: 'În funcția de asistent personal al persoanei cu handicap grav', name: 'persoana_nume', required: true, group: G,
    })
    p.combField(ctx, { label: 'CNP persoana asistată', name: 'persoana_cnp', required: true, group: G }, { cells: 13 })

    p.paragraph(
      ctx,
      'în baza prevederilor art. 25 din H.G. nr. 250/1992, republicată, precum și ale art. 153 din ' +
        'Legea nr. 53/2003 — Codul muncii, republicată, vă rog să aprobați:',
      { size: 10.5, gap: 6 },
    )
    p.labeledField(ctx, { label: 'Număr de zile de concediu fără plată', name: 'zile_solicitate', required: true, maxLength: 3, group: C })
    p.twoColFields(
      ctx,
      { label: 'În perioada de la', name: 'data_inceput', required: true, group: C },
      { label: 'Până la', name: 'data_sfarsit', required: true, group: C },
    )
    p.labeledField(ctx, { label: 'Nr. telefon', name: 'telefon', required: true, group: C })

    p.signatureFooter(ctx, { signatureLabel: 'Semnătura asistentului personal' })
    p.paragraph(ctx, 'Șef serviciu: ____________________', { size: 10, gap: 12 })

    const N = 'Notă — Serviciul Resurse Umane, Salarizare'
    p.paragraph(ctx, 'NOTĂ — Serviciul Resurse Umane, Salarizare', { size: 11, gap: 6 })
    p.labeledField(ctx, {
      label: 'Pentru anul în curs a beneficiat de (zile de concediu fără plată)',
      name: 'nota_zile_beneficiate',
      maxLength: 3,
      group: N,
    })
  },
}

export default spec
