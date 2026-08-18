/**
 * DASM Cluj-Napoca — notă de plecare în concediu de odihnă pentru asistenții
 * personali.
 *
 * Replica of `cerere-CO-tip-2026.doc`. Unlike the general leave request, this
 * one identifies both the assistant and the person they assist, because the
 * second half of the sheet is the REFERAT proposing the art. 37 alin. (3)
 * indemnity that the assisted person receives while the assistant is away.
 * Both halves are reproduced.
 */

import { ORGANIZATION, COUNTY, hrHeader } from './_dasm-hr.mjs'

const G = 'Asistent personal'
const B = 'Persoana cu handicap grav'
const C = 'Concediul de odihnă'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-ap-concediu-odihna',
  name: 'Notă de plecare în concediu de odihnă — asistent personal',
  title: 'NOTĂ DE PLECARE ÎN CONCEDIU DE ODIHNĂ',
  description:
    'Nota de plecare în concediu de odihnă a asistentului personal al persoanei cu handicap grav, ' +
    'la Direcția de Asistență Socială și Medicală Cluj-Napoca, cu referatul privind indemnizația ' +
    'prevăzută la art. 37 alin. (3) din Legea nr. 448/2006.',
  category: 'Resurse umane',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    hrHeader(ctx, p, { compartment: '804' })

    p.labeledField(ctx, { label: 'Domnul/Doamna (nume și prenume)', name: 'nume_si_prenume', required: true, group: G })
    p.combField(ctx, { label: 'CNP', name: 'cnp', required: true, group: G }, { cells: 13 })
    p.twoColFields(
      ctx,
      { label: 'Încadrat/ă cu contract individual de muncă nr.', name: 'contract_nr', required: true, group: G },
      { label: 'Telefon', name: 'telefon', required: true, group: G },
    )
    p.labeledField(ctx, {
      label: 'În funcția de asistent personal al persoanei cu handicap grav', name: 'persoana_nume', required: true, group: B,
    })
    p.combField(ctx, { label: 'CNP persoana asistată', name: 'persoana_cnp', required: true, group: B }, { cells: 13 })

    p.twoColFields(
      ctx,
      { label: 'Pentru anul calendaristic', name: 'an_calendaristic', required: true, maxLength: 4, group: C },
      { label: 'Are dreptul la (zile de concediu)', name: 'zile_drept', required: true, maxLength: 3, group: C },
    )
    p.paragraph(
      ctx,
      'zile de concediu de odihnă stabilite conform prevederilor Legii nr. 53/2003 — Codul muncii, ' +
        'republicată, precum și ale H.G. nr. 250/1992, republicată, cu modificările și completările ' +
        'ulterioare.',
      { size: 9.5, gap: 6 },
    )
    p.twoColFields(
      ctx,
      { label: 'Va efectua concediu de odihnă de la data de', name: 'data_inceput', required: true, group: C },
      { label: 'Până la data de', name: 'data_sfarsit', required: true, group: C },
    )
    p.labeledField(ctx, { label: 'Număr de zile lucrătoare', name: 'zile_lucratoare', required: true, maxLength: 3, group: C })

    p.signatureFooter(ctx, { signatureLabel: 'Semnătura asistentului personal' })

    const R = 'Referat — indemnizația prevăzută la art. 37 alin. (3)'
    p.paragraph(
      ctx,
      'REFERAT cu privire la propunerea de acordare a indemnizației prevăzute la art. 37 alin. (3) ' +
        'din Legea nr. 448/2006',
      { size: 11, gap: 6 },
    )
    p.paragraph(
      ctx,
      'În conformitate cu dispozițiile art. 37 alin. (1) lit. c), alin. (2) și alin. (3), coroborate ' +
        'cu prevederile art. 43 alin. (1) din Legea nr. 448/2006 privind protecția și promovarea ' +
        'drepturilor persoanelor cu handicap, republicată, persoanei cu handicap grav menționate mai ' +
        'jos i se acordă o indemnizație echivalentă cu salariul net al asistentului personal ' +
        'gradația 0, stabilit potrivit prevederilor legale care reglementează nivelul de salarizare ' +
        'a personalului plătit din fonduri publice.',
      { size: 9.5, gap: 6 },
    )
    p.labeledField(ctx, { label: 'Persoana cu handicap grav', name: 'referat_persoana', group: R })
    p.twoColFields(
      ctx,
      { label: 'Șef serviciu', name: 'referat_sef_serviciu', group: R },
      { label: 'Întocmit de', name: 'referat_intocmit', group: R },
    )
  },
}

export default spec
