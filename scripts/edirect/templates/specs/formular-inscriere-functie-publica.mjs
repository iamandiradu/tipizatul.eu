/**
 * Formular de înscriere la concursul pentru o funcție publică — Anexa nr. 1 la
 * O.U.G. nr. 57/2019 (Codul administrativ), modificată prin O.U.G. nr. 121/2023.
 *
 * National model, authored from the DASM Cluj-Napoca copy
 * (`Formular-inscriere-Funct-Publici.doc`). Studies, languages, IT skills and
 * career history are grids on the source and stay grids here — the selection
 * committee scores them line by line.
 *
 * The declarations at the end are the eligibility conditions of art. 465 alin.
 * (1) from the Codul administrativ. Each is a two-way statement on the source
 * ("am fost / nu am fost"), and the difference between the two answers is the
 * candidate's eligibility, so each keeps both options rather than becoming a
 * single tick.
 *
 * Left generic (no `organization`): every public authority uses this form.
 */

const G = 'Candidat'
const D = 'Declarații pe propria răspundere'
const C = 'Consimțăminte'

function twoWay(ctx, p, { name, affirmative, negative, group = D }) {
  p.checkbox(ctx, { label: affirmative, name: `${name}_da`, group })
  p.checkbox(ctx, { label: negative, name: `${name}_nu`, group })
}

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'formular-inscriere-functie-publica',
  name: 'Formular de înscriere la concurs — funcție publică (Anexa nr. 1, O.U.G. 57/2019)',
  title: 'FORMULAR DE ÎNSCRIERE',
  description:
    'Formularul de înscriere la etapa de selecție pentru ocuparea unei funcții publice, Anexa nr. 1 ' +
    'la O.U.G. nr. 57/2019 privind Codul administrativ, modificată prin O.U.G. nr. 121/2023: ' +
    'studii, limbi străine, cunoștințe de operare calculator, cariera profesională și declarațiile ' +
    'privind condițiile de ocupare a funcției publice.',
  category: 'Resurse umane',

  body(ctx, p) {
    p.paragraph(ctx, 'Anexa nr. 1 — O.U.G. nr. 57/2019, modificată prin O.U.G. nr. 121/2023', { size: 9, gap: 10 })

    p.labeledField(ctx, {
      label: 'Autoritatea sau instituția publică în cadrul căreia se află funcția publică vacantă',
      name: 'institutia',
      required: true,
      group: G,
    })
    p.labeledField(ctx, { label: 'Funcția publică solicitată', name: 'functia_solicitata', required: true, group: G })
    p.twoColFields(
      ctx,
      { label: 'Serviciul', name: 'serviciu', group: G },
      { label: 'Data organizării etapei de selecție (proba scrisă)', name: 'data_proba_scrisa', group: G },
    )
    p.labeledField(ctx, { label: 'Numele și prenumele candidatului', name: 'nume_si_prenume', required: true, group: G })
    p.labeledField(ctx, { label: 'Adresa', name: 'adresa', required: true, group: G })
    p.twoColFields(
      ctx,
      { label: 'E-mail', name: 'email', required: true, group: G },
      { label: 'Telefon', name: 'telefon', required: true, group: G },
    )
    p.twoColFields(
      ctx,
      { label: 'Identificator unic al candidatului', name: 'identificator_unic', group: G },
      { label: 'Nr. dosar înscriere la etapa de selecție', name: 'nr_dosar', group: G },
    )

    const studyColumns = [
      { header: 'Instituția', key: 'institutia' },
      { header: 'Perioada', key: 'perioada', width: 110 },
      { header: 'Diploma obținută', key: 'diploma' },
    ]
    p.paragraph(ctx, 'Studii medii liceale sau postliceale:', { size: 10.5, gap: 4 })
    p.table(ctx, { name: 'studii_medii', rows: 2, group: 'Studii medii sau postliceale', columns: studyColumns })
    p.paragraph(ctx, 'Studii superioare de scurtă durată:', { size: 10.5, gap: 4 })
    p.table(ctx, { name: 'studii_scurte', rows: 2, group: 'Studii superioare de scurtă durată', columns: studyColumns })
    p.paragraph(ctx, 'Studii superioare de lungă durată:', { size: 10.5, gap: 4 })
    p.table(ctx, { name: 'studii_lungi', rows: 2, group: 'Studii superioare de lungă durată', columns: studyColumns })
    p.paragraph(ctx, 'Studii universitare de masterat sau doctorat ori studii postuniversitare:', { size: 10.5, gap: 4 })
    p.table(ctx, { name: 'studii_master', rows: 2, group: 'Studii de masterat, doctorat sau postuniversitare', columns: studyColumns })
    p.paragraph(ctx, 'Alte tipuri de studii:', { size: 10.5, gap: 4 })
    p.table(ctx, { name: 'studii_alte', rows: 2, group: 'Alte tipuri de studii', columns: studyColumns })

    p.paragraph(
      ctx,
      'Limbi străine (nivelul se menționează prin raportare la Cadrul european comun de referință ' +
        'pentru limbi străine):',
      { size: 10.5, gap: 4 },
    )
    p.table(ctx, {
      name: 'limba',
      rows: 3,
      group: 'Limbi străine',
      columns: [
        { header: 'Limba', key: 'limba' },
        { header: 'Înțelegere', key: 'intelegere', width: 90 },
        { header: 'Vorbire', key: 'vorbire', width: 90 },
        { header: 'Scriere', key: 'scriere', width: 90 },
      ],
    })

    p.multilineField(
      ctx,
      {
        label: 'Cunoștințe de operare calculator',
        name: 'cunostinte_calculator',
        hint:
          'Se indică sistemele de operare, editare sau orice alte categorii de programe IT pentru ' +
          'care există competențe de utilizare, precum și, dacă este cazul, diplomele sau ' +
          'certificatele care atestă deținerea acestor competențe.',
        group: 'Cunoștințe de operare calculator',
      },
      { lines: 3 },
    )

    p.paragraph(
      ctx,
      'Cariera profesională (în ordine invers cronologică, activitatea profesională actuală și anterioară):',
      { size: 10.5, gap: 4 },
    )
    p.table(ctx, {
      name: 'cariera',
      rows: 4,
      group: 'Cariera profesională',
      columns: [
        { header: 'Perioada', key: 'perioada', width: 110 },
        { header: 'Instituția/Firma', key: 'institutia' },
        { header: 'Funcția', key: 'functia' },
      ],
    })

    p.paragraph(ctx, 'Declarații pe propria răspundere:', { size: 11, gap: 4 })
    p.labeledField(ctx, { label: 'Subsemnatul/a', name: 'declarant_nume', required: true, group: D })
    p.twoColFields(
      ctx,
      { label: 'Legitimat/ă cu CI/BI seria și numărul', name: 'act_identitate', required: true, group: D },
      { label: 'Eliberat/ă la data de', name: 'act_data', group: D },
    )
    p.paragraph(
      ctx,
      'Cunoscând prevederile art. 465 alin. (1) lit. i) din O.U.G. nr. 57/2019 privind Codul ' +
        'administrativ, declar pe propria răspundere că:',
      { size: 9.5, gap: 2 },
    )
    twoWay(ctx, p, {
      name: 'interdictie_functie',
      affirmative:
        'mi-a fost interzis dreptul de a ocupa o funcție publică sau de a exercita profesia ori ' +
        'activitatea, prin hotărâre judecătorească definitivă, în condițiile legii;',
      negative: 'nu mi-a fost interzis acest drept.',
    })
    p.paragraph(
      ctx,
      'Cunoscând prevederile art. 465 alin. (1) lit. h) din Codul administrativ, declar pe propria ' +
        'răspundere că:',
      { size: 9.5, gap: 2 },
    )
    twoWay(ctx, p, {
      name: 'fapte_cazier',
      affirmative:
        'am săvârșit fapte de natura celor înscrise în cazierul judiciar și pentru care nu a ' +
        'intervenit reabilitarea, amnistia post-condamnatorie sau dezincriminarea faptei;',
      negative: 'nu am săvârșit astfel de fapte.',
    })
    p.paragraph(
      ctx,
      'Cunoscând prevederile art. 465 alin. (1) lit. j) din Codul administrativ, declar pe propria ' +
        'răspundere că în ultimii 3 ani:',
      { size: 9.5, gap: 2 },
    )
    twoWay(ctx, p, {
      name: 'destituire',
      affirmative: 'am fost destituit/ă dintr-o funcție publică;',
      negative: 'nu am fost destituit/ă dintr-o funcție publică;',
    })
    twoWay(ctx, p, {
      name: 'incetare_cim',
      affirmative: 'mi-a încetat contractul individual de muncă pentru motive disciplinare;',
      negative: 'nu mi-a încetat contractul individual de muncă pentru motive disciplinare.',
    })
    p.paragraph(
      ctx,
      'Cunoscând prevederile art. 465 alin. (1) lit. k) din Codul administrativ, declar pe propria ' +
        'răspundere că:',
      { size: 9.5, gap: 2 },
    )
    twoWay(ctx, p, {
      name: 'lucrator_securitate',
      affirmative: 'am fost lucrător al Securității sau colaborator al acesteia;',
      negative: 'nu am fost lucrător al Securității sau colaborator al acesteia.',
    })

    p.paragraph(
      ctx,
      'Cunoscând prevederile art. 4 pct. 2 și 11, art. 6 alin. (1) lit. a) și art. 7 din ' +
        'Regulamentul (UE) 2016/679, declar următoarele:',
      { size: 9.5, gap: 2 },
    )
    twoWay(ctx, p, {
      name: 'consimtamant_selectie',
      affirmative:
        'îmi exprim consimțământul cu privire la termenii și condițiile de organizare a etapei de ' +
        'selecție, prelucrarea datelor cu caracter personal cuprinse în prezentul formular și ' +
        'primirea notificărilor prin platforma informatică de concurs;',
      negative: 'nu îmi exprim acest consimțământ;',
      group: C,
    })
    twoWay(ctx, p, {
      name: 'consimtamant_cazier',
      affirmative:
        'îmi exprim consimțământul ca instituția organizatoare să solicite organelor abilitate ' +
        'extrasul de pe cazierul judiciar cu scopul angajării;',
      negative: 'nu îmi exprim acest consimțământ;',
      group: C,
    })
    twoWay(ctx, p, {
      name: 'consimtamant_statistic',
      affirmative: 'îmi exprim consimțământul cu privire la prelucrarea ulterioară a datelor cu caracter personal în scopuri statistice și de cercetare;',
      negative: 'nu îmi exprim acest consimțământ.',
      group: C,
    })

    p.paragraph(
      ctx,
      'În baza prevederilor art. 87 alin. (4) și art. 89 alin. (3) din Legea nr. 448/2006 privind ' +
        'protecția și promovarea drepturilor persoanelor cu handicap, ca persoană cu dizabilități:',
      { size: 9.5, gap: 2 },
    )
    twoWay(ctx, p, {
      name: 'adaptare_rezonabila',
      affirmative: 'solicit adaptarea rezonabilă a condițiilor de desfășurare a concursului;',
      negative: 'nu solicit adaptarea rezonabilă a condițiilor de desfășurare a concursului.',
      group: C,
    })
    p.multilineField(
      ctx,
      {
        label: 'Propuneri privind instrumentele necesare pentru asigurarea accesibilității probelor de concurs',
        name: 'propuneri_accesibilitate',
        group: C,
      },
      { lines: 3 },
    )

    p.paragraph(
      ctx,
      'Cunoscând prevederile art. 326 din Codul penal cu privire la falsul în declarații, declar pe ' +
        'propria răspundere că datele furnizate în acest formular sunt adevărate.',
      { size: 9.5, gap: 8 },
    )
    p.signatureFooter(ctx)
  },
}

export default spec
