/**
 * Archetype #20 — Cerere pentru eliberarea certificatului de cazier judiciar
 * (persoane fizice, Legea nr. 290/2004).
 *
 * Filed with any police unit; the identity section follows the official MAI
 * form: name, former name, parents' given names, birth date/place, CNP,
 * identity document, domicile, and the purpose of the request.
 */

const G_ID = 'Date de identificare'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'cerere-cazier',
  name: 'Cerere certificat de cazier judiciar (persoane fizice)',
  title: 'CERERE PENTRU ELIBERAREA CERTIFICATULUI DE CAZIER JUDICIAR',
  description:
    'Cerere pentru eliberarea certificatului de cazier judiciar pentru ' +
    'persoane fizice, conform Legii nr. 290/2004.',
  category: 'Cereri',

  body(ctx, p) {
    p.addressee(ctx, {
      lead: 'Către,',
      label: 'Unitatea de poliție (IPJ / secția)',
      name: 'unitate_politie',
    })

    p.twoColFields(
      ctx,
      { label: 'Numele', name: 'nume', required: true, group: G_ID },
      { label: 'Prenumele', name: 'prenume', required: true, group: G_ID },
    )

    p.labeledField(ctx, {
      label: 'Numele anterior (dacă a fost schimbat)',
      name: 'nume_anterior',
      group: G_ID,
    })

    p.twoColFields(
      ctx,
      { label: 'Prenumele tatălui', name: 'prenume_tata', required: true, group: G_ID },
      { label: 'Prenumele mamei', name: 'prenume_mama', required: true, group: G_ID },
    )

    p.twoColFields(
      ctx,
      { label: 'Data nașterii', name: 'data_nasterii', required: true, group: G_ID },
      { label: 'Locul nașterii (localitatea, județul/țara)', name: 'loc_nastere', required: true, group: G_ID },
    )

    p.twoColFields(
      ctx,
      { label: 'CNP', name: 'cnp', required: true, group: G_ID },
      { label: 'Act identitate (serie, nr.)', name: 'act_identitate', required: true, group: G_ID },
    )

    p.labeledField(ctx, {
      label: 'Domiciliul (adresa completă)',
      name: 'adresa',
      required: true,
      group: G_ID,
    })

    p.paragraph(
      ctx,
      'Vă rog să îmi eliberați un certificat de cazier judiciar, care îmi este ' +
        'necesar pentru:',
      { size: 11, gap: 6 },
    )

    p.labeledField(ctx, {
      label: 'Motivul solicitării',
      name: 'motiv',
      required: true,
      hint: 'De exemplu: angajare, înscriere la concurs, obținere permis etc.',
      group: 'Solicitarea',
    })

    p.paragraph(
      ctx,
      'Declar pe propria răspundere că nu am avut și nu am folosit alte nume ' +
        'și date de identificare în afară de cele menționate în prezenta cerere.',
      { size: 10.5, gap: 8 },
    )

    p.signatureFooter(ctx)
  },
}

export default spec
