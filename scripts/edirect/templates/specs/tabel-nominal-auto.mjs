/**
 * Archetype #11 — Tabel nominal cu autovehiculele.
 *
 * Annex table listing vehicles/vessels (sibling of tabel-nominal-persoane,
 * same IGPF procedure family). Columns match the catalog originals:
 * Nr. crt. | Tipul autovehiculului/ambarcațiunii | Număr de înmatriculare.
 * ~46 catalog files.
 */

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'tabel-nominal-auto',
  name: 'Tabel nominal cu autovehiculele',
  title: 'TABEL NOMINAL CU AUTOVEHICULELE',
  description:
    'Tabel nominal cu autovehiculele sau ambarcațiunile — anexă la o cerere ' +
    'sau un aviz. Completați câte un rând pentru fiecare vehicul.',
  category: 'Tabele',

  body(ctx, p) {
    p.table(ctx, {
      name: 'vehicul',
      group: 'Autovehicule',
      rows: 10,
      columns: [
        { header: 'Tipul autovehiculului / ambarcațiunii', key: 'tip' },
        {
          header: 'Număr de înmatriculare (numele/numărul ambarcațiunii)',
          key: 'nr_inmatriculare',
        },
      ],
    })

    p.signatureFooter(ctx)
  },
}

export default spec
