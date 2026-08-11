/**
 * Archetype #5 — Declarație privind prelucrarea datelor (informare GDPR).
 *
 * The acknowledgement sibling of #4 (~54 catalog files): the person confirms
 * they have been *informed* about how a named operator processes their data —
 * scope, legal basis, retention, and their rights under GDPR.
 */

import { declarantBlock } from './_shared.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'declaratie-gdpr',
  name: 'Declarație privind prelucrarea datelor cu caracter personal',
  title: 'DECLARAȚIE PRIVIND PRELUCRAREA DATELOR CU CARACTER PERSONAL',
  description:
    'Declarație prin care persoana vizată confirmă că a fost informată cu ' +
    'privire la prelucrarea datelor sale, conform GDPR.',
  category: 'Declarații',

  body(ctx, p) {
    declarantBlock(ctx, p)

    p.addressee(ctx, { lead: 'Operatorul de date:', label: 'Operatorul de date' })

    p.paragraph(
      ctx,
      'Declar că am fost informat(ă) cu privire la prelucrarea datelor mele cu ' +
        'caracter personal de către operatorul menționat mai sus — scopul și ' +
        'temeiul legal al prelucrării, categoriile de date, durata stocării, ' +
        'destinatarii și drepturile care îmi revin în temeiul Regulamentului ' +
        '(UE) 2016/679 (dreptul de acces, rectificare, ștergere, restricționare, ' +
        'opoziție și portabilitate).',
      { size: 11, gap: 10 },
    )

    p.checkbox(ctx, {
      label:
        'Confirm că am luat cunoștință de informarea privind prelucrarea ' +
        'datelor cu caracter personal.',
      name: 'confirm_informare',
      required: true,
      group: 'Informare',
    })

    p.signatureFooter(ctx)
  },
}

export default spec
