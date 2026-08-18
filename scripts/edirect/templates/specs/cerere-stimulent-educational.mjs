/**
 * Phase 3 replica — "CERERE - DECLARAŢIE PE PROPRIA RĂSPUNDERE pentru
 * acordarea stimulentului educaţional (tichet social pentru grădiniţă)",
 * Legea nr. 248/2015. 36 byte-identical copies across the corpus — the highest
 * fan-out timeless form in the catalog.
 *
 * Complete: sections A, B, C, D, E and F.
 *
 * Section E is the legally enumerated income table — 80 numbered categories
 * under 18 headings (activităţi independente, salarii, pensii de stat /
 * agricultori / militare, indemnizaţii, activităţi agricole, jocuri de noroc,
 * transferul proprietăţilor imobiliare, …). Its wording is EXTRACTED from the
 * source rather than retyped, and lives in `_income-rows.mjs`; hand-copying 80
 * legal definitions is exactly where content drift comes from. The extraction
 * was validated for gaps and duplicates before use.
 *
 * Layout notes:
 *   · Every identity field is a comb grid in the original, one character per
 *     box, because clerks read them positionally. Cell counts are taken from
 *     the source, not rounded.
 *   · The mutually exclusive options (starea civilă, situaţia profesională,
 *     relaţia de rudenie) are separate boxes on the paper form, so they are
 *     separate checkboxes here rather than a synthesised dropdown.
 *   · Header note from the source: beneficiaries of ajutor social and/or
 *     alocaţie pentru familiile cu copii fill in only A, B, C and F.
 */

import { INCOME_ROWS } from './_income-rows.mjs'

const CNP_CELLS = 13

/** One child block: same shape in C (eligible children) and D (other children). */
function childIdentity(ctx, p, { n, group, withDetails }) {
  p.paragraph(ctx, `${n}.`, { size: 10, gap: 4 })

  p.combField(ctx, { label: 'Numele', name: `${group.prefix}${n}_nume`, required: n === 1, group: group.label }, { cells: 26 })
  p.combField(ctx, { label: 'Prenumele', name: `${group.prefix}${n}_prenume`, required: n === 1, group: group.label }, { cells: 26 })
  p.combField(ctx, { label: 'Cod numeric personal', name: `${group.prefix}${n}_cnp`, required: n === 1, group: group.label }, { cells: CNP_CELLS })

  if (!withDetails) return

  p.paragraph(ctx, 'Act de identitate/doveditor*) (copie ataşată):', { size: 10, gap: 4 })
  p.combField(ctx, { label: 'Tip act', name: `${group.prefix}${n}_act_tip`, group: group.label }, { cells: 4 })
  p.combField(ctx, { label: 'Seria', name: `${group.prefix}${n}_act_serie`, group: group.label }, { cells: 3 })
  p.combField(ctx, { label: 'Nr.', name: `${group.prefix}${n}_act_numar`, group: group.label }, { cells: 7 })

  p.paragraph(ctx, 'Relaţia de rudenie cu persoana îndreptăţită:', { size: 10, gap: 4 })
  for (const [key, label] of [
    ['copil_natural', 'copil natural'],
    ['copil_adoptat', 'copil adoptat'],
    ['plasament_familial', 'copil în plasament familial'],
    ['tutela', 'copil în tutelă'],
    ['curatela', 'copil în curatelă'],
    ['incredintat_adoptie', 'copil încredinţat spre adopţie'],
    ['parinti_plecati', 'copil în întreţinere, cu părinţi plecaţi la muncă în străinătate'],
  ]) {
    p.checkbox(ctx, { label, name: `${group.prefix}${n}_rudenie_${key}`, group: group.label })
  }

  p.labeledField(ctx, {
    label: 'Copilul este înscris la grădiniţa',
    name: `${group.prefix}${n}_gradinita`,
    required: n === 1,
    group: group.label,
    maxLength: 120,
  })
  p.labeledField(ctx, {
    label: 'Pentru anul şcolar',
    name: `${group.prefix}${n}_an_scolar`,
    required: n === 1,
    group: group.label,
    placeholder: 'ex. 2026-2027',
    maxLength: 20,
  })
}

/** A and B share the adult-identity shape; B is the partner and never required. */
function adultIdentity(ctx, p, { prefix, group, required }) {
  p.combField(ctx, { label: 'Numele', name: `${prefix}_nume`, required, group }, { cells: 32 })
  p.combField(ctx, { label: 'Prenumele', name: `${prefix}_prenume`, required, group }, { cells: 32 })
  p.combField(ctx, { label: 'Cod numeric personal', name: `${prefix}_cnp`, required, group }, { cells: CNP_CELLS })

  p.paragraph(ctx, 'Cetăţenia:', { size: 10, gap: 4 })
  p.checkbox(ctx, { label: 'Română', name: `${prefix}_cet_romana`, group })
  p.checkbox(ctx, { label: 'Alte ţări', name: `${prefix}_cet_alta`, group })
  p.labeledField(ctx, { label: 'Alte ţări — care', name: `${prefix}_cet_alta_care`, group, maxLength: 60 })

  p.paragraph(ctx, 'Starea civilă:', { size: 10, gap: 4 })
  for (const [key, label] of [
    ['casatorit', 'căsătorit(ă)'],
    ['necasatorit', 'necăsătorit(ă)'],
    ['uniune', 'uniune consensuală'],
    ['vaduv', 'văduv(ă)'],
    ['divortat', 'divorţat(ă)'],
    ['despartit', 'despărţit(ă) în fapt'],
  ]) {
    p.checkbox(ctx, { label, name: `${prefix}_stare_${key}`, group })
  }

  p.paragraph(ctx, 'Act de identitate/doveditor*) (copie ataşată):', { size: 10, gap: 4 })
  p.combField(ctx, { label: 'Tip act', name: `${prefix}_act_tip`, group }, { cells: 4 })
  p.combField(ctx, { label: 'Seria', name: `${prefix}_act_serie`, group }, { cells: 3 })
  p.combField(ctx, { label: 'Nr.', name: `${prefix}_act_numar`, group }, { cells: 7 })
  p.combField(ctx, { label: 'Eliberat de', name: `${prefix}_act_eliberat`, group }, { cells: 12 })
  p.combField(ctx, { label: 'La data de (zzllaaaa)', name: `${prefix}_act_data`, group }, { cells: 8 })

  p.paragraph(ctx, 'Date de contact:', { size: 10, gap: 4 })
  p.combField(ctx, { label: 'Strada', name: `${prefix}_strada`, required, group }, { cells: 24 })
  p.combField(ctx, { label: 'Nr.', name: `${prefix}_nr`, group }, { cells: 5 })
  p.combField(ctx, { label: 'Bl.', name: `${prefix}_bloc`, group }, { cells: 3 })
  p.combField(ctx, { label: 'Sc.', name: `${prefix}_scara`, group }, { cells: 2 })
  p.combField(ctx, { label: 'Et.', name: `${prefix}_etaj`, group }, { cells: 2 })
  p.combField(ctx, { label: 'Apart.', name: `${prefix}_apartament`, group }, { cells: 3 })
  p.combField(ctx, { label: 'Sector', name: `${prefix}_sector`, group }, { cells: 2 })
  p.combField(ctx, { label: 'Localitatea', name: `${prefix}_localitate`, required, group }, { cells: 30 })
  p.combField(ctx, { label: 'Judeţ', name: `${prefix}_judet`, required, group }, { cells: 13 })
  p.combField(ctx, { label: 'Tel./Mobil', name: `${prefix}_telefon`, group }, { cells: 13 })

  p.paragraph(ctx, 'Situaţia şcolară:', { size: 10, gap: 4 })
  for (const [key, label] of [
    ['fara', 'fără studii'], ['generale', 'generale'], ['medii', 'medii'], ['superioare', 'superioare'],
  ]) {
    p.checkbox(ctx, { label, name: `${prefix}_studii_${key}`, group })
  }

  p.paragraph(ctx, 'Situaţia profesională:', { size: 10, gap: 4 })
  for (const [key, label] of [
    ['salariat', 'salariat'], ['pensionar', 'pensionar'], ['somer', 'şomer'], ['student', 'student'],
    ['independent', 'independent'], ['agricol', 'lucrător agricol'],
    ['ocazional', 'lucrător ocazional'], ['elev', 'elev'],
  ]) {
    p.checkbox(ctx, { label, name: `${prefix}_profesie_${key}`, group })
  }
  p.labeledField(ctx, { label: 'Altele', name: `${prefix}_profesie_altele`, group, maxLength: 60 })
}

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'cerere-stimulent-educational',
  name: 'Cerere-declarație pentru stimulentul educațional (tichet social grădiniță)',
  title: 'CERERE - DECLARAŢIE PE PROPRIA RĂSPUNDERE',
  description:
    'Cerere-declarație pe propria răspundere pentru acordarea stimulentului ' +
    'educațional (tichet social pentru grădiniță), în temeiul Legii nr. ' +
    '248/2015. Secțiunea E (venituri) nu este încă inclusă.',
  category: 'Cereri',

  body(ctx, p) {
    p.paragraph(ctx, 'pentru acordarea stimulentului educaţional (tichet social pentru grădiniţă)', {
      size: 11, gap: 10,
    })

    p.labeledField(ctx, {
      label: 'UNITATEA ADMINISTRATIV-TERITORIALĂ',
      name: 'uat',
      required: true,
      hint: 'Primăria căreia adresaţi cererea.',
      group: 'A. Solicitant',
      maxLength: 120,
    })

    p.paragraph(
      ctx,
      'Beneficiarii de ajutor social şi/sau alocaţie pentru familiile cu copii ' +
        'vor completa doar punctele A, B, C şi F.',
      { size: 10, gap: 10 },
    )
    p.paragraph(ctx, 'Doamnă/Domnule Primar,', { size: 11, gap: 10 })

    // ── A ──
    p.paragraph(ctx, 'A. Subsemnatul', { size: 12, gap: 8 })
    adultIdentity(ctx, p, { prefix: 'a', group: 'A. Solicitant', required: true })

    p.paragraph(ctx, 'În conformitate cu prevederile legale, sunt:', { size: 10, gap: 4 })
    p.checkbox(ctx, { label: 'Părinte', name: 'a_calitate_parinte', group: 'A. Solicitant' })
    p.checkbox(ctx, { label: 'Reprezentant legal al părintelui minor', name: 'a_calitate_repr_parinte', group: 'A. Solicitant' })
    p.checkbox(ctx, { label: 'Reprezentant legal al copilului', name: 'a_calitate_repr_copil', group: 'A. Solicitant' })

    p.paragraph(ctx, 'Şi sunt beneficiar de:', { size: 10, gap: 4 })
    p.checkbox(ctx, { label: 'ajutor social', name: 'a_benef_ajutor_social', group: 'A. Solicitant' })
    p.checkbox(ctx, { label: 'alocaţie pentru familiile cu copii', name: 'a_benef_alocatie', group: 'A. Solicitant' })

    // ── B ──
    p.paragraph(ctx, 'B. Împreună cu partenerul/partenera:', { size: 12, gap: 8 })
    adultIdentity(ctx, p, { prefix: 'b', group: 'B. Partener', required: false })

    // The `*)` footnote the act-de-identitate fields point at. Without it a
    // user cannot know what to type into the 4-cell "Tip act" grid — the codes
    // are not guessable. Printed once, after A and B, as in the source.
    p.paragraph(
      ctx,
      '*) Act de identitate/doveditor — coduri: CN - certificat de naştere; ' +
        'BI - buletin de identitate; CI - carte de identitate; ' +
        'CIP - carte de identitate provizorie; P - paşaport.',
      { size: 9, gap: 4 },
    )
    p.paragraph(
      ctx,
      'Pentru cetăţenii străini sau apatrizi: PST - permis de şedere ' +
        'temporară; PSTL - permis de şedere pe termen lung; ' +
        'DI - document de identitate.',
      { size: 9, gap: 4 },
    )
    p.paragraph(
      ctx,
      'Pentru cetăţenii UE, SEE sau Confed. Elveţiană: ' +
        'CIN - certificat înregistrare; CR - carte de rezidenţă.',
      { size: 9, gap: 10 },
    )

    // ── C ──
    p.paragraph(
      ctx,
      'C. Vă rugăm să aprobaţi acordarea stimulentului educaţional pentru copii (3 - 6 ani):',
      { size: 12, gap: 8 },
    )
    for (const n of [1, 2, 3]) {
      childIdentity(ctx, p, {
        n,
        group: { prefix: 'c', label: 'C. Copii (3-6 ani)' },
        withDetails: true,
      })
    }

    // ── D ──
    p.paragraph(ctx, 'D. Alţi copii ai familiei:', { size: 12, gap: 8 })
    for (const n of [1, 2, 3, 4]) {
      childIdentity(ctx, p, {
        n,
        group: { prefix: 'd', label: 'D. Alţi copii' },
        withDetails: false,
      })
    }

    // ── E ──
    p.paragraph(
      ctx,
      'E. Venituri permanente nete realizate de familia/persoana singură îndreptăţită în luna:',
      { size: 12, gap: 6 },
    )
    p.combField(ctx, { label: 'Luna/anul (llaaaa)', name: 'e_luna', group: 'E. Venituri' }, { cells: 6 })
    p.paragraph(
      ctx,
      'Se completează numai rândurile pentru care există venit realizat. ' +
        'Coloana „Acte doveditoare" indică documentul care trebuie ataşat.',
      { size: 9, gap: 8 },
    )

    // 80 legally enumerated categories. Emitting them from data keeps the
    // wording identical to the source; see specs/_income-rows.mjs.
    let lastHeading = null
    for (const row of INCOME_ROWS) {
      if (row.heading !== lastHeading) {
        p.paragraph(ctx, row.heading, { size: 10, gap: 6 })
        lastHeading = row.heading
      }
      // The category text is the label, so the printed form still reads as the
      // original table; `acte` becomes the hint because it tells the applicant
      // what to attach, which is guidance rather than part of the legal text.
      p.labeledField(ctx, {
        label: `${row.cod}. ${row.categoria}`,
        name: `e_venit_${row.cod}`,
        group: 'E. Venituri',
        ...(row.acte ? { hint: `Acte doveditoare: ${row.acte}` } : {}),
        placeholder: 'lei',
        maxLength: 12,
      })
    }

    p.labeledField(ctx, {
      label: 'VENIT NET LUNAR TOTAL AL FAMILIEI',
      name: 'e_venit_total',
      group: 'E. Venituri',
      placeholder: 'lei',
      maxLength: 12,
    })
    p.labeledField(ctx, {
      label: 'VENIT NET LUNAR PE MEMBRU DE FAMILIE',
      name: 'e_venit_pe_membru',
      group: 'E. Venituri',
      placeholder: 'lei',
      maxLength: 12,
    })

    // ── F ──
    p.paragraph(ctx, 'F.', { size: 12, gap: 6 })
    p.paragraph(
      ctx,
      'Solicitantul declară pe propria răspundere, conform Codului de procedură ' +
        'civilă art. 292, că datele şi informaţiile prezentate sunt complete şi ' +
        'corespund realităţii şi se obligă să aducă la cunoştinţa autorităţilor, ' +
        'în scris, orice modificare a situaţiei mai sus prezentate care poate ' +
        'conduce la încetarea sau suspendarea drepturilor.',
      { size: 11, gap: 10 },
    )
    p.checkbox(ctx, {
      label:
        'Declar pe propria răspundere că datele prezentate sunt complete şi ' +
        'corespund realităţii.',
      name: 'f_confirm',
      required: true,
      group: 'F. Declaraţie',
    })
    p.labeledField(ctx, {
      label: 'Numele solicitantului',
      name: 'f_nume_solicitant',
      required: true,
      group: 'F. Declaraţie',
      maxLength: 120,
    })
    p.signatureFooter(ctx)
  },
}

export default spec
