/**
 * DASM Cluj-Napoca — declarația celuilalt părinte privind acordarea alocației
 * de stat pentru copil.
 *
 * Replica of `declaratia-celuilalt-parinte-cu-privire-la-acordarea-alocatiei-
 * de-stat1.pdf`, attached to the alocație de stat and indemnizație files when
 * the parents are not married: the other parent agrees that the allowance is
 * established in the applicant's name.
 */

import { ORGANIZATION, COUNTY } from './_dasm-cluj.mjs'

const G = 'Declarantul (celălalt părinte)'
const C = 'Copilul'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-declaratie-celalalt-parinte',
  name: 'Declarația celuilalt părinte — alocația de stat pentru copil',
  title: 'DECLARAȚIE',
  description:
    'Declarația celuilalt părinte prin care își exprimă acordul ca alocația de stat pentru copil ' +
    'să fie întocmită pe numele solicitantului. Se depune la dosarul de alocație pentru părinții ' +
    'necăsătoriți.',
  category: 'Declarații',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    p.labeledField(ctx, { label: 'Subsemnatul/a (nume și prenume)', name: 'nume_si_prenume', required: true, group: G })
    p.labeledField(ctx, { label: 'Cu domiciliul în', name: 'adresa', required: true, group: G })

    p.paragraph(ctx, 'părinte al copilului:', { size: 11, gap: 6 })
    p.labeledField(ctx, { label: 'Numele și prenumele copilului', name: 'copil_nume', required: true, group: C })
    p.combField(ctx, { label: 'CNP copil', name: 'copil_cnp', required: true, group: C }, { cells: 13 })
    p.labeledField(ctx, { label: 'Născut în localitatea', name: 'copil_localitate_nastere', required: true, group: C })

    p.paragraph(
      ctx,
      'declar că sunt de acord ca alocația de stat pentru copil să fie întocmită pe numele:',
      { size: 11, gap: 6 },
    )
    p.labeledField(ctx, {
      label: 'Nume și prenume', name: 'titular_alocatie', required: true, group: 'Titularul alocației',
    })

    p.signatureFooter(ctx)
  },
}

export default spec
