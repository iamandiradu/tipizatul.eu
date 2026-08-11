/**
 * Archetype #19 — Cerere concediu pentru creșterea copilului.
 *
 * Request to the EMPLOYER for child-raising leave under OUG nr. 111/2010
 * (up to 2 years, 3 for a disabled child). The employer is the institution
 * slot. The separate indemnity request to AJPIS is not this form.
 */

import { identityBlock } from './_shared.mjs'

const G_COPIL = 'Datele copilului'
const G_PERIOADA = 'Perioada concediului'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'cerere-concediu-crestere',
  name: 'Cerere concediu pentru creșterea copilului',
  title: 'CERERE PENTRU ACORDAREA CONCEDIULUI PENTRU CREȘTEREA COPILULUI',
  description:
    'Cerere adresată angajatorului pentru acordarea concediului pentru ' +
    'creșterea copilului, conform OUG nr. 111/2010.',
  category: 'Cereri',

  body(ctx, p) {
    p.addressee(ctx, {
      lead: 'Către,',
      label: 'Angajatorul (denumirea)',
      name: 'angajator',
    })

    identityBlock(ctx, p, { actIdentitate: true })

    p.labeledField(ctx, {
      label: 'Funcția / postul ocupat',
      name: 'functia',
      group: 'Date de identificare',
    })

    p.paragraph(
      ctx,
      'Vă rog să îmi aprobați acordarea concediului pentru creșterea copilului ' +
        'în vârstă de până la 2 ani (respectiv 3 ani, în cazul copilului cu ' +
        'handicap), în conformitate cu prevederile OUG nr. 111/2010 privind ' +
        'concediul și indemnizația lunară pentru creșterea copiilor.',
      { size: 11, gap: 8 },
    )

    p.labeledField(ctx, {
      label: 'Numele și prenumele copilului',
      name: 'copil_nume',
      required: true,
      group: G_COPIL,
    })
    p.twoColFields(
      ctx,
      { label: 'CNP copil', name: 'copil_cnp', maxLength: 13, group: G_COPIL },
      { label: 'Data nașterii', name: 'copil_data_nasterii', required: true, group: G_COPIL },
    )

    p.twoColFields(
      ctx,
      { label: 'Concediu solicitat de la data', name: 'concediu_de_la', required: true, group: G_PERIOADA },
      { label: 'Până la data', name: 'concediu_pana_la', required: true, group: G_PERIOADA },
    )

    p.paragraph(
      ctx,
      'Anexez prezentei copia certificatului de naștere al copilului și, după ' +
        'caz, celelalte documente prevăzute de lege.',
      { size: 10.5, gap: 8 },
    )

    p.signatureFooter(ctx)
  },
}

export default spec
