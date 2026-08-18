/**
 * Anexă — informații suplimentare pentru alocația de stat, în cazul copiilor
 * născuți sau rezidenți într-un alt stat UE.
 *
 * National model, authored from the DASM Cluj-Napoca copy
 * (`anexa-informatii-suplimentare-UE-pt.-alocatia-de-stat.pdf`). It exists to
 * settle which state pays the family benefit under Regulation (EC) 883/2004:
 * the employment and residence periods of BOTH parents, in Romania and abroad,
 * are what the two institutions compare. Both parent sections and the three
 * child slots are therefore reproduced in full.
 *
 * The foreign identification code (NIE, codice fiscale, …) is a free-text field
 * rather than a CNP grid — for most applicants it is not a Romanian CNP.
 */

const ID_HINT =
  'Codul specific țării în care locuiți: NIE pentru Spania, codice fiscale pentru Italia, CNP pentru România etc.'

function personSection(ctx, p, { prefix, heading }) {
  const G = heading
  p.paragraph(ctx, heading, { size: 11, gap: 6 })
  p.labeledField(ctx, { label: 'Nume de familie', name: `${prefix}_nume`, required: true, group: G })
  p.labeledField(ctx, { label: 'Prenume', name: `${prefix}_prenume`, required: true, group: G })
  p.labeledField(ctx, { label: 'Nume anterioare', name: `${prefix}_nume_anterioare`, group: G })
  p.twoColFields(
    ctx,
    { label: 'Naționalitate', name: `${prefix}_nationalitate`, group: G },
    { label: 'Cod de identificare', name: `${prefix}_cod_identificare`, group: G },
  )
  p.twoColFields(
    ctx,
    { label: 'Data nașterii', name: `${prefix}_data_nasterii`, group: G },
    { label: 'Localitatea nașterii', name: `${prefix}_localitate_nastere`, group: G },
  )
  p.twoColFields(
    ctx,
    { label: 'Provincia sau departamentul (județul)', name: `${prefix}_provincie`, group: G },
    { label: 'Țara', name: `${prefix}_tara_nastere`, group: G },
  )
  p.labeledField(ctx, { label: 'Țara unde a fost plecat (sau este plecat)', name: `${prefix}_tara_plecare`, group: G })
  p.labeledField(ctx, { label: 'Adresa în acea țară', name: `${prefix}_adresa_strainatate`, group: G })
  p.labeledField(ctx, {
    label: 'Perioada de activitate profesională în România', name: `${prefix}_activitate_ro`, group: G,
  })
  p.labeledField(ctx, {
    label: 'Perioada de activitate profesională în afara României (specificați țara)',
    name: `${prefix}_activitate_strainatate`,
    group: G,
  })
  p.labeledField(ctx, {
    label: 'Perioadele cu venituri de înlocuire în România',
    name: `${prefix}_venituri_inlocuire_ro`,
    hint: 'Șomaj, indemnizație pentru incapacitate de muncă, indemnizații pentru creșterea copilului, indemnizații pre și postnatale etc.',
    group: G,
  })
  p.labeledField(ctx, {
    label: 'Perioadele cu venituri de înlocuire în afara României (specificați țara)',
    name: `${prefix}_venituri_inlocuire_strainatate`,
    group: G,
  })
  p.twoColFields(
    ctx,
    { label: 'Locul de rezidență actual', name: `${prefix}_rezidenta_actuala`, group: G },
    { label: 'Țările pentru care aveți acte de rezidență', name: `${prefix}_tari_rezidenta`, group: G },
  )
}

function childSection(ctx, p, { prefix, heading }) {
  const G = heading
  p.paragraph(ctx, heading, { size: 10.5, gap: 4 })
  p.twoColFields(
    ctx,
    { label: 'Nume de familie', name: `${prefix}_nume`, group: G },
    { label: 'Prenume', name: `${prefix}_prenume`, group: G },
  )
  p.twoColFields(
    ctx,
    { label: 'Locul nașterii', name: `${prefix}_loc_nastere`, group: G },
    { label: 'Data nașterii', name: `${prefix}_data_nasterii`, group: G },
  )
  p.twoColFields(
    ctx,
    { label: 'Naționalitate', name: `${prefix}_nationalitate`, group: G },
    { label: 'Cod de identificare', name: `${prefix}_cod_identificare`, group: G },
  )
  p.twoColFields(
    ctx,
    { label: 'Țara de rezidență actuală', name: `${prefix}_tara_rezidenta`, group: G },
    { label: 'Perioada în care a locuit în altă țară decât România', name: `${prefix}_perioada_strainatate`, group: G },
  )
}

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'anexa-informatii-suplimentare-ue',
  name: 'Anexă informații suplimentare UE — alocația de stat pentru copii',
  title: 'ANEXĂ — INFORMAȚII SUPLIMENTARE (UE)',
  description:
    'Anexa la cererea de alocație de stat pentru copiii născuți sau care au locuit într-un alt ' +
    'stat membru UE: date despre titular, soț/soție și copii, perioadele de activitate ' +
    'profesională și de rezidență în România și în străinătate.',
  category: 'Cereri',

  body(ctx, p) {
    p.paragraph(
      ctx,
      'Se completează cu datele solicitate mai jos. Codul de identificare este cel specific țării ' +
        'de reședință. ' + ID_HINT,
      { size: 9, gap: 10 },
    )

    personSection(ctx, p, { prefix: 'titular', heading: 'I. Informații privind titularul cererii' })
    personSection(ctx, p, { prefix: 'sot', heading: 'II. Informații privind soțul/soția titularului cererii' })

    p.paragraph(ctx, 'III. Informații despre copii', { size: 11, gap: 6 })
    childSection(ctx, p, { prefix: 'copil1', heading: 'Copilul 1' })
    childSection(ctx, p, { prefix: 'copil2', heading: 'Copilul 2' })
    childSection(ctx, p, { prefix: 'copil3', heading: 'Copilul 3' })

    p.paragraph(ctx, 'Informații suplimentare pentru cei care s-au întors în România', { size: 10.5, gap: 4 })
    const R = 'Întoarcerea în România'
    p.labeledField(ctx, { label: 'Data întoarcerii în țară', name: 'data_intoarcere', group: R })
    p.labeledField(ctx, { label: 'Locul de muncă actual și data angajării — soț', name: 'loc_munca_sot', group: R })
    p.labeledField(ctx, { label: 'Locul de muncă actual și data angajării — soție', name: 'loc_munca_sotie', group: R })

    p.paragraph(
      ctx,
      'Prin semnarea prezentei am luat la cunoștință că cele declarate sunt corecte și complete, ' +
        'iar declararea necorespunzătoare a adevărului se pedepsește conform legii penale.',
      { size: 9.5, gap: 8 },
    )
    p.signatureFooter(ctx)
  },
}

export default spec
