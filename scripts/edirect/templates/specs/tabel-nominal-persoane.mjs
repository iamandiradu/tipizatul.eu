/**
 * Archetype #10 — Tabel nominal cu persoanele.
 *
 * Annex table listing persons (typically attached to an aviz/access request,
 * e.g. the IGPF border-zone procedure). Columns match the catalog originals:
 * Nr. crt. | Nume | Prenume | CNP | Seria și numărul CI. ~50 catalog files.
 */

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'tabel-nominal-persoane',
  name: 'Tabel nominal cu persoanele',
  title: 'TABEL NOMINAL CU PERSOANELE',
  description:
    'Tabel nominal cu persoanele — anexă la o cerere sau un aviz. Completați ' +
    'câte un rând pentru fiecare persoană.',
  category: 'Tabele',

  body(ctx, p) {
    p.table(ctx, {
      name: 'persoana',
      group: 'Persoane',
      rows: 10,
      columns: [
        { header: 'Nume', key: 'nume' },
        { header: 'Prenume', key: 'prenume' },
        { header: 'CNP', key: 'cnp', width: 110, maxLength: 13 },
        { header: 'Seria și numărul cărții de identitate', key: 'ci', width: 110 },
      ],
    })

    p.signatureFooter(ctx)
  },
}

export default spec
