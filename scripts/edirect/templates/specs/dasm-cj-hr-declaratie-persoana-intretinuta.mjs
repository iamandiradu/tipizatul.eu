/**
 * DASM Cluj-Napoca — Anexa 2: declarația pe proprie răspundere a persoanei
 * aflate în întreținere.
 *
 * Replica of `Declaratie-pe-proprie-raspundere-anexa-21.pdf`. The dependant
 * declares who supports them, what income they have, and that they hold no
 * farmland above the legal thresholds — the three conditions art. 77 of the
 * Fiscal Code makes the deduction depend on.
 */

import { ORGANIZATION, COUNTY } from './_dasm-hr.mjs'

const G = 'Declarant (persoana aflată în întreținere)'
const I = 'Persoana care contribuie la întreținere'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-hr-declaratie-persoana-intretinuta',
  name: 'Declarație pe proprie răspundere a persoanei aflate în întreținere (Anexa 2)',
  title: 'DECLARAȚIE PE PROPRIE RĂSPUNDERE a persoanei aflate în întreținere',
  description:
    'Declarația persoanei aflate în întreținere, prin care este de acord ca susținătorul său să ' +
    'beneficieze de coeficientul de deducere personală, conform Legii nr. 227/2015 privind Codul ' +
    'fiscal (Anexa 2).',
  category: 'Declarații',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    p.paragraph(ctx, 'Anexa 2', { size: 9, gap: 10 })

    p.labeledField(ctx, { label: 'Subsemnatul/a (nume și prenume)', name: 'nume_si_prenume', required: true, group: G })
    p.twoColFields(
      ctx,
      { label: 'Domiciliat/ă în localitatea', name: 'localitate', required: true, group: G },
      { label: 'Județul', name: 'judet', group: G },
    )
    p.labeledField(ctx, { label: 'Strada, nr., bl., sc., ap., sectorul', name: 'adresa', required: true, group: G })
    p.combField(ctx, { label: 'Codul numeric personal', name: 'cnp', required: true, group: G }, { cells: 13 })

    p.paragraph(
      ctx,
      'declar pe propria răspundere că datele menționate mai jos sunt reale, cunoscând că falsul în ' +
        'declarații se pedepsește conform legii penale.',
      { size: 10, gap: 8 },
    )

    p.paragraph(
      ctx,
      'I. Persoana care contribuie la întreținerea mea și pentru care sunt de acord să beneficieze ' +
        'de coeficientul de deducere personală pentru întreținerea mea, conform prevederilor Legii ' +
        'nr. 227/2015 privind Codul fiscal:',
      { size: 10, gap: 4 },
    )
    p.labeledField(ctx, { label: 'Numele și prenumele', name: 'sustinator_nume', required: true, group: I })
    p.combField(ctx, { label: 'Codul numeric personal', name: 'sustinator_cnp', required: true, group: I }, { cells: 13 })
    p.labeledField(ctx, { label: 'Gradul de rudenie', name: 'sustinator_rudenie', required: true, group: I })

    const V = 'II. Venitul realizat'
    p.paragraph(ctx, 'II. La data declarației realizez:', { size: 10, gap: 4 })
    p.twoColFields(
      ctx,
      { label: 'Un venit în sumă de (lei/lună)', name: 'venit_suma', required: true, group: V },
      { label: 'Reprezentând', name: 'venit_tip', required: true, group: V },
    )

    p.checkbox(ctx, {
      label:
        'III. Declar pe proprie răspundere că nu dețin terenuri agricole și silvice în suprafață de ' +
        'peste 10.000 m² în zonele colinare și de șes și de peste 20.000 m² în zonele montane.',
      name: 'declar_fara_terenuri',
      required: true,
      group: 'III. Terenuri',
    })
    p.paragraph(
      ctx,
      'Mă oblig să anunț de îndată persoana prevăzută la pct. I în cazul în care vor interveni ' +
        'schimbări în situația venitului realizat.',
      { size: 9.5, gap: 8 },
    )

    p.signatureFooter(ctx)
  },
}

export default spec
