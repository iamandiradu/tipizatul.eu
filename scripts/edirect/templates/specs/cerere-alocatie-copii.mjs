/**
 * Archetype #18 — Cerere pentru acordarea alocației de stat pentru copii.
 *
 * Modeled on the national „Anexa nr. 1 la Normele metodologice" (Legea
 * 61/1993), as found in the catalog (Primăria Mahmudia copy): solicitant →
 * copil → modalitate de plată → documente anexate. Filed with the primărie,
 * which forwards to AJPIS.
 */

import { identityBlock } from './_shared.mjs'

const G_COPIL = 'Datele copilului'
const G_PLATA = 'Modalitatea de plată'
const G_ANEXE = 'Documente anexate'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'cerere-alocatie-copii',
  name: 'Cerere pentru acordarea alocației de stat pentru copii',
  title: 'CERERE PENTRU ACORDAREA ALOCAȚIEI DE STAT PENTRU COPII',
  description:
    'Cerere conform Anexei nr. 1 la Normele metodologice (Legea nr. 61/1993) ' +
    'pentru acordarea alocației de stat pentru copii.',
  category: 'Cereri',

  body(ctx, p) {
    p.addressee(ctx, {
      lead: 'Către,',
      label: 'Primăria (comuna/orașul/municipiul)',
      name: 'primaria',
    })

    identityBlock(ctx, p, { actIdentitate: true })

    p.labeledField(ctx, {
      label: 'În calitate de (părinte / reprezentant legal / tutore)',
      name: 'calitate',
      required: true,
      group: 'Date de identificare',
    })

    p.paragraph(ctx, 'Vă rog să aprobați acordarea alocației de stat pentru copilul:', {
      size: 11, gap: 6,
    })

    p.labeledField(ctx, {
      label: 'Numele și prenumele copilului',
      name: 'copil_nume',
      required: true,
      group: G_COPIL,
    })
    p.twoColFields(
      ctx,
      { label: 'CNP copil', name: 'copil_cnp', required: true, maxLength: 13, group: G_COPIL },
      { label: 'Data nașterii', name: 'copil_data_nasterii', required: true, group: G_COPIL },
    )
    p.labeledField(ctx, {
      label: 'Certificat de naștere (seria și numărul)',
      name: 'copil_certificat',
      group: G_COPIL,
    })

    p.paragraph(ctx, 'Doresc ca plata alocației să se efectueze prin:', { size: 11, gap: 4 })
    p.checkbox(ctx, { label: 'mandat poștal', name: 'cb_plata_mandat', group: G_PLATA })
    p.checkbox(ctx, { label: 'cont bancar (completați mai jos)', name: 'cb_plata_cont', group: G_PLATA })
    p.twoColFields(
      ctx,
      { label: 'Cont IBAN', name: 'iban', group: G_PLATA },
      { label: 'Banca', name: 'banca', group: G_PLATA },
    )

    p.paragraph(ctx, 'La prezenta cerere anexez următoarele documente (se bifează):', {
      size: 11, gap: 4,
    })
    p.checkbox(ctx, { label: 'copia certificatului de naștere al copilului', name: 'cb_anexa_certificat', group: G_ANEXE })
    p.checkbox(ctx, { label: 'copia actului de identitate al reprezentantului legal', name: 'cb_anexa_ci', group: G_ANEXE })
    p.checkbox(ctx, { label: 'livretul de familie', name: 'cb_anexa_livret', group: G_ANEXE })
    p.checkbox(ctx, {
      label: 'hotărârea judecătorească de încredințare / de instituire a tutelei sau, după caz, măsura de protecție specială',
      name: 'cb_anexa_hotarare', group: G_ANEXE,
    })
    p.checkbox(ctx, { label: 'extras de cont bancar (pentru plata în cont)', name: 'cb_anexa_extras', group: G_ANEXE })
    p.checkbox(ctx, { label: 'alte documente', name: 'cb_anexa_altele', group: G_ANEXE })
    p.labeledField(ctx, { label: 'Alte documente (precizați)', name: 'alte_documente', group: G_ANEXE })

    p.signatureFooter(ctx)
  },
}

export default spec
