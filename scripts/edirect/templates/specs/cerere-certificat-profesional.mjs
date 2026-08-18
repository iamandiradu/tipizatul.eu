/**
 * Phase 3 replica — „Anexa nr. 2: Cerere pentru eliberarea certificatului
 * profesional curent (CPC)", Colegiul Medicilor Stomatologi din România,
 * Decizia CN nr. 16/2CN/2019. 21 files across the county colleges.
 *
 * The registru-unic number and the phone are printed as character grids
 * (|___|___|…) — 8 and 12 cells — so they use combField. The purposes are
 * mutually exclusive boxes on paper and stay separate checkboxes here.
 *
 * "Destinatarul CPC" is the institution that ASKED for the certificate, not
 * the college issuing it; the source footnotes this against H.G. nr.
 * 1.464/2006 and the note is reproduced so the distinction survives.
 */

const G_SOLICITANT = 'Solicitant'
const G_SCOP = 'Scopul solicitării'
const G_DEST = 'Destinatarul certificatului'
const G_STUDII = 'Studii și calificări'
const G_CONTACT = 'Loc de muncă și domiciliu'
const G_ANEXE = 'Documente anexate'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'cerere-certificat-profesional',
  name: 'Cerere pentru eliberarea certificatului profesional curent (CPC)',
  title: 'CERERE',
  description:
    'Cerere adresată Colegiului Medicilor Stomatologi pentru eliberarea ' +
    'certificatului profesional curent (Anexa nr. 2, Decizia CN nr. ' +
    '16/2CN/2019).',
  category: 'Cereri',

  body(ctx, p) {
    p.paragraph(ctx, 'pentru eliberarea certificatului profesional curent', {
      size: 11, gap: 6,
    })
    p.paragraph(ctx, 'Anexa nr. 2', { size: 9, gap: 4 })
    // The legal anchor: which decision this annex belongs to. Printed on the
    // source, so a standalone copy can be traced back to its authority.
    p.paragraph(
      ctx,
      'Decizia CN nr. 16/2CN/2019 — Întocmirea și eliberarea certificatului ' +
        'profesional curent, publicată în Monitorul Oficial la data de 6.08.2019.',
      { size: 9, gap: 8 },
    )

    p.labeledField(ctx, {
      label: 'Nr. înregistrare',
      name: 'nr_inregistrare',
      hint: 'Se completează de colegiu la depunere.',
      group: 'Uz oficial',
      maxLength: 30,
    })

    p.paragraph(ctx, 'Subsemnatul/Subsemnata:', { size: 11, gap: 6 })
    p.labeledField(ctx, { label: 'Nume', name: 'nume', required: true, group: G_SOLICITANT, maxLength: 80 })
    p.labeledField(ctx, { label: 'Prenume', name: 'prenume', required: true, group: G_SOLICITANT, maxLength: 80 })
    p.labeledField(ctx, {
      label: 'Înscris(ă) în Colegiul Medicilor Stomatologi',
      name: 'colegiu',
      required: true,
      hint: 'Colegiul județean în care sunteți înscris(ă).',
      group: G_SOLICITANT,
      maxLength: 80,
    })

    p.combField(ctx, { label: 'Nr. Registru unic', name: 'registru_unic', required: true, group: G_SOLICITANT }, { cells: 8 })
    p.combField(ctx, { label: 'Telefon', name: 'telefon', required: true, group: G_SOLICITANT }, { cells: 12 })

    p.paragraph(ctx, 'Solicit eliberarea unui certificat profesional curent (CPC) în scopul:', {
      size: 11, gap: 6,
    })
    for (const [key, label] of [
      ['cabinet', 'înființării cabinetului de medicină dentară'],
      ['promovare', 'întocmirii dosarului de înscriere la un examen de promovare profesională'],
      ['concurs', 'întocmirii dosarului de înscriere la un concurs de ocupare a unui post vacant'],
      ['strainatate', 'exercitării profesiei în altă țară'],
      ['alt_scop', 'alt scop'],
    ]) {
      p.checkbox(ctx, { label, name: `scop_${key}`, group: G_SCOP })
    }
    p.labeledField(ctx, {
      label: 'Alt scop — care',
      name: 'alt_scop_detaliu',
      group: G_SCOP,
      maxLength: 160,
    })

    p.labeledField(ctx, {
      label: 'Destinatarul CPC',
      name: 'destinatar',
      required: true,
      hint: 'Instituția care solicită prezentarea CPC.',
      group: G_DEST,
      maxLength: 120,
    })
    p.labeledField(ctx, { label: 'Sediu', name: 'destinatar_sediu', group: G_DEST, maxLength: 160 })
    p.paragraph(
      ctx,
      '* Instituția care solicită prezentarea CPC se menționează în certificatul ' +
        'profesional curent, conform H.G. nr. 1.464/2006.',
      { size: 9, gap: 8 },
    )

    p.labeledField(ctx, {
      label: 'I. Cetățenia',
      name: 'cetatenie',
      required: true,
      hint: 'Inclusiv dubla cetățenie și, după caz, modificările care privesc acest aspect.',
      // NOTE: the parenthetical is also printed below, because a hint exists
      // only in the web form — it never reaches the printed page.
      group: G_SOLICITANT,
      maxLength: 100,
    })

    p.paragraph(
      ctx,
      '(inclusiv dubla cetățenie și, după caz, detalii cu privire la modificările ' +
        'care privesc acest aspect)',
      { size: 9, gap: 8 },
    )

    p.paragraph(ctx, 'II. Act de identitate:', { size: 11, gap: 4 })
    p.checkbox(ctx, { label: 'CI', name: 'act_ci', group: G_SOLICITANT })
    p.twoColFields(
      ctx,
      { label: 'Seria', name: 'act_serie', required: true, group: G_SOLICITANT, maxLength: 10 },
      { label: 'Nr.', name: 'act_numar', required: true, group: G_SOLICITANT, maxLength: 20 },
    )

    p.combField(ctx, { label: 'III. Cod numeric personal', name: 'cnp', required: true, group: G_SOLICITANT }, { cells: 13 })

    p.labeledField(ctx, { label: 'IV. Locul nașterii', name: 'loc_nastere', required: true, group: G_SOLICITANT, maxLength: 100 })
    p.combField(ctx, { label: 'Data nașterii (zzllaaaa)', name: 'data_nastere', required: true, group: G_SOLICITANT }, { cells: 8 })

    p.paragraph(ctx, 'V. Diplomă de licență:', { size: 11, gap: 4 })
    p.twoColFields(
      ctx,
      { label: 'Seria', name: 'diploma_serie', required: true, group: G_STUDII, maxLength: 10 },
      { label: 'Nr.', name: 'diploma_numar', required: true, group: G_STUDII, maxLength: 20 },
    )
    p.combField(ctx, { label: 'Data obținerii calificării (zzllaaaa)', name: 'diploma_data', required: true, group: G_STUDII }, { cells: 8 })
    p.labeledField(ctx, { label: 'Emisă de', name: 'diploma_emisa_de', required: true, group: G_STUDII, maxLength: 120 })
    p.labeledField(ctx, { label: 'Localitatea', name: 'diploma_localitate', group: G_STUDII, maxLength: 80 })

    p.multilineField(
      ctx,
      { label: 'VI. Titluri oficiale de calificare profesională', name: 'titluri_calificare', group: G_STUDII },
      { lines: 2 },
    )
    p.multilineField(
      ctx,
      { label: 'VII. Atestate de studii complementare', name: 'atestate_complementare', group: G_STUDII },
      { lines: 2 },
    )

    p.labeledField(ctx, { label: 'VIII. Loc de muncă', name: 'loc_munca', group: G_CONTACT, maxLength: 120 })
    p.labeledField(ctx, { label: 'Adresa', name: 'loc_munca_adresa', group: G_CONTACT, maxLength: 160 })
    p.multilineField(
      ctx,
      { label: 'IX. Domiciliu/Reședință', name: 'domiciliu', required: true, group: G_CONTACT },
      { lines: 2 },
    )

    // The CPC prints the applicant's workplace; with no workplace it falls back
    // to the home address, and the source asks permission for that explicitly.
    // Da/Nu are separate boxes on paper, so they stay separate here.
    p.paragraph(
      ctx,
      'Sunt de acord cu menționarea în CPC a adresei de domiciliu, în absența locului de muncă.',
      { size: 11, gap: 4 },
    )
    p.checkbox(ctx, { label: 'Da', name: 'acord_domiciliu_da', group: G_CONTACT })
    p.checkbox(ctx, { label: 'Nu', name: 'acord_domiciliu_nu', group: G_CONTACT })

    p.paragraph(ctx, 'Anexez la prezenta cerere:', { size: 11, gap: 4 })
    p.checkbox(ctx, {
      label: 'copie a actului de identitate, certificată pentru conformitate cu originalul',
      name: 'anexa_act_identitate',
      group: G_ANEXE,
    })
    p.checkbox(ctx, {
      label: 'dovada achitării taxei de eliberare a certificatului profesional curent',
      name: 'anexa_dovada_taxa',
      group: G_ANEXE,
    })
    p.checkbox(ctx, {
      label: 'alte documente, dacă este cazul (pct. VI-VII din cerere)',
      name: 'anexa_alte',
      group: G_ANEXE,
    })
    p.labeledField(ctx, { label: 'Alte documente — care', name: 'anexa_alte_detaliu', group: G_ANEXE, maxLength: 160 })

    p.combField(ctx, { label: 'Data (zzllaaaa)', name: 'data', required: true, group: G_SOLICITANT }, { cells: 8 })
    p.labeledField(ctx, { label: 'Semnătura', name: 'semnatura', group: G_SOLICITANT })
  },
}

export default spec
