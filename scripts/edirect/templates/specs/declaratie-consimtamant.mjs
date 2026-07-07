/**
 * Archetype #4 — Declarație de consimțământ (prelucrare date / GDPR).
 *
 * The most common consent form (~145 catalog files). The declarant gives
 * free, explicit consent for a named operator (the institution slot) to
 * process their personal data for a stated purpose, per Reg. (UE) 2016/679.
 */

import { declarantBlock } from './_shared.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'declaratie-consimtamant',
  name: 'Declarație de consimțământ',
  title: 'DECLARAȚIE DE CONSIMȚĂMÂNT',
  description:
    'Consimțământ pentru prelucrarea datelor cu caracter personal, conform ' +
    'Regulamentului (UE) 2016/679 (GDPR).',
  category: 'Declarații',

  body(ctx, p) {
    declarantBlock(ctx, p)

    // The institution here is the *data operator*, not an addressee.
    p.addressee(ctx, { lead: 'Operatorul de date:', label: 'Operatorul de date' })

    p.paragraph(
      ctx,
      'Prin prezenta, în calitate de persoană vizată, îmi exprim ' +
        'consimțământul liber, expres și neechivoc pentru prelucrarea datelor ' +
        'mele cu caracter personal de către operatorul menționat mai sus, în ' +
        'scopul declarat, în conformitate cu Regulamentul (UE) 2016/679 (GDPR).',
      { size: 11, gap: 10 },
    )

    p.multilineField(
      ctx,
      {
        label: 'Scopul prelucrării',
        name: 'scopul_prelucrarii',
        required: true,
        hint: 'Scopul pentru care sunt prelucrate datele.',
        group: 'Consimțământ',
      },
      { lines: 3 },
    )

    p.checkbox(ctx, {
      label:
        'Sunt de acord cu prelucrarea datelor mele cu caracter personal în ' +
        'scopul menționat mai sus.',
      name: 'consimtamant_prelucrare',
      required: true,
      group: 'Consimțământ',
    })

    p.checkbox(ctx, {
      label:
        'Am luat cunoștință că îmi pot retrage consimțământul în orice moment ' +
        'și că am dreptul de acces, rectificare, ștergere și opoziție conform GDPR.',
      name: 'confirm_drepturi',
      required: true,
      group: 'Consimțământ',
    })

    p.signatureFooter(ctx)
  },
}

export default spec
