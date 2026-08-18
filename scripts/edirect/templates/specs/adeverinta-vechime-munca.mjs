/**
 * Adeverință de vechime în muncă și în specialitate, eliberată de angajator.
 *
 * National model — Art. 137 lit. e), Pct. V, Anexa nr. 10 din O.U.G. nr.
 * 57/2019 — authored from the two DASM Cluj-Napoca copies, which the forms page
 * lists once for personal contractual (`Formular-ADEVERINTA-VECHIME.pdf`) and
 * once for funcții publice (`Adeverinta-vechime-model-orientativ-1.pdf`). Their
 * wording is the same; one spec covers both.
 *
 * The mutations grid (modification, suspension, termination of the employment
 * relationship) is what turns a plain confirmation into proof of seniority, so
 * it is reproduced as a grid with its four columns.
 *
 * Left generic (no `organization`): it is issued by the applicant's own
 * employer, whoever that is.
 */

const A = 'Angajator'
const S = 'Salariat'
const V = 'Vechime'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'adeverinta-vechime-munca',
  name: 'Adeverință de vechime în muncă și în specialitate',
  title: 'ADEVERINȚĂ',
  description:
    'Adeverința prin care angajatorul atestă vechimea în muncă și în specialitatea studiilor, ' +
    'conform art. 137 lit. e), Pct. V, Anexa nr. 10 din O.U.G. nr. 57/2019. Se folosește la ' +
    'dosarele de concurs și de promovare.',
  category: 'Adeverințe',

  body(ctx, p) {
    p.labeledField(ctx, { label: 'Denumire angajator', name: 'angajator', required: true, group: A })
    p.labeledField(ctx, {
      label: 'Date de identificare ale angajatorului (adresa completă, CUI)', name: 'angajator_identificare', required: true, group: A,
    })
    p.labeledField(ctx, { label: 'Date de contact ale angajatorului (telefon, fax)', name: 'angajator_contact', group: A })
    p.twoColFields(
      ctx,
      { label: 'Nr. de înregistrare', name: 'nr_inregistrare', required: true, group: A },
      { label: 'Data înregistrării', name: 'data_inregistrare', required: true, group: A },
    )

    p.paragraph(ctx, 'Prin prezenta se atestă faptul că:', { size: 11, gap: 6 })
    p.labeledField(ctx, { label: 'Domnul/Doamna', name: 'nume_si_prenume', required: true, group: S })
    p.twoColFields(
      ctx,
      { label: 'B.I./C.I. seria și nr.', name: 'act_identitate', required: true, group: S },
      { label: 'CNP', name: 'cnp', required: true, group: S },
    )
    p.labeledField(ctx, { label: 'A fost/este angajatul', name: 'angajat_la', required: true, group: S })
    p.twoColFields(
      ctx,
      { label: 'În baza actului administrativ de numire nr.', name: 'act_numire_nr', group: S },
      { label: 'Contract individual de muncă nr. și data', name: 'contract_nr', group: S },
    )
    p.twoColFields(
      ctx,
      {
        label: 'Norma de lucru',
        name: 'norma',
        hint: 'Normă întreagă sau timp parțial, cu precizarea numărului de ore/zi.',
        group: S,
      },
      {
        label: 'Durata contractului',
        name: 'durata_contract',
        hint: 'Determinată sau nedeterminată.',
        group: S,
      },
    )
    p.labeledField(ctx, {
      label: 'Înregistrat în registrul general de evidență a salariaților cu nr. și data',
      name: 'reges_nr',
      group: S,
    })
    p.labeledField(ctx, {
      label: 'În funcția/meseria/ocupația de',
      name: 'functia',
      required: true,
      hint: 'Prin raportare la Clasificarea ocupațiilor din România și la actele normative care stabilesc funcții.',
      group: S,
    })
    p.twoColFields(
      ctx,
      {
        label: 'Nivelul studiilor solicitate',
        name: 'nivel_studii',
        hint: 'Mediu sau superior.',
        group: S,
      },
      { label: 'În specialitatea', name: 'specialitate_studii', group: S },
    )

    p.paragraph(
      ctx,
      'Pe durata executării contractului individual de muncă/raporturilor de serviciu a dobândit:',
      { size: 10.5, gap: 4 },
    )
    p.labeledField(ctx, { label: 'Vechime în muncă (ani, luni, zile)', name: 'vechime_munca', required: true, group: V })
    p.labeledField(ctx, {
      label: 'Vechime în specialitatea studiilor (ani, luni, zile)', name: 'vechime_specialitate', required: true, group: V,
    })

    p.paragraph(
      ctx,
      'Pe durata executării contractului individual de muncă/raporturilor de serviciu au intervenit ' +
        'următoarele mutații (modificarea, suspendarea, încetarea contractului individual de ' +
        'muncă/raporturilor de serviciu):',
      { size: 10, gap: 4 },
    )
    p.table(ctx, {
      name: 'mutatie',
      rows: 6,
      group: 'Mutații intervenite',
      columns: [
        { header: 'Mutația intervenită', key: 'mutatia' },
        { header: 'Data', key: 'data', width: 70 },
        { header: 'Meseria/funcția/ocupația cu indicarea clasei/gradației profesionale', key: 'functia' },
        { header: 'Nr. și data actului pe baza căruia se face înscrierea și temeiul legal', key: 'act' },
      ],
    })

    p.twoColFields(
      ctx,
      { label: 'În perioada lucrată a avut zile de concediu medical', name: 'zile_concediu_medical', group: V },
      { label: 'Zile de concediu fără plată', name: 'zile_concediu_fara_plata', group: V },
    )
    p.paragraph(ctx, 'În perioada lucrată (bifați):', { size: 10.5, gap: 2 })
    p.checkbox(ctx, { label: 'nu i s-a aplicat nicio sancțiune disciplinară;', name: 'sanctiune_nu', group: V })
    p.checkbox(ctx, { label: 'i s-a aplicat sancțiunea disciplinară:', name: 'sanctiune_da', group: V })
    p.labeledField(ctx, { label: 'Sancțiunea disciplinară aplicată', name: 'sanctiune_detalii', group: V })

    p.paragraph(
      ctx,
      'Cunoscând normele penale incidente în materia falsului în declarații, certificăm că datele ' +
        'cuprinse în prezenta adeverință sunt reale, exacte și complete.',
      { size: 9.5, gap: 8 },
    )
    p.labeledField(ctx, {
      label: 'Numele și prenumele reprezentantului legal al angajatorului',
      name: 'reprezentant_nume',
      required: true,
      hint: 'Persoana care, potrivit legii sau actelor constitutive, reprezintă angajatorul în relațiile cu terții.',
      group: 'Reprezentantul legal',
    })
    p.signatureFooter(ctx, {
      signatureLabel: 'Semnătura reprezentantului legal și ștampila',
    })
  },
}

export default spec
