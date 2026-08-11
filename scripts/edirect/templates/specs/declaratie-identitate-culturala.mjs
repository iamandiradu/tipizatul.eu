/**
 * Phase 3 replica — "Anexa 3: Declarație privind apartenența la identitatea
 * culturală română" (Legea nr. 299/2007 privind sprijinul acordat românilor de
 * pretutindeni, republicată).
 *
 * 35 byte-identical copies across 34 institutions (inspectorate școlare and
 * universities), so this is a national model, not an institution form. The
 * source is a single page and its text is reproduced faithfully — this is a
 * REPLICA, not a generic archetype: the legal wording is the document.
 *
 * Two distinct signing parties, which is why this is not just a
 * `declaratie-proprie-raspundere` instance:
 *   1. The declarant, asserting Romanian cultural identity.
 *   2. A certifying authority (Ministerul pentru Românii de Pretutindeni /
 *      an embassy / a consulate) countersigning that the declaration was given
 *      on own responsibility and that art. 6(1)(a) conditions are met.
 *
 * The certification block is completed by the authority, never by the citizen,
 * so every field in it is optional — a correctly filled form arrives at the
 * counter with that half blank. Marking them required would make the form
 * un-submittable for its actual user.
 */

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'declaratie-identitate-culturala',
  name: 'Declarație privind apartenența la identitatea culturală română',
  title: 'DECLARAȚIE',
  description:
    'Declarație pe propria răspundere privind apartenența la identitatea ' +
    'culturală română, dată în temeiul Legii nr. 299/2007 privind sprijinul ' +
    'acordat românilor de pretutindeni (Anexa 3).',
  category: 'Declarații',

  body(ctx, p) {
    // "Anexa 3" is the legal anchor — it identifies which annex of Legea
    // 299/2007 this form is. The source prints it above the title; drawHeader
    // owns that space, so it sits just below here. Content preserved, position
    // differs by one line.
    p.paragraph(ctx, 'Anexa 3', { size: 10, gap: 6 })

    p.paragraph(ctx, 'privind apartenența la identitatea culturală română', {
      size: 11,
      gap: 14,
    })

    p.labeledField(ctx, {
      label: 'Subsemnatul/Subsemnata',
      name: 'nume_prenume',
      required: true,
      hint: 'Numele și prenumele, așa cum apar în actul de identitate.',
      group: 'Declarant',
      maxLength: 120,
    })

    p.labeledField(ctx, {
      label: 'Cetățean(ă) al (a)',
      name: 'cetatenie',
      required: true,
      hint: 'Statul al cărui cetățean sunteți.',
      group: 'Declarant',
      maxLength: 80,
    })

    p.paragraph(
      ctx,
      'legitimat(ă) cu actul de identitate / cartea de identitate / pașaportul:',
      { size: 11, gap: 8 },
    )

    p.twoColFields(
      ctx,
      { label: 'Seria', name: 'act_serie', required: true, group: 'Act de identitate', maxLength: 10 },
      { label: 'Nr.', name: 'act_numar', required: true, group: 'Act de identitate', maxLength: 20 },
    )

    p.labeledField(ctx, {
      label: 'Eliberat(ă) de',
      name: 'act_eliberat_de',
      required: true,
      hint: 'Autoritatea emitentă a actului de identitate.',
      group: 'Act de identitate',
      maxLength: 120,
    })

    p.labeledField(ctx, {
      label: 'Domiciliat(ă) în',
      name: 'domiciliu',
      required: true,
      hint: 'Adresa completă de domiciliu.',
      group: 'Declarant',
      maxLength: 200,
    })

    p.paragraph(
      ctx,
      'declar prin voința mea liber exprimată și pe propria răspundere că îmi ' +
        'asum identitatea culturală română.',
      { size: 11, gap: 10 },
    )

    p.paragraph(
      ctx,
      'În această calitate înțeleg să beneficiez de drepturile stabilite de ' +
        'Legea nr. 299/2007 privind sprijinul acordat românilor de pretutindeni, ' +
        'republicată cu modificările și completările ulterioare, și să mi le ' +
        'exercit cu bună-credință, pentru afirmarea identității mele culturale ' +
        'române.',
      { size: 11, gap: 10 },
    )

    p.paragraph(
      ctx,
      'Declar că datele de mai sus sunt corecte și că am luat cunoștință de ' +
        'prevederile Codului penal al României privind falsul în declarații și ' +
        'sancțiunile aplicabile.',
      { size: 11, gap: 10 },
    )

    p.checkbox(ctx, {
      label:
        'Confirm că îmi asum identitatea culturală română și că datele de mai ' +
        'sus sunt corecte.',
      name: 'confirm_declaratie',
      required: true,
      group: 'Declarație',
    })

    p.signatureFooter(ctx)

    // ── Certification block — completed by the authority, not the citizen ──
    p.paragraph(
      ctx,
      'Se completează de către autoritatea certificatoare:',
      { size: 10, gap: 8 },
    )

    // The source prints all three certifying authorities on the page, so a
    // printed copy shows the reader which one applies. Keeping this only as a
    // field hint would drop it from the paper form entirely.
    p.paragraph(
      ctx,
      'Ministerul pentru Românii de Pretutindeni / Ambasada României la … / ' +
        'Consulatul General al României la …',
      { size: 10, gap: 6 },
    )

    p.labeledField(ctx, {
      label: 'Autoritatea certificatoare',
      name: 'autoritate_certificatoare',
      required: false,
      hint: 'Ministerul, ambasada sau consulatul care certifică declarația.',
      group: 'Certificare (uz oficial)',
      maxLength: 160,
    })

    p.paragraph(
      ctx,
      'certifică faptul că prezenta declarație a fost dată pe propria ' +
        'răspundere de către:',
      { size: 10, gap: 8 },
    )

    p.labeledField(ctx, {
      label: 'Dl/Dna',
      name: 'certificat_pentru',
      required: false,
      hint: 'Numele declarantului, completat de autoritate.',
      group: 'Certificare (uz oficial)',
      maxLength: 120,
    })

    p.paragraph(
      ctx,
      'și că sunt îndeplinite condițiile prevăzute de art. 6 alin. (1) lit. a) ' +
        'din Legea nr. 299/2007 privind sprijinul acordat românilor de ' +
        'pretutindeni, republicată, cu modificările și completările ulterioare.',
      { size: 10, gap: 10 },
    )

    p.twoColFields(
      ctx,
      {
        label: 'Data certificării',
        name: 'certificare_data',
        required: false,
        group: 'Certificare (uz oficial)',
        validation: 'date',
      },
      {
        label: 'Semnătura',
        name: 'certificare_semnatura',
        required: false,
        group: 'Certificare (uz oficial)',
      },
    )
  },
}

export default spec
