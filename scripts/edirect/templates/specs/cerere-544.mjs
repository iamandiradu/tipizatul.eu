/**
 * Archetype #15 — Cerere în baza Legii 544/2001 (informații de interes public).
 *
 * The standard public-information request, modeled on the annex of the
 * implementing norms (HG 123/2002). Universal — any public institution must
 * accept it. The institution is the addressee slot.
 */

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'cerere-544',
  name: 'Cerere de informații de interes public (Legea 544/2001)',
  title: 'CERERE DE INFORMAȚII DE INTERES PUBLIC',
  description:
    'Cerere-tip conform Legii nr. 544/2001 privind liberul acces la ' +
    'informațiile de interes public.',
  category: 'Cereri',

  body(ctx, p) {
    p.addressee(ctx, {
      lead: 'Către,',
      label: 'Denumirea instituției publice',
      name: 'institutie',
    })

    p.labeledField(ctx, {
      label: 'Subsemnatul/a (nume și prenume)',
      name: 'nume_si_prenume',
      required: true,
      group: 'Date de identificare',
    })

    p.labeledField(ctx, {
      label: 'Adresa (domiciliu / adresa de corespondență)',
      name: 'adresa',
      required: true,
      group: 'Date de identificare',
    })

    p.twoColFields(
      ctx,
      { label: 'Telefon', name: 'telefon', group: 'Date de identificare' },
      { label: 'E-mail', name: 'email', group: 'Date de identificare' },
    )

    p.paragraph(
      ctx,
      'Prin prezenta formulez o cerere conform Legii nr. 544/2001 privind ' +
        'liberul acces la informațiile de interes public. Doresc să primesc ' +
        'o copie de pe următoarele documente sau următoarele informații:',
      { size: 11, gap: 8 },
    )

    p.multilineField(
      ctx,
      {
        label: 'Informațiile / documentele solicitate',
        name: 'informatii_solicitate',
        required: true,
        group: 'Solicitarea',
      },
      { lines: 7 },
    )

    p.paragraph(ctx, 'Doresc ca informațiile solicitate să îmi fie furnizate:', {
      size: 11, gap: 4,
    })
    p.checkbox(ctx, { label: 'pe e-mail, la adresa indicată mai sus', name: 'cb_raspuns_email', group: 'Modalitatea de răspuns' })
    p.checkbox(ctx, { label: 'în format hârtie, prin poștă, la adresa indicată mai sus', name: 'cb_raspuns_posta', group: 'Modalitatea de răspuns' })
    p.checkbox(ctx, { label: 'personal, de la sediul instituției', name: 'cb_raspuns_personal', group: 'Modalitatea de răspuns' })

    p.paragraph(
      ctx,
      'Sunt dispus/ă să plătesc taxele aferente serviciilor de copiere a ' +
        'documentelor solicitate, dacă este cazul.',
      { size: 10.5, gap: 8 },
    )

    p.signatureFooter(ctx)
  },
}

export default spec
