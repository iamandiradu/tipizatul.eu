/**
 * DASM Cluj-Napoca — formular de înscriere la examenul de promovare în grad
 * profesional/treaptă profesională (personal contractual, H.G. nr. 1336/2022).
 *
 * Replica of `fisa-insciere-examen-promovare.docx`. The performance ratings of
 * the last years are what qualify the candidate, so they keep their grid. The
 * two blocks the institution fills in — the REGES confirmation and the exam
 * secretariat's file check — are reproduced, since the sheet travels with the
 * candidature file and is completed on it.
 */

import { ORGANIZATION, COUNTY } from './_dasm-hr.mjs'

const G = 'Candidat'
const I = 'Se completează de instituție'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-hr-promovare-grad-profesional',
  name: 'Formular de înscriere — examen de promovare în grad/treaptă profesională',
  title: 'FORMULAR DE ÎNSCRIERE la examenul de promovare în grad profesional/treaptă profesională',
  description:
    'Formularul de înscriere la examenul de promovare în grad profesional sau treaptă ' +
    'profesională pentru personalul contractual al Direcției de Asistență Socială și Medicală ' +
    'Cluj-Napoca, conform H.G. nr. 1336/2022.',
  category: 'Resurse umane',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    p.paragraph(
      ctx,
      'Autoritatea sau instituția publică: DIRECȚIA DE ASISTENȚĂ SOCIALĂ ȘI MEDICALĂ CLUJ-NAPOCA',
      { size: 10, gap: 8 },
    )

    p.labeledField(ctx, {
      label: 'Funcția contractuală în care se solicită promovarea (denumire, grad/treaptă)',
      name: 'functia_solicitata',
      required: true,
      group: G,
    })
    p.twoColFields(
      ctx,
      { label: 'Serviciul', name: 'serviciu', required: true, group: G },
      { label: 'Data probei scrise', name: 'data_proba_scrisa', group: G },
    )
    p.labeledField(ctx, { label: 'Numele și prenumele', name: 'nume_si_prenume', required: true, group: G })
    p.combField(ctx, { label: 'CNP', name: 'cnp', required: true, group: G }, { cells: 13 })
    p.labeledField(ctx, { label: 'Adresa', name: 'adresa', required: true, group: G })
    p.labeledField(ctx, { label: 'Telefon', name: 'telefon', required: true, group: G })
    p.labeledField(ctx, {
      label: 'Funcția contractuală de execuție actuală', name: 'functia_actuala', required: true, group: G,
    })
    p.labeledField(ctx, {
      label: 'Vechimea în gradul/treapta profesional(ă) din care promovează',
      name: 'vechime_grad',
      required: true,
      group: G,
    })

    p.paragraph(ctx, 'Calificativele obținute la evaluarea performanțelor profesionale individuale:', { size: 10.5, gap: 4 })
    p.table(ctx, {
      name: 'calificativ',
      rows: 3,
      group: 'Calificative',
      columns: [
        { header: 'Anul', key: 'an', width: 90, maxLength: 4 },
        { header: 'Calificativul obținut', key: 'calificativ' },
      ],
    })

    p.paragraph(ctx, 'Declar că în ultimii doi ani (bifați):', { size: 10.5, gap: 2 })
    p.checkbox(ctx, { label: 'am avut sancțiune disciplinară;', name: 'sanctiune_da', group: 'Declarații' })
    p.checkbox(ctx, { label: 'nu am avut sancțiune disciplinară.', name: 'sanctiune_nu', group: 'Declarații' })

    p.checkbox(ctx, {
      label:
        'Acord privind datele cu caracter personal: sunt de acord cu transmiterea informațiilor și ' +
        'documentelor, inclusiv date cu caracter personal, necesare îndeplinirii atribuțiilor ' +
        'membrilor comisiilor de examinare/de soluționare a contestațiilor și ale secretarului ' +
        'comisiei, inclusiv în format electronic, conform Regulamentului nr. 679/2016, precum și cu ' +
        'prelucrarea ulterioară a datelor în scopuri statistice și de cercetare.',
      name: 'acord_date_personale',
      required: true,
      group: 'Declarații',
    })

    p.signatureFooter(ctx, { signatureLabel: 'Semnătura candidatului' })

    p.paragraph(ctx, 'Se completează de instituție', { size: 11, gap: 6 })
    p.paragraph(ctx, 'Conform Registrului de evidență a salariaților:', { size: 10, gap: 4 })
    p.labeledField(ctx, { label: 'Este încadrat/ă în funcția contractuală de execuție de', name: 'reges_functie', group: I })
    p.twoColFields(
      ctx,
      { label: 'De la data de', name: 'reges_data', group: I },
      { label: 'Șef serviciu, Serviciul Resurse Umane Salarizare', name: 'reges_sef_serviciu', group: I },
    )
    p.paragraph(ctx, 'Spațiu rezervat secretariatului comisiei de examen:', { size: 10, gap: 4 })
    p.checkbox(ctx, { label: 'Dosarul este complet.', name: 'dosar_complet', group: I })
    p.checkbox(ctx, { label: 'Dosarul este incomplet, documentele lipsă fiind:', name: 'dosar_incomplet', group: I })
    p.labeledField(ctx, { label: 'Documente lipsă', name: 'documente_lipsa', group: I })
    p.paragraph(
      ctx,
      'Candidatul a fost înștiințat cu privire la posibilitatea completării dosarului până la ' +
        'termenul limită de depunere a dosarelor de candidatură specificat în anunțul de examen.',
      { size: 9, gap: 6 },
    )
    p.signatureFooter(ctx, {
      dateLabel: 'Data',
      signatureLabel: 'Semnătura secretariatului comisiei de examen',
    })
  },
}

export default spec
