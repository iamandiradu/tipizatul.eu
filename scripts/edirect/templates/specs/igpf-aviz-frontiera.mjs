/**
 * Phase 3 replica — Cerere aviz pentru desfășurarea de activități în zona de
 * frontieră / incinta P.T.F. (Poliția de Frontieră Română, O.U.G. nr. 105/2001).
 *
 * The single most duplicated form in the corpus: 98 byte-identical copies of
 * `Cerere tip_3092.doc` across IGPF/ITPF/STPF structures. Pairs with the
 * already-authored annexes `tabel-nominal-persoane` / `tabel-nominal-auto`.
 *
 * Fidelity note (§7.3 restructuring license): the source document repeats the
 * request rows (activitate, P.T.F./zonă, auto, ambarcațiune) inside BOTH the
 * persoane-fizice and persoane-juridice sections. Authored once as a shared
 * "Solicitarea" section; the two identity sections are optional with hints
 * ("se completează de către…"), matching the paper behaviour where the
 * applicant fills exactly one.
 */

const G_TIP = 'Tipul solicitării'
const G_PF = 'Persoană fizică / PFA'
const G_PJ = 'Persoană juridică'
const G_SOL = 'Solicitarea'
const G_CONTACT = 'Date de contact'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'igpf-aviz-frontiera',
  name: 'Cerere aviz activități în zona de frontieră / P.T.F. (Poliția de Frontieră)',
  title: 'CERERE',
  description:
    'Cerere pentru eliberarea sau prelungirea avizului de desfășurare a unei ' +
    'activități în incinta Punctului de Trecere a Frontierei sau în zona de ' +
    'competență a Poliției de Frontieră Române, conform O.U.G. nr. 105/2001.',
  category: 'Cereri',

  body(ctx, p) {
    p.addressee(ctx, {
      lead: 'Către,',
      label: 'Structura Poliției de Frontieră (I.G.P.F. / I.T.P.F. / S.T.P.F. / P.P.F.A.)',
      name: 'institutie',
    })

    p.paragraph(ctx, 'Solicit:', { size: 11, gap: 4 })
    p.checkbox(ctx, { label: 'eliberarea avizului', name: 'cb_eliberare', group: G_TIP })
    p.checkbox(ctx, { label: 'prelungirea avizului', name: 'cb_prelungire', group: G_TIP })

    p.paragraph(ctx, 'I. Se completează de către persoane fizice / persoane fizice autorizate:', {
      size: 11.5, gap: 4,
    })
    p.labeledField(ctx, {
      label: 'Subsemnatul/a (nume și prenume)',
      name: 'nume_si_prenume',
      hint: 'Completați secțiunea I doar dacă solicitantul este persoană fizică sau PFA.',
      group: G_PF,
    })
    p.labeledField(ctx, {
      label: 'Domiciliul (adresa completă)',
      name: 'adresa',
      group: G_PF,
    })
    p.twoColFields(
      ctx,
      { label: 'Născut/ă la data de', name: 'data_nasterii', group: G_PF },
      { label: 'CNP', name: 'cnp', group: G_PF },
    )
    p.labeledField(ctx, {
      label: 'Posesor al C.I. (serie și număr)',
      name: 'act_identitate',
      group: G_PF,
    })

    p.paragraph(ctx, 'II. Se completează de către persoane juridice:', { size: 11.5, gap: 4 })
    p.labeledField(ctx, {
      label: 'Subscrisa (denumirea persoanei juridice)',
      name: 'denumire_entitate',
      hint: 'Completați secțiunea II doar dacă solicitantul este persoană juridică.',
      group: G_PJ,
    })
    p.labeledField(ctx, {
      label: 'Cu sediul social în (adresa)',
      name: 'sediu_social',
      group: G_PJ,
    })
    p.twoColFields(
      ctx,
      { label: 'Reprezentată legal de (administrator)', name: 'reprezentant_legal', group: G_PJ },
      // RO-prefixed CUI needs 12, not the cui-pattern's 10 (same as _shared.mjs).
      { label: 'CUI', name: 'cui', maxLength: 12, group: G_PJ },
    )

    p.paragraph(
      ctx,
      'Vă rog să îmi eliberați/prelungiți avizul pentru desfășurarea activității ' +
        'menționate mai jos, în incinta Punctului de Trecere a Frontierei / în zona ' +
        'de competență a structurii Poliției de Frontieră Române indicate:',
      { size: 11, gap: 6 },
    )
    p.labeledField(ctx, {
      label: 'Activitatea desfășurată',
      name: 'activitate',
      required: true,
      group: G_SOL,
    })
    p.labeledField(ctx, {
      label: 'P.T.F.-ul / zona de competență a structurii P.F.R.',
      name: 'ptf_zona',
      required: true,
      group: G_SOL,
    })
    p.labeledField(ctx, {
      label: 'Îmi desfășor activitatea cu auto nr. (dacă este cazul)',
      name: 'auto_nr',
      group: G_SOL,
    })
    p.twoColFields(
      ctx,
      { label: 'Locul/zona activității', name: 'loc_activitate', group: G_SOL },
      { label: 'Perioada (dacă este cazul)', name: 'perioada', group: G_SOL },
    )

    p.paragraph(ctx, 'Pentru ambarcațiuni (se completează dacă este cazul):', {
      size: 11, gap: 4,
    })
    p.twoColFields(
      ctx,
      { label: 'Tipul ambarcațiunii', name: 'tip_ambarcatiune', group: G_SOL },
      { label: 'Numărul/numele ambarcațiunii', name: 'numar_nume_ambarcatiune', group: G_SOL },
    )
    p.twoColFields(
      ctx,
      { label: 'Scopul folosirii', name: 'scop_folosire', group: G_SOL },
      { label: 'Locul de păstrare', name: 'loc_pastrare', group: G_SOL },
    )

    p.paragraph(
      ctx,
      'Mă angajez ca pe timpul desfășurării activității să respect prevederile în ' +
        'vigoare privind regimul frontierei de stat (O.U.G. nr. 105/2001 privind ' +
        'frontiera de stat a României).',
      { size: 10.5, gap: 8 },
    )

    p.paragraph(ctx, 'Date de contact solicitant aviz:', { size: 11, gap: 4 })
    p.twoColFields(
      ctx,
      { label: 'Persoană de contact', name: 'persoana_contact', group: G_CONTACT },
      { label: 'Telefon/fax', name: 'telefon', group: G_CONTACT },
    )
    p.labeledField(ctx, {
      label: 'E-mail (opțional)',
      name: 'email',
      group: G_CONTACT,
    })

    p.signatureFooter(ctx)
  },
}

export default spec
