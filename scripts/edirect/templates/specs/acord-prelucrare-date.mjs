/**
 * Archetype #6 — Acord privind prelucrarea datelor cu caracter personal.
 *
 * The agreement sibling of #4/#5 (~41 catalog files). Functionally a consent,
 * phrased as an "acord": the declarant agrees to a named operator processing
 * their data for a stated purpose, optionally for a stated duration.
 */

import { declarantBlock } from './_shared.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'acord-prelucrare-date',
  name: 'Acord privind prelucrarea datelor cu caracter personal',
  title: 'ACORD PRIVIND PRELUCRAREA DATELOR CU CARACTER PERSONAL',
  description:
    'Acord pentru prelucrarea datelor cu caracter personal de către un operator ' +
    'desemnat, conform Regulamentului (UE) 2016/679 (GDPR).',
  category: 'Declarații',

  body(ctx, p) {
    declarantBlock(ctx, p)

    p.addressee(ctx, { lead: 'Operatorul de date:', label: 'Operatorul de date' })

    p.paragraph(
      ctx,
      'Prin prezenta îmi dau acordul ca operatorul menționat mai sus să ' +
        'prelucreze datele mele cu caracter personal în scopul și pe durata ' +
        'indicate mai jos, în conformitate cu Regulamentul (UE) 2016/679 (GDPR).',
      { size: 11, gap: 10 },
    )

    p.multilineField(
      ctx,
      {
        label: 'Scopul prelucrării',
        name: 'scopul_prelucrarii',
        required: true,
        group: 'Acord',
      },
      { lines: 3 },
    )

    p.labeledField(ctx, {
      label: 'Durata prelucrării',
      name: 'durata',
      hint: 'Perioada pentru care se acordă consimțământul.',
      group: 'Acord',
    })

    p.checkbox(ctx, {
      label:
        'Îmi exprim acordul cu privire la prelucrarea datelor mele cu caracter ' +
        'personal în condițiile de mai sus și am luat cunoștință de drepturile ' +
        'mele conform GDPR.',
      name: 'acord_prelucrare',
      required: true,
      group: 'Acord',
    })

    p.signatureFooter(ctx)
  },
}

export default spec
