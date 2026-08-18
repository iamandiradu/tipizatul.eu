/**
 * DASM Cluj-Napoca — cerere de angajare în funcția de asistent personal al
 * persoanei cu handicap grav.
 *
 * Replica of `CERERE-ANGAJARE-AP.pdf`. Two facts decide the request: the
 * disabled person's consent to being assisted by this applicant, and whether
 * the applicant's other job overlaps DASM's working hours (L–M–M 8–16, joi
 * 8–17:30, vineri 8–14:30), which the source spells out — both are reproduced.
 * The second page is the art. 38 Legea 448/2006 undertaking, filed together
 * with the request.
 */

import { ORGANIZATION, COUNTY } from './_dasm-hr.mjs'

const G = 'Solicitant'
const B = 'Persoana cu handicap grav'
const D = 'Declarație pe propria răspundere (art. 38 din Legea nr. 448/2006)'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-ap-angajare',
  name: 'Cerere de angajare ca asistent personal',
  title: 'CERERE DE ANGAJARE CA ASISTENT PERSONAL',
  description:
    'Cererea de angajare în funcția de asistent personal al persoanei cu handicap grav, adresată ' +
    'conducerii Direcției de Asistență Socială și Medicală Cluj-Napoca, împreună cu declarația ' +
    'privind obligațiile prevăzute la art. 38 din Legea nr. 448/2006.',
  category: 'Resurse umane',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    p.paragraph(ctx, 'Nr. de înregistrare ______________ /804/ ______________', { size: 10, gap: 4 })
    p.paragraph(ctx, 'Se aprobă / Nu se aprobă — Director executiv: ____________________', { size: 10, gap: 12 })
    p.addressee(ctx, {
      baked: 'Conducerea Direcției de Asistență Socială și Medicală',
      bakedAddress: 'Cluj-Napoca',
    })

    p.labeledField(ctx, { label: 'Subsemnatul/a (nume și prenume)', name: 'nume_si_prenume', required: true, group: G })
    p.combField(ctx, { label: 'CNP', name: 'cnp', required: true, group: G }, { cells: 13 })
    p.labeledField(ctx, { label: 'Domiciliat/ă în', name: 'adresa', required: true, group: G })
    p.twoColFields(
      ctx,
      { label: 'Telefon', name: 'telefon', required: true, group: G },
      { label: 'E-mail', name: 'email', group: G },
    )

    p.paragraph(
      ctx,
      'prin prezenta solicit angajarea în funcția de asistent personal pentru persoana cu handicap grav:',
      { size: 11, gap: 6 },
    )
    p.labeledField(ctx, { label: 'Nume și prenume', name: 'persoana_nume', required: true, group: B })
    p.labeledField(ctx, {
      label: 'Având domiciliul/reședința în municipiul Cluj-Napoca', name: 'persoana_adresa', required: true, group: B,
    })
    p.twoColFields(
      ctx,
      { label: 'Încadrată conform Certificatului nr.', name: 'certificat_nr', required: true, group: B },
      { label: 'Din data de', name: 'certificat_data', group: B },
    )
    p.labeledField(ctx, {
      label: 'Persoana cu handicap grav/reprezentantul legal/membrul de familie care și-a exprimat acordul',
      name: 'acord_nume',
      required: true,
      group: B,
    })
    p.labeledField(ctx, { label: 'Grad de rudenie', name: 'grad_rudenie', group: B })

    const M = 'Situația de angajare'
    p.paragraph(ctx, 'De asemenea, declar că (bifați):', { size: 10.5, gap: 2 })
    p.checkbox(ctx, { label: 'sunt angajat/ă la un alt angajator;', name: 'alt_angajator_da', group: M })
    p.checkbox(ctx, { label: 'nu sunt angajat/ă la un alt angajator;', name: 'alt_angajator_nu', group: M })
    p.checkbox(ctx, {
      label:
        'programul de lucru de la angajatorul actual se suprapune cu programul DASM ' +
        '(luni–miercuri 8–16, joi 8–17:30, vineri 8–14:30);',
      name: 'program_suprapune_da', group: M,
    })
    p.checkbox(ctx, {
      label: 'programul de lucru de la angajatorul actual nu se suprapune cu programul DASM.',
      name: 'program_suprapune_nu', group: M,
    })
    p.multilineField(ctx, { label: 'Alte mențiuni', name: 'alte_mentiuni', group: M }, { lines: 3 })

    p.paragraph(
      ctx,
      'Cunosc faptul că neprezentarea, în termen de maximum 30 de zile de la data aprobării ' +
        'cererii, a documentelor necesare pentru întocmirea dosarului în vederea angajării atrage ' +
        'după sine clasarea/respingerea acestuia, după caz.',
      { size: 9.5, gap: 6 },
    )
    p.checkbox(ctx, {
      label:
        'Acord privind datele cu caracter personal: sunt de acord cu transmiterea informațiilor și ' +
        'documentelor, inclusiv date cu caracter personal, necesare în vederea soluționării cererii ' +
        'de către persoanele abilitate, inclusiv în format electronic, conform Regulamentului nr. ' +
        '679/2016, precum și cu prelucrarea ulterioară în scopuri statistice și de cercetare.',
      name: 'acord_date_personale',
      required: true,
      group: M,
    })

    p.signatureFooter(ctx)

    p.paragraph(ctx, 'DECLARAȚIE PE PROPRIE RĂSPUNDERE', { size: 11.5, gap: 8 })
    p.labeledField(ctx, { label: 'Subsemnatul/a (nume și prenume)', name: 'decl_nume', required: true, group: D })
    p.combField(ctx, { label: 'CNP', name: 'decl_cnp', required: true, group: D }, { cells: 13 })
    p.labeledField(ctx, { label: 'Domiciliat/ă în Cluj-Napoca, str.', name: 'decl_adresa', required: true, group: D })
    p.labeledField(ctx, { label: 'Nr., bl., ap.', name: 'decl_adresa_detalii', group: D })
    p.paragraph(
      ctx,
      'declar pe propria răspundere că voi respecta obligațiile prevăzute la art. 38 din Legea nr. ' +
        '448/2006 privind protecția și promovarea drepturilor persoanelor cu handicap, republicată, ' +
        'cu modificările și completările ulterioare.',
      { size: 10, gap: 8 },
    )
    p.signatureFooter(ctx, { dateLabel: 'Data declarației', signatureLabel: 'Semnătura declarantului' })
  },
}

export default spec
