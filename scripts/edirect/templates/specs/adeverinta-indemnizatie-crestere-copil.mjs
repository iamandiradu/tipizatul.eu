/**
 * ANEXA nr. 2 — adeverința eliberată de angajator pentru dosarul de
 * indemnizație pentru creșterea copilului (H.G. nr. 52/2011).
 *
 * National model, authored from the DASM Cluj-Napoca copy
 * (`ADEVERINTA-TIP.pdf` / `Adeverinta_model_2016.pdf`). It is filled in by the
 * employer, not by the parent: the employer certifies the employee's status,
 * the maternity/childcare leave already taken, and the net income of each of
 * the 24 months before the birth. The 24-month grid IS the document — the
 * indemnity is computed from it — so it is reproduced row by row rather than
 * collapsed.
 *
 * Left generic (no `organization`): every employer in the country issues this
 * one. It reaches DASM Cluj's procedure pages through the document joins.
 */

const A = 'Angajator'
const S = 'Salariat'
const C = 'Condiții de acordare'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'adeverinta-indemnizatie-crestere-copil',
  name: 'Adeverință de la angajator — indemnizație creștere copil (Anexa nr. 2)',
  title: 'ADEVERINȚĂ',
  description:
    'Adeverința tip (Anexa nr. 2 la Normele metodologice aprobate prin H.G. nr. 52/2011) pe care ' +
    'angajatorul o eliberează pentru dosarul de indemnizație pentru creșterea copilului: calitatea ' +
    'salariatului, concediile de maternitate și creștere a copilului și veniturile nete din ' +
    'ultimele 24 de luni.',
  category: 'Adeverințe',

  body(ctx, p) {
    p.paragraph(ctx, 'Anexa nr. 2', { size: 9, gap: 10 })

    p.labeledField(ctx, { label: 'Denumire angajator/instituție', name: 'angajator', required: true, group: A })
    p.labeledField(ctx, { label: 'Sediu angajator/instituție', name: 'angajator_sediu', required: true, group: A })
    p.twoColFields(
      ctx,
      { label: 'Nr. O.R.C.', name: 'nr_onrc', group: A },
      { label: 'Cod CUI', name: 'cui', required: true, maxLength: 12, group: A },
    )
    p.twoColFields(
      ctx,
      { label: 'Telefon/fax', name: 'telefon', group: A },
      { label: 'Adeverința nr. / data', name: 'adeverinta_nr', required: true, group: A },
    )

    p.paragraph(ctx, 'Se adeverește prin prezenta că:', { size: 11, gap: 6 })
    p.checkbox(ctx, { label: 'Dl.', name: 'dl', group: S })
    p.checkbox(ctx, { label: 'Dna.', name: 'dna', group: S })
    p.labeledField(ctx, { label: 'Nume', name: 'nume', required: true, group: S })
    p.labeledField(ctx, { label: 'Numele înainte de căsătorie', name: 'nume_anterior', group: S })
    p.labeledField(ctx, { label: 'Prenume', name: 'prenume', required: true, group: S })
    p.combField(ctx, { label: 'CNP', name: 'cnp', required: true, group: S }, { cells: 13 })
    p.paragraph(ctx, 'Cetățenie:', { size: 10.5, gap: 2 })
    p.checkbox(ctx, { label: 'română;', name: 'cetatenie_romana', group: S })
    p.checkbox(ctx, { label: 'UE;', name: 'cetatenie_ue', group: S })
    p.checkbox(ctx, { label: 'non-UE.', name: 'cetatenie_non_ue', group: S })

    p.labeledField(ctx, { label: 'Cu domiciliul în: strada', name: 'adresa', required: true, group: S })
    p.labeledField(ctx, { label: 'Nr., bl., sc., apart., sector', name: 'adresa_detalii', group: S })
    p.twoColFields(
      ctx,
      { label: 'Localitatea', name: 'localitate', required: true, group: S },
      { label: 'Județul', name: 'judet', required: true, group: S },
    )
    p.labeledField(ctx, {
      label: 'Având în instituția noastră calitatea de',
      name: 'calitate',
      required: true,
      hint: 'De ex. salariat cu contract individual de muncă pe perioadă nedeterminată/determinată, șomer, pensionar de invaliditate etc.',
      group: S,
    })
    p.labeledField(ctx, { label: 'De la data de', name: 'calitate_de_la', required: true, group: S })

    p.paragraph(
      ctx,
      'I. Referitor la îndeplinirea condițiilor de acordare a concediului și indemnizației pentru ' +
        'creșterea copilului:',
      { size: 10.5, gap: 6 },
    )
    p.twoColFields(
      ctx,
      { label: 'A beneficiat de indemnizație de maternitate din', name: 'maternitate_de_la', group: C },
      { label: 'Până la', name: 'maternitate_pana_la', group: C },
    )
    p.labeledField(ctx, {
      label: 'Cele 42 de zile din concediul de lăuzie se împlinesc în data de', name: 'lauzie_data', group: C,
    })
    p.twoColFields(
      ctx,
      { label: 'A beneficiat de indemnizație pentru creșterea copilului din', name: 'icc_de_la', group: C },
      { label: 'Până la', name: 'icc_pana_la', group: C },
    )
    p.labeledField(ctx, {
      label: 'Se aprobă concediul pentru creșterea copilului începând cu data de',
      name: 'concediu_incepand_cu',
      group: C,
    })

    p.paragraph(
      ctx,
      'II. Referitor la veniturile realizate în ultimele 24 de luni anterior datei nașterii copilului:',
      { size: 10.5, gap: 6 },
    )
    p.table(ctx, {
      name: 'venit',
      rows: 24,
      group: 'Venituri în ultimele 24 de luni',
      columns: [
        { header: 'Luna și anul', key: 'perioada', width: 78 },
        { header: 'Nr. zile lucrate', key: 'zile_lucrate', width: 58 },
        { header: 'Nr. zile concediu medical / de odihnă', key: 'zile_concediu', width: 84 },
        { header: 'Nr. zile concediu fără plată, formare și perfecționare', key: 'zile_fara_plata', width: 96 },
        { header: 'Nr. zile șomaj tehnic / indemnizație art. XI O.U.G. 30/2020', key: 'zile_somaj', width: 88 },
        { header: 'Venit net realizat (lei)', key: 'venit_net' },
      ],
    })
    p.paragraph(
      ctx,
      'Rândul 1 este luna nașterii copilului, iar rândurile următoare lunile anterioare acesteia, ' +
        'în ordine.',
      { size: 8.5, gap: 8 },
    )

    p.paragraph(
      ctx,
      'Cunoscând prevederile din Codul penal cu privire la falsul în declarații, respectiv ' +
        'declararea necorespunzătoare a adevărului făcută unui organ sau instituții de stat, declar ' +
        'pe proprie răspundere că datele și informațiile prezentate corespund realității.',
      { size: 9.5, gap: 8 },
    )
    p.labeledField(ctx, {
      label: 'Numele și prenumele reprezentantului legal',
      name: 'reprezentant_nume',
      required: true,
      group: 'Reprezentantul legal',
    })
    p.signatureFooter(ctx, { signatureLabel: 'Semnătura și ștampila' })
  },
}

export default spec
