/**
 * Phase 3 replica — „Anexa nr. 3: Cerere pentru eliberarea apostilei",
 * Instituția Prefectului. 18 files across the county prefectures.
 *
 * Two different people appear in this form and conflating them would be a real
 * error: the person FILLING IN the request (who may be an authorised
 * representative, hence the împuternicire number) and the HOLDER of the
 * documents being apostilled. The source keeps them apart with separate
 * identity blocks and two signature lines; so does this.
 *
 * The ten numbered act slots are printed on the form as a 2x5 grid. Only the
 * first is required — an applicant with one document should not have to defeat
 * nine validation errors.
 */

const G_SOLICITANT = 'Solicitant'
const G_ACTE = 'Actele pentru care se solicită apostila'
const G_TITULAR = 'Titularul actelor'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'cerere-apostila',
  name: 'Cerere pentru eliberarea apostilei',
  title: 'CERERE',
  description:
    'Cerere adresată Instituției Prefectului pentru eliberarea apostilei pe ' +
    'acte oficiale, în vederea folosirii acestora în străinătate (Anexa nr. 3).',
  category: 'Cereri',

  body(ctx, p) {
    // Legal anchor — identifies which annex of the apostille norms this is.
    p.paragraph(ctx, 'Anexa nr. 3', { size: 9, gap: 6 })
    p.paragraph(ctx, 'pentru eliberarea apostilei', { size: 11, gap: 10 })
    p.paragraph(ctx, 'DOAMNĂ / DOMNULE PREFECT,', { size: 11, gap: 10 })

    p.labeledField(ctx, {
      label: 'Subsemnatul(a)',
      name: 'solicitant_nume',
      required: true,
      hint: 'Numele persoanei care completează cererea.',
      group: G_SOLICITANT,
      maxLength: 120,
    })
    p.labeledField(ctx, {
      label: 'În calitate de',
      name: 'solicitant_calitate',
      required: true,
      hint: 'Titular al actelor, împuternicit, rudă etc.',
      group: G_SOLICITANT,
      maxLength: 80,
    })

    p.paragraph(ctx, 'Domiciliat(ă) în:', { size: 10, gap: 4 })
    p.labeledField(ctx, { label: 'Localitatea', name: 'solicitant_localitate', required: true, group: G_SOLICITANT })
    p.labeledField(ctx, { label: 'Strada', name: 'solicitant_strada', required: true, group: G_SOLICITANT })
    p.twoColFields(
      ctx,
      { label: 'Nr.', name: 'solicitant_nr', group: G_SOLICITANT, maxLength: 10 },
      { label: 'Sc.', name: 'solicitant_scara', group: G_SOLICITANT, maxLength: 6 },
    )
    p.twoColFields(
      ctx,
      { label: 'Ap.', name: 'solicitant_apartament', group: G_SOLICITANT, maxLength: 6 },
      { label: 'Județul/sectorul', name: 'solicitant_judet', required: true, group: G_SOLICITANT },
    )

    p.labeledField(ctx, {
      label: 'Titular al actului de identitate (tipul actului)',
      name: 'solicitant_act_tip',
      required: true,
      group: G_SOLICITANT,
      maxLength: 40,
    })
    p.twoColFields(
      ctx,
      { label: 'Seria', name: 'solicitant_act_serie', required: true, group: G_SOLICITANT, maxLength: 10 },
      { label: 'Nr.', name: 'solicitant_act_numar', required: true, group: G_SOLICITANT, maxLength: 20 },
    )

    p.paragraph(
      ctx,
      'vă rog să aprobați eliberarea apostilei pe un număr de acte, reprezentând ' +
        '(se menționează tipul actului):',
      { size: 11, gap: 8 },
    )
    p.labeledField(ctx, {
      label: 'Număr de acte',
      name: 'numar_acte',
      required: true,
      group: G_ACTE,
      maxLength: 4,
    })
    for (let i = 1; i <= 10; i++) {
      p.labeledField(ctx, {
        label: `${i}.`,
        name: `act_${i}`,
        required: i === 1,
        group: G_ACTE,
        maxLength: 120,
      })
    }

    p.labeledField(ctx, {
      label: 'Aparținând lui',
      name: 'titular_nume',
      required: true,
      hint: 'Numele titularului actului pentru care se solicită apostila.',
      group: G_TITULAR,
      maxLength: 120,
    })
    // Printed captions, not just hints: on paper these disambiguate whose name
    // and whose citizenship the two identity blocks are asking for.
    p.paragraph(ctx, '(numele titularului actului pentru care se solicită eliberarea apostilei)', { size: 8, gap: 4 })
    p.labeledField(ctx, {
      label: 'Cetățean',
      name: 'titular_cetatenie',
      required: true,
      hint: 'Cetățenia titularului actului.',
      group: G_TITULAR,
      maxLength: 60,
    })
    p.paragraph(ctx, '(cetățenia titularului actului)', { size: 8, gap: 4 })
    p.labeledField(ctx, {
      label: 'Titular al actului de identitate (tipul actului)',
      name: 'titular_act_tip',
      group: G_TITULAR,
      maxLength: 40,
    })
    p.twoColFields(
      ctx,
      { label: 'Seria', name: 'titular_act_serie', group: G_TITULAR, maxLength: 10 },
      { label: 'Nr.', name: 'titular_act_numar', group: G_TITULAR, maxLength: 20 },
    )
    p.labeledField(ctx, {
      label: 'Numărul actului de împuternicire',
      name: 'imputernicire_nr',
      hint: 'Se completează doar dacă cererea este depusă de un împuternicit.',
      group: G_TITULAR,
      maxLength: 60,
    })

    p.labeledField(ctx, {
      label: 'Menționez că aceste acte sunt necesare în',
      name: 'stat_destinatie',
      required: true,
      hint: 'Statul în care urmează a fi folosit actul.',
      group: G_ACTE,
      maxLength: 80,
    })

    p.paragraph(
      ctx,
      'Cunoscând prevederile art. 326 și ale art. 327 din Codul Penal, cu privire ' +
        'la falsul în declarații și falsul privind identitatea, declar că datele ' +
        'înscrise în prezenta cerere sunt conforme cu realitatea.',
      { size: 11, gap: 8 },
    )
    p.checkbox(ctx, {
      label:
        'Declar că datele înscrise în prezenta cerere sunt conforme cu realitatea.',
      name: 'confirm_declaratie',
      required: true,
      group: G_SOLICITANT,
    })

    p.twoColFields(
      ctx,
      { label: 'Data completării', name: 'data_completarii', required: true, group: G_SOLICITANT, validation: 'date' },
      { label: 'Semnătura (celui care completează cererea)', name: 'semnatura_solicitant', group: G_SOLICITANT },
    )
    // "Data eliberării" and the receipt signature belong to the apostille
    // office and the person collecting the documents — never the applicant, so
    // nothing here is required.
    p.paragraph(ctx, 'Se completează de reprezentantul biroului apostilă:', { size: 9, gap: 4 })
    p.twoColFields(
      ctx,
      { label: 'Data eliberării', name: 'data_eliberarii', group: 'Uz oficial' },
      { label: 'Semnătura (celui care primește actele)', name: 'semnatura_primire', group: 'Uz oficial' },
    )

    p.paragraph(
      ctx,
      'DOAMNEI/DOMNULUI PREFECT AL JUDEȚULUI / MUNICIPIULUI',
      { size: 11, gap: 4 },
    )
    p.labeledField(ctx, {
      label: 'Județul / municipiul',
      name: 'judet_prefect',
      required: true,
      group: G_SOLICITANT,
      maxLength: 60,
    })

    // The superscript markers 1)–5) in the body are meaningless without this
    // legend: it defines who may file the request and which documents count as
    // identity. Dropping it would leave the "în calitate de" and "act de
    // identitate" fields unanswerable.
    p.paragraph(ctx, 'Note:', { size: 9, gap: 4 })
    p.paragraph(
      ctx,
      '1 – titular al actului, soț/soție al/a titularului, rudă de gradul I sau II ' +
        '(se menționează gradul de rudenie), împuternicit cu procură notarială, ' +
        'delegat al unei persoane juridice (se menționează denumirea persoanei ' +
        'juridice), avocat, după caz;',
      { size: 8, gap: 3 },
    )
    p.paragraph(
      ctx,
      '2 – se completează, după caz, cu datele solicitantului privind domiciliul ' +
        '(în cazul persoanei fizice), respectiv localitatea unde are sediul ' +
        'persoana juridică;',
      { size: 8, gap: 3 },
    )
    p.paragraph(
      ctx,
      '3, 4 – act de identitate, alt document similar emis de instituții sau ' +
        'autorități publice din statul, altul decât România, în care are ' +
        'domiciliul sau reședința, ori pașaport; pentru persoane juridice se ' +
        'înscrie codul unic de identificare (CUI);',
      { size: 8, gap: 3 },
    )
    p.paragraph(
      ctx,
      '5 – se completează numărul actului de împuternicire, dacă cererea este ' +
        'depusă prin împuternicit.',
      { size: 8, gap: 8 },
    )

    // Reproduced verbatim, including the ANSPDCP registration number: this is a
    // legally prescribed notice, and an approximation of it is not the notice.
    p.paragraph(
      ctx,
      'Instituția Prefectului prelucrează datele cu caracter personal furnizate de ' +
        'dumneavoastră prin acest document prin mijloace automatizate/manual în ' +
        'scopul eliberării apostilei potrivit notificării la Autoritatea Națională ' +
        'de Supraveghere a Prelucrării Datelor cu Caracter Personal, înregistrată ' +
        'cu numărul 34059 în Registrul de Evidență a Prelucrărilor de Date cu ' +
        'caracter Personal, iar datele înregistrate sunt destinate utilizării de ' +
        'către operator și sunt comunicate numai destinatarilor abilitați de lege. ' +
        'Conform Regulamentului (UE) nr. 679/2016, cu modificările și completările ' +
        'ulterioare, aveți dreptul de acces, de opoziție, de intervenție asupra ' +
        'datelor, precum și de a nu fi supus unei decizii individuale. Pentru ' +
        'exercitarea acestor drepturi, vă puteți adresa cu o cerere scrisă, datată ' +
        'și semnată la registratura Instituției Prefectului. Totodată, aveți ' +
        'dreptul de a vă adresa justiției, în condițiile legii. Prin completarea și ' +
        'semnarea cererii, vă dați acordul cu privire la colectarea și prelucrarea ' +
        'datelor cu caracter personal.',
      { size: 8, gap: 6 },
    )
  },
}

export default spec
