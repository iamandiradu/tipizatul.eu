/**
 * Curriculum vitae — modelul european comun aprobat prin H.G. nr. 1021/2004.
 *
 * National model, authored from the DASM Cluj-Napoca copy
 * (`CV_European_HG_1021_2004-MODEL.pdf`), which the forms page lists in the
 * funcții publice set: this CV format is the one asked for in a public-sector
 * candidature file.
 *
 * The source repeats three professional-experience blocks and four
 * education blocks; those counts are kept. The italic guidance printed under
 * each heading on the model is informative rather than part of the CV — it is
 * carried as field hints, so it reaches the person filling in the form without
 * being printed into their finished CV.
 *
 * Left generic (no `organization`): a CV belongs to its author.
 */

const P = 'Informații personale'

function experienceBlock(ctx, p, { prefix, heading }) {
  const G = heading
  p.paragraph(ctx, heading, { size: 10.5, gap: 4 })
  p.labeledField(ctx, { label: 'Perioada (de la – până la)', name: `${prefix}_perioada`, group: G })
  p.labeledField(ctx, { label: 'Numele și adresa angajatorului', name: `${prefix}_angajator`, group: G })
  p.labeledField(ctx, { label: 'Tipul activității sau sectorul de activitate', name: `${prefix}_sector`, group: G })
  p.labeledField(ctx, { label: 'Funcția sau postul ocupat', name: `${prefix}_functia`, group: G })
  p.multilineField(
    ctx,
    { label: 'Principalele activități și responsabilități', name: `${prefix}_activitati`, group: G },
    { lines: 3 },
  )
}

function educationBlock(ctx, p, { prefix, heading }) {
  const G = heading
  p.paragraph(ctx, heading, { size: 10.5, gap: 4 })
  p.labeledField(ctx, { label: 'Perioada (de la – până la)', name: `${prefix}_perioada`, group: G })
  p.labeledField(ctx, {
    label: 'Numele și tipul instituției de învățământ și al organizației profesionale',
    name: `${prefix}_institutie`,
    group: G,
  })
  p.labeledField(ctx, { label: 'Domeniul studiat/aptitudini ocupaționale', name: `${prefix}_domeniu`, group: G })
  p.twoColFields(
    ctx,
    { label: 'Tipul calificării/diploma obținută', name: `${prefix}_diploma`, group: G },
    { label: 'Nivelul de clasificare a formei de instruire/învățământ', name: `${prefix}_nivel`, group: G },
  )
}

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'cv-european-hg-1021-2004',
  name: 'Curriculum vitae — model european (H.G. nr. 1021/2004)',
  title: 'CURRICULUM VITAE',
  description:
    'Modelul comun european de curriculum vitae aprobat prin H.G. nr. 1021/2004, cerut la ' +
    'dosarele de concurs din administrația publică: informații personale, experiență ' +
    'profesională, educație și formare, aptitudini și competențe personale.',
  category: 'Resurse umane',

  body(ctx, p) {
    p.paragraph(ctx, 'INFORMAȚII PERSONALE', { size: 11, gap: 6 })
    p.labeledField(ctx, { label: 'Nume (nume, prenume)', name: 'nume_si_prenume', required: true, group: P })
    p.labeledField(ctx, { label: 'Adresă (nr., strada, cod poștal, oraș, țara)', name: 'adresa', required: true, group: P })
    p.twoColFields(
      ctx,
      { label: 'Telefon', name: 'telefon', group: P },
      { label: 'Fax', name: 'fax', group: P },
    )
    p.twoColFields(
      ctx,
      { label: 'E-mail', name: 'email', group: P },
      { label: 'Naționalitate', name: 'nationalitate', group: P },
    )
    p.labeledField(ctx, { label: 'Data nașterii (ziua, luna, anul)', name: 'data_nasterii', group: P })

    p.paragraph(
      ctx,
      'EXPERIENȚĂ PROFESIONALĂ — menționați pe rând fiecare experiență profesională pertinentă, ' +
        'începând cu cea mai recentă dintre acestea.',
      { size: 10.5, gap: 6 },
    )
    experienceBlock(ctx, p, { prefix: 'exp1', heading: 'Experiența profesională 1' })
    experienceBlock(ctx, p, { prefix: 'exp2', heading: 'Experiența profesională 2' })
    experienceBlock(ctx, p, { prefix: 'exp3', heading: 'Experiența profesională 3' })

    p.paragraph(
      ctx,
      'EDUCAȚIE ȘI FORMARE — descrieți separat fiecare formă de învățământ și program de formare ' +
        'profesională urmate, începând cu cea mai recentă.',
      { size: 10.5, gap: 6 },
    )
    educationBlock(ctx, p, { prefix: 'edu1', heading: 'Educație și formare 1' })
    educationBlock(ctx, p, { prefix: 'edu2', heading: 'Educație și formare 2' })
    educationBlock(ctx, p, { prefix: 'edu3', heading: 'Educație și formare 3' })
    educationBlock(ctx, p, { prefix: 'edu4', heading: 'Educație și formare 4' })

    const A = 'Aptitudini și competențe personale'
    p.paragraph(
      ctx,
      'APTITUDINI ȘI COMPETENȚE PERSONALE — dobândite în cursul vieții și carierei, dar care nu ' +
        'sunt recunoscute neapărat printr-un certificat sau o diplomă.',
      { size: 10.5, gap: 6 },
    )
    p.labeledField(ctx, { label: 'Limba maternă', name: 'limba_materna', group: A })
    p.labeledField(ctx, {
      label: 'Limbi străine cunoscute',
      name: 'limbi_straine',
      hint: 'Enumerați limbile cunoscute și indicați nivelul: excelent, bine, satisfăcător.',
      group: A,
    })
    p.twoColFields(
      ctx,
      { label: 'Abilitatea de a citi', name: 'abilitate_citire', group: A },
      { label: 'Abilitatea de a scrie', name: 'abilitate_scriere', group: A },
    )
    p.labeledField(ctx, { label: 'Abilitatea de a vorbi', name: 'abilitate_vorbire', group: A })
    p.multilineField(
      ctx,
      {
        label: 'Aptitudini și competențe artistice',
        name: 'competente_artistice',
        hint: 'Muzică, desen, pictură, literatură etc. Descrieți aptitudinile și contextul în care le-ați dobândit.',
        group: A,
      },
      { lines: 2 },
    )
    p.multilineField(
      ctx,
      {
        label: 'Aptitudini și competențe sociale',
        name: 'competente_sociale',
        hint:
          'De exemplu: locuiți și munciți cu alte persoane într-un mediu multicultural, ocupați o ' +
          'poziție în care comunicarea este importantă sau desfășurați o activitate în care munca ' +
          'de echipă este esențială.',
        group: A,
      },
      { lines: 2 },
    )
    p.multilineField(
      ctx,
      {
        label: 'Aptitudini și competențe organizatorice',
        name: 'competente_organizatorice',
        hint:
          'De exemplu: coordonați sau conduceți activitatea altor persoane, proiecte și gestionați ' +
          'bugete, la locul de muncă, în acțiuni voluntare sau la domiciliu.',
        group: A,
      },
      { lines: 2 },
    )
    p.multilineField(
      ctx,
      {
        label: 'Aptitudini și competențe tehnice',
        name: 'competente_tehnice',
        hint: 'Utilizare calculator, anumite tipuri de echipamente, mașini etc.',
        group: A,
      },
      { lines: 2 },
    )
    p.labeledField(ctx, { label: 'Permis de conducere', name: 'permis_conducere', group: A })
    p.multilineField(
      ctx,
      {
        label: 'Alte aptitudini și competențe',
        name: 'alte_competente',
        hint: 'Competențe care nu au mai fost menționate anterior.',
        group: A,
      },
      { lines: 2 },
    )

    const S = 'Informații suplimentare'
    p.multilineField(
      ctx,
      {
        label: 'Informații suplimentare',
        name: 'informatii_suplimentare',
        hint: 'Alte informații utile care nu au fost menționate, de exemplu persoane de contact, referințe.',
        group: S,
      },
      { lines: 3 },
    )
    p.multilineField(
      ctx,
      { label: 'Anexe', name: 'anexe', hint: 'Enumerați documentele atașate CV-ului, dacă este cazul.', group: S },
      { lines: 2 },
    )

    p.signatureFooter(ctx)
  },
}

export default spec
