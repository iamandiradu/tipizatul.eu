/**
 * Archetype #16 — Petiție (OG 27/2002 privind reglementarea activității de
 * soluționare a petițiilor).
 *
 * Universal complaint/petition form; structure follows the ADR „Formular tip
 * de petiție — persoane fizice" from the catalog (identity → when the issue
 * was discovered → description → prior steps → request).
 */

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'petitie',
  name: 'Petiție',
  title: 'PETIȚIE',
  description:
    'Petiție adresată unei instituții publice, conform OG nr. 27/2002 privind ' +
    'reglementarea activității de soluționare a petițiilor.',
  category: 'Cereri',

  body(ctx, p) {
    p.addressee(ctx, {
      lead: 'Către,',
      label: 'Denumirea instituției publice',
      name: 'institutie',
    })

    p.labeledField(ctx, {
      label: 'Numele și prenumele',
      name: 'nume_si_prenume',
      required: true,
      group: 'Date de identificare',
    })

    p.labeledField(ctx, {
      label: 'Domiciliul (reședința ori altă adresă unde puteți fi găsit)',
      name: 'adresa',
      required: true,
      group: 'Date de identificare',
    })

    p.twoColFields(
      ctx,
      { label: 'Telefon', name: 'telefon', group: 'Date de identificare' },
      { label: 'E-mail', name: 'email', group: 'Date de identificare' },
    )

    p.labeledField(ctx, {
      label: 'Data la care ați luat cunoștință despre problema semnalată',
      name: 'data_problema',
      group: 'Conținutul petiției',
    })

    p.multilineField(
      ctx,
      {
        label: 'Prezentarea succintă a problemei / a drepturilor încălcate',
        name: 'continut_petitie',
        required: true,
        group: 'Conținutul petiției',
      },
      { lines: 7 },
    )

    p.multilineField(
      ctx,
      {
        label: 'Demersuri întreprinse anterior (dacă este cazul)',
        name: 'demersuri_anterioare',
        group: 'Conținutul petiției',
      },
      { lines: 3 },
    )

    p.multilineField(
      ctx,
      {
        label: 'Ce solicitați instituției',
        name: 'solicitare',
        required: true,
        group: 'Conținutul petiției',
      },
      { lines: 3 },
    )

    p.signatureFooter(ctx)
  },
}

export default spec
