/**
 * Archetype #7 — Declarație pe propria răspundere.
 *
 * The universal standalone declaration: a declarant states facts under their
 * own responsibility, citing art. 326 Cod penal (fals în declarații). Rarely
 * appears as its own filename but is embedded in dozens of bundled cereri.
 *
 * Unlike the GDPR declarations, the institution is OPTIONAL here — a
 * declaration on own responsibility stands alone — so the destination slot is
 * not required.
 */

import { declarantBlock } from './_shared.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'declaratie-proprie-raspundere',
  name: 'Declarație pe propria răspundere',
  title: 'DECLARAȚIE PE PROPRIA RĂSPUNDERE',
  description:
    'Declarație pe propria răspundere prin care declarantul atestă fapte sub ' +
    'sancțiunea art. 326 din Codul penal privind falsul în declarații.',
  category: 'Declarații',

  body(ctx, p) {
    declarantBlock(ctx, p)

    // Optional destination — many declarations are filed with an institution,
    // but the declaration is valid on its own, so the slot is not required.
    p.addressee(ctx, {
      lead: 'În atenția (opțional):',
      label: 'Instituția',
      required: false,
    })

    p.paragraph(
      ctx,
      'Declar pe propria răspundere, cunoscând prevederile art. 326 din Codul ' +
        'penal privind falsul în declarații, următoarele:',
      { size: 11, gap: 10 },
    )

    p.multilineField(
      ctx,
      {
        label: 'Conținutul declarației',
        name: 'continut_declaratie',
        required: true,
        hint: 'Faptele declarate pe propria răspundere.',
        group: 'Declarație',
      },
      { lines: 8 },
    )

    p.checkbox(ctx, {
      label:
        'Declar că am luat cunoștință că declararea necorespunzătoare a ' +
        'adevărului se pedepsește conform legii penale și îmi asum răspunderea ' +
        'pentru datele înscrise în prezenta declarație.',
      name: 'confirm_declaratie',
      required: true,
      group: 'Declarație',
    })

    p.signatureFooter(ctx)
  },
}

export default spec
