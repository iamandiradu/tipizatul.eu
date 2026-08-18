/**
 * Formular de înscriere la concursul pentru un post contractual.
 *
 * National model (H.G. nr. 1336/2022), authored from the DASM Cluj-Napoca copy
 * (`Formular-inscriere-la-concurs-72-1.pdf`). The three GDPR consents are the
 * reason the form exists in this shape — each one authorises a different check
 * (electronic transmission to the commission, the integrity certificate for
 * posts working with vulnerable people, the criminal record extract) — so each
 * is reproduced as its own explicit yes/no pair rather than a single blanket
 * consent.
 *
 * Left generic (no `organization`): every public institution uses this form.
 */

const G = 'Candidat'
const C = 'Consimțăminte'

function consentPair(ctx, p, { name, label }) {
  p.checkbox(ctx, { label: `Îmi exprim consimțământul ${label}`, name: `${name}_da`, group: C })
  p.checkbox(ctx, { label: `Nu îmi exprim consimțământul ${label}`, name: `${name}_nu`, group: C })
}

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'formular-inscriere-concurs-contractual',
  name: 'Formular de înscriere la concurs — post contractual',
  title: 'FORMULAR DE ÎNSCRIERE',
  description:
    'Formularul de înscriere la concursul pentru ocuparea unui post contractual într-o instituție ' +
    'publică, conform H.G. nr. 1336/2022, cu datele de contact, persoanele de referință și ' +
    'consimțămintele privind prelucrarea datelor cu caracter personal.',
  category: 'Resurse umane',

  body(ctx, p) {
    p.labeledField(ctx, { label: 'Autoritatea sau instituția publică', name: 'institutia', required: true, group: G })
    p.labeledField(ctx, { label: 'Funcția solicitată', name: 'functia_solicitata', required: true, group: G })
    p.labeledField(ctx, {
      label: 'Data organizării concursului (proba scrisă și/sau proba practică, după caz)',
      name: 'data_concurs',
      group: G,
    })
    p.labeledField(ctx, { label: 'Numele și prenumele candidatului', name: 'nume_si_prenume', required: true, group: G })
    p.labeledField(ctx, { label: 'Adresa', name: 'adresa', required: true, group: G })
    p.twoColFields(
      ctx,
      { label: 'E-mail', name: 'email', required: true, group: G },
      { label: 'Telefon', name: 'telefon', required: true, group: G },
    )

    p.paragraph(ctx, 'Persoane de contact pentru recomandări:', { size: 10.5, gap: 4 })
    p.table(ctx, {
      name: 'recomandare',
      rows: 3,
      group: 'Persoane de contact pentru recomandări',
      columns: [
        { header: 'Numele și prenumele', key: 'nume' },
        { header: 'Instituția', key: 'institutia' },
        { header: 'Funcția', key: 'functia', width: 90 },
        { header: 'Numărul de telefon', key: 'telefon', width: 90 },
      ],
    })

    p.paragraph(
      ctx,
      'Anexez prezentei cereri documentele solicitate. Menționez că am luat cunoștință de ' +
        'condițiile de desfășurare a concursului.',
      { size: 10.5, gap: 8 },
    )

    p.paragraph(
      ctx,
      'Cunoscând prevederile art. 4 pct. 2 și 11 și art. 6 alin. (1) lit. a) din Regulamentul (UE) ' +
        '2016/679, în ceea ce privește consimțământul cu privire la prelucrarea datelor cu caracter ' +
        'personal, declar următoarele:',
      { size: 10, gap: 4 },
    )
    consentPair(ctx, p, {
      name: 'consimtamant_transmitere',
      label:
        'cu privire la transmiterea informațiilor și documentelor, inclusiv date cu caracter ' +
        'personal necesare îndeplinirii atribuțiilor membrilor comisiei de concurs, membrilor ' +
        'comisiei de soluționare a contestațiilor și ale secretarului, în format electronic.',
    })
    consentPair(ctx, p, {
      name: 'consimtamant_integritate',
      label:
        'ca instituția organizatoare a concursului să solicite organelor abilitate, în condițiile ' +
        'legii, certificatul de integritate comportamentală pentru candidații înscriși pentru ' +
        'posturile din cadrul sistemului de învățământ, sănătate sau protecție socială, precum și ' +
        'din orice entitate a cărei activitate presupune contactul direct cu copii, persoane în ' +
        'vârstă, persoane cu dizabilități sau alte categorii de persoane vulnerabile.',
    })
    consentPair(ctx, p, {
      name: 'consimtamant_cazier',
      label:
        'ca instituția organizatoare a concursului să solicite organelor abilitate, în condițiile ' +
        'legii, extrasul de pe cazierul judiciar cu scopul angajării.',
    })

    p.paragraph(ctx, 'Declar pe propria răspundere că în perioada lucrată (bifați):', { size: 10.5, gap: 2 })
    p.checkbox(ctx, { label: 'nu mi s-a aplicat nicio sancțiune disciplinară;', name: 'sanctiune_nu', group: 'Declarații' })
    p.checkbox(ctx, { label: 'mi s-a aplicat sancțiunea disciplinară:', name: 'sanctiune_da', group: 'Declarații' })
    p.labeledField(ctx, { label: 'Sancțiunea disciplinară aplicată', name: 'sanctiune_detalii', group: 'Declarații' })

    p.paragraph(
      ctx,
      'Declar pe propria răspundere, cunoscând prevederile art. 326 din Codul penal cu privire la ' +
        'falsul în declarații, că datele furnizate în acest formular sunt adevărate.',
      { size: 9.5, gap: 8 },
    )
    p.labeledField(ctx, { label: 'Numele și prenumele', name: 'nume_semnatar', required: true, group: 'Declarații' })
    p.signatureFooter(ctx)
  },
}

export default spec
