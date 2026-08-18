/**
 * Declarație pe propria răspundere privind veniturile nete realizate de o
 * PFA/PFI/ÎI/ÎF, pentru dosarul de indemnizație pentru creșterea copilului.
 *
 * National A.J.P.I.S. model, authored from the DASM Cluj-Napoca copy
 * (`ANAF-DECLARATIAPFA.pdf`, Agenția Județeană pentru Plăți și Inspecție
 * Socială Cluj). A self-employed applicant has no employer to issue the Anexa
 * nr. 2 adeverință, so they declare the twelve monthly net incomes themselves,
 * undertaking to file the ANAF/AJFP evidence once the fiscal year is declared.
 *
 * The year is a field rather than baked in: the source is reissued each year
 * with the twelve months relabelled, and a replica pinned to 2026 would be
 * stale within months.
 */

const G = 'Declarant'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'declaratie-venituri-pfa',
  name: 'Declarație venituri PFA/ÎI/ÎF — indemnizație creștere copil',
  title: 'DECLARAȚIE PE PROPRIA RĂSPUNDERE',
  description:
    'Declarația titularului unei PFA, PFI, întreprinderi individuale sau familiale privind ' +
    'veniturile nete lunare realizate, depusă la A.J.P.I.S. pentru stabilirea indemnizației ' +
    'pentru creșterea copilului (O.U.G. nr. 111/2010, H.G. nr. 52/2011).',
  category: 'Declarații',

  body(ctx, p) {
    p.labeledField(ctx, { label: 'Subsemnatul/a (nume și prenume)', name: 'nume_si_prenume', required: true, group: G })
    p.paragraph(ctx, 'în calitate de titular (bifați forma de organizare):', { size: 10.5, gap: 4 })
    p.checkbox(ctx, { label: 'persoană fizică autorizată (PFA);', name: 'forma_pfa', group: G })
    p.checkbox(ctx, { label: 'persoană fizică independentă (PFI);', name: 'forma_pfi', group: G })
    p.checkbox(ctx, { label: 'întreprindere individuală (Î.I.);', name: 'forma_ii', group: G })
    p.checkbox(ctx, { label: 'întreprindere familială (Î.F.).', name: 'forma_if', group: G })

    p.combField(ctx, { label: 'CNP', name: 'cnp', required: true, group: G }, { cells: 13 })
    p.labeledField(ctx, { label: 'Cu domiciliul în', name: 'adresa', required: true, group: G })
    p.twoColFields(
      ctx,
      { label: 'Identificat/ă fiscal cu CIF', name: 'cif', required: true, maxLength: 12, group: G },
      { label: 'Înregistrat/ă la Registrul Comerțului sub nr.', name: 'nr_onrc', group: G },
    )
    p.labeledField(ctx, { label: 'Având sediul în', name: 'sediu', required: true, group: G })

    p.labeledField(ctx, {
      label: 'Declar pe propria răspundere că în anul',
      name: 'an_fiscal',
      required: true,
      maxLength: 4,
      hint: 'Anul pentru care se declară veniturile.',
      group: 'Venituri declarate',
    })
    p.paragraph(ctx, 'am realizat venituri NETE lunare, după cum urmează:', { size: 10.5, gap: 6 })
    p.table(ctx, {
      name: 'luna',
      rows: 12,
      group: 'Venituri declarate',
      columns: [
        { header: 'Luna', key: 'luna', width: 150 },
        { header: 'Venit net lunar (lei)', key: 'venit_net' },
      ],
    })
    p.labeledField(ctx, {
      label: 'Venitul NET total realizat în anul declarat (lei)',
      name: 'venit_net_total',
      required: true,
      group: 'Venituri declarate',
    })
    p.paragraph(
      ctx,
      'Venituri nete: veniturile rezultate după scăderea impozitului pe venit și, după caz, a ' +
        'contribuțiilor sociale obligatorii datorate conform legii, corespunzător fiecărei ' +
        'categorii de venit; respectiv veniturile rezultate după scăderea contribuțiilor sociale ' +
        'obligatorii, în cazul veniturilor scutite de impozit pe venit conform art. 60 din Legea ' +
        'nr. 227/2015, cu modificările și completările ulterioare.',
      { size: 8.5, gap: 8 },
    )

    p.paragraph(
      ctx,
      'După declararea veniturilor conform prevederilor legale fiscale în vigoare, mă oblig să ' +
        'depun la A.J.P.I.S. documentele doveditoare eliberate de organele competente (ANAF/AJFP) ' +
        'privind veniturile efectiv realizate în perioada pentru care s-a luat în calcul venitul ' +
        'net declarat în prezenta declarație, în vederea recalculării indemnizației pentru ' +
        'creșterea copilului, conform art. 3 alin. (7), (8), (9) și (10) din O.U.G. nr. 111/2010, ' +
        'cu modificările și completările ulterioare, și art. 22 din H.G. nr. 52/2011.',
      { size: 9.5, gap: 6 },
    )
    p.paragraph(
      ctx,
      'Prezenta declarație servește ca act doveditor al veniturilor nete realizate în anul ' +
        'declarat, urmând ca acestea să fie declarate oficial în anul următor, conform ' +
        'prevederilor legale fiscale în vigoare. Declar pe propria răspundere că informațiile de ' +
        'mai sus sunt reale și corecte, cunoscând prevederile art. 326 Cod penal privind falsul în ' +
        'declarații.',
      { size: 9.5, gap: 8 },
    )

    p.signatureFooter(ctx)
  },
}

export default spec
