/**
 * Archetype #8 — Cerere și declarație pe propria răspundere.
 *
 * The cerere skeleton followed by a "declar pe propria răspundere" section: a
 * declaration paragraph, a free-text area for the declared facts, and a
 * required acknowledgement checkbox citing art. 326 Cod penal (fals în
 * declarații). Spills onto a second page via the author's page-break support.
 */

import { identityBlock } from './_shared.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'cerere-si-declaratie',
  name: 'Cerere și declarație pe propria răspundere',
  title: 'CERERE ȘI DECLARAȚIE PE PROPRIA RĂSPUNDERE',
  description:
    'Cerere însoțită de o declarație pe propria răspundere. Completați datele ' +
    'de identificare, obiectul cererii și declarația.',
  category: 'Cereri',

  body(ctx, p) {
    p.addressee(ctx)
    identityBlock(ctx, p)

    p.multilineField(
      ctx,
      {
        label: 'Obiectul cererii',
        name: 'obiectul_cererii',
        required: true,
        group: 'Conținutul cererii',
      },
      { lines: 5 },
    )

    p.paragraph(
      ctx,
      'Totodată, declar pe propria răspundere, cunoscând prevederile art. 326 ' +
        'din Codul penal privind falsul în declarații, următoarele:',
      { size: 11, gap: 8 },
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
      { lines: 5 },
    )

    p.checkbox(ctx, {
      label:
        'Declar că am luat cunoștință că declararea necorespunzătoare a ' +
        'adevărului se pedepsește conform legii și îmi asum răspunderea pentru ' +
        'datele înscrise în prezenta.',
      name: 'confirm_declaratie',
      required: true,
      group: 'Declarație',
    })

    p.signatureFooter(ctx)
  },
}

export default spec
