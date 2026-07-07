/**
 * Archetype #14 — Cerere certificat de atestare fiscală, persoane fizice.
 *
 * Faithful replica of the national „Model 2016 ITL 010" (Anexa nr. 10) —
 * standardized across every primărie, so the text is legally fixed. Filed by
 * a natural person with the local tax authority; the primărie is the
 * institution slot. (Legal-person variant is a separate ITL model — not this.)
 *
 * Source text extracted from the catalog (Primăria Orașului Săveni copy,
 * byte-identical to the Huși copy) — see COVERAGE-SAMPLE.md.
 */

const G_ID = 'Date de identificare'
const G_SCOP = 'Destinația certificatului'
const G_COPRO = 'Bunuri în coproprietate'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'cerere-atestare-fiscala',
  name: 'Cerere certificat de atestare fiscală (persoane fizice — ITL 010)',
  title:
    'CERERE PENTRU ELIBERAREA UNUI CERTIFICAT DE ATESTARE FISCALĂ PENTRU ' +
    'PERSOANE FIZICE PRIVIND IMPOZITE, TAXE LOCALE ȘI ALTE VENITURI DATORATE ' +
    'BUGETULUI LOCAL',
  description:
    'Model 2016 ITL 010 — cerere adresată primăriei pentru eliberarea ' +
    'certificatului de atestare fiscală (persoane fizice).',
  category: 'Cereri',

  body(ctx, p) {
    p.addressee(ctx, {
      lead: 'Către,',
      label: 'Primăria (comuna/orașul/municipiul)',
      name: 'primaria',
    })
    p.paragraph(ctx, 'Domnule/Doamnă Primar,', { size: 11, gap: 10 })

    p.labeledField(ctx, {
      label: 'Subsemnatul/a (nume și prenume)',
      name: 'nume_si_prenume',
      required: true,
      group: G_ID,
    })

    p.labeledField(ctx, {
      label: 'Domiciliat(ă) în (localitatea)',
      name: 'localitate',
      required: true,
      group: G_ID,
    })

    p.twoColFields(
      ctx,
      { label: 'Strada', name: 'strada', required: true, group: G_ID },
      { label: 'Nr., bl., sc., et., ap.', name: 'nr_bl_sc_et_ap', group: G_ID },
    )

    p.labeledField(ctx, {
      label: 'În calitate de (proprietar/coproprietar/mandatar/executor/moștenitor)',
      name: 'calitate',
      required: true,
      hint: 'Moștenitorii fac dovada decesului titularului cu copia actului de deces.',
      group: G_ID,
    })

    p.labeledField(ctx, {
      label: 'În baza actului',
      name: 'act_baza',
      hint: 'Actul care dovedește calitatea (dacă e cazul).',
      group: G_ID,
    })

    p.twoColFields(
      ctx,
      { label: 'B.I./C.I./Pașaport seria și nr.', name: 'act_identitate', required: true, group: G_ID },
      { label: 'CNP', name: 'cnp', required: true, group: G_ID },
    )

    p.twoColFields(
      ctx,
      { label: 'E-mail', name: 'email', group: G_ID },
      { label: 'Rol nominal unic nr. (dacă se cunoaște)', name: 'rol_nominal', group: G_ID },
    )

    p.paragraph(
      ctx,
      'Solicit eliberarea unui certificat privind situația obligațiilor de ' +
        'plată la bugetul local, fiindu-mi necesar pentru:',
      { size: 11, gap: 8 },
    )

    // a) Înstrăinare bunuri
    p.checkbox(ctx, { label: 'a) Înstrăinare bunuri', name: 'cb_instrainare', group: G_SCOP })
    p.checkbox(ctx, {
      label: 'pentru bunurile imobile situate la adresele de mai jos',
      name: 'cb_instrainare_imobile', group: G_SCOP, indent: 22,
    })
    p.multilineField(
      ctx,
      { label: 'Adresele bunurilor imobile (înstrăinare)', name: 'adrese_imobile_instrainare', group: G_SCOP },
      { lines: 2 },
    )
    p.checkbox(ctx, {
      label: 'pentru mijloacele de transport înregistrate la adresa de mai jos',
      name: 'cb_instrainare_transport', group: G_SCOP, indent: 22,
    })
    p.multilineField(
      ctx,
      { label: 'Adresa mijloacelor de transport (înstrăinare)', name: 'adresa_transport_instrainare', group: G_SCOP },
      { lines: 2 },
    )

    // b) Alte destinații în legătură cu bunurile
    p.checkbox(ctx, {
      label: 'b) Alte destinații în legătură cu bunurile (precizați)',
      name: 'cb_alte_bunuri', group: G_SCOP,
    })
    p.labeledField(ctx, { label: 'Destinația', name: 'destinatie_bunuri', group: G_SCOP })
    p.checkbox(ctx, {
      label: 'pentru bunurile imobile situate la adresele de mai jos',
      name: 'cb_alte_imobile', group: G_SCOP, indent: 22,
    })
    p.multilineField(
      ctx,
      { label: 'Adresele bunurilor imobile (alte destinații)', name: 'adrese_imobile_alte', group: G_SCOP },
      { lines: 2 },
    )
    p.checkbox(ctx, {
      label: 'pentru mijloacele de transport înregistrate la adresa de mai jos',
      name: 'cb_alte_transport', group: G_SCOP, indent: 22,
    })
    p.multilineField(
      ctx,
      { label: 'Adresa mijloacelor de transport (alte destinații)', name: 'adresa_transport_alte', group: G_SCOP },
      { lines: 2 },
    )

    // c) Alte destinații
    p.multilineField(
      ctx,
      { label: 'c) Alte destinații', name: 'alte_destinatii', group: G_SCOP },
      { lines: 2 },
    )

    p.paragraph(
      ctx,
      'Notă: În cazul unor bunuri aflate în coproprietate, coproprietarul poate ' +
        'solicita distinct situația fiscală doar pentru cota de proprietate sau ' +
        'pentru întreg bunul cu evidențierea tuturor coproprietarilor, respectiv ' +
        'a tuturor obligațiilor de plată aferente bunului respectiv.',
      { size: 9.5, gap: 6 },
    )

    p.checkbox(ctx, {
      label:
        'Solicit ca în certificat să fie trecute doar informațiile de natură ' +
        'fiscală care privesc cota-parte aflată în proprietatea mea.',
      name: 'cb_doar_cota', group: G_COPRO,
    })
    p.checkbox(ctx, {
      label:
        'Solicit ca în certificat să fie trecute toate informațiile de natură ' +
        'fiscală care privesc bunurile aflate în coproprietate.',
      name: 'cb_toate_informatiile', group: G_COPRO,
    })

    p.signatureFooter(ctx)

    p.paragraph(
      ctx,
      'Certificatul de atestare fiscală se eliberează solicitantului la sediul ' +
        'organului fiscal.',
      { size: 8.5, gap: 0 },
    )
  },
}

export default spec
