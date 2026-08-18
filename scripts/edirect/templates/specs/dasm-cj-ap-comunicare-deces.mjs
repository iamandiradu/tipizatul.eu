/**
 * DASM Cluj-Napoca — adresă de comunicare a decesului persoanei cu handicap
 * grav, depusă de asistentul personal.
 *
 * Replica of `CERERE-INCETARE-IM-DECES-PH.odt`. Filing it is what ends the
 * employment relationship, so the date of death and the death certificate
 * number are the substance of the document.
 */

import { ORGANIZATION, COUNTY } from './_dasm-hr.mjs'
import { consentDeclaration } from './_dasm-cluj.mjs'

const G = 'Asistent personal'
const D = 'Decesul persoanei cu handicap grav'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-ap-comunicare-deces',
  name: 'Adresă de comunicare a decesului persoanei cu handicap',
  title: 'ADRESĂ DE COMUNICARE A DECESULUI',
  description:
    'Adresa prin care asistentul personal comunică Direcției de Asistență Socială și Medicală ' +
    'Cluj-Napoca decesul persoanei cu handicap grav pe care o asista, cu anexarea certificatului ' +
    'de deces.',
  category: 'Resurse umane',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    p.paragraph(ctx, 'Nr. de înregistrare ______________ /804/ ______________', { size: 10, gap: 4 })
    p.paragraph(ctx, 'Văzut — Director executiv: ____________________', { size: 10, gap: 12 })
    p.addressee(ctx, {
      lead: 'CĂTRE,',
      baked: 'CONSILIUL LOCAL AL MUNICIPIULUI CLUJ-NAPOCA',
      bakedAddress: 'Direcția de Asistență Socială și Medicală',
    })

    p.labeledField(ctx, { label: 'Subsemnatul/a (nume și prenume)', name: 'nume_si_prenume', required: true, group: G })
    p.combField(ctx, { label: 'CNP', name: 'cnp', required: true, group: G }, { cells: 13 })
    p.labeledField(ctx, { label: 'Domiciliat/ă în Cluj-Napoca, str.', name: 'adresa', required: true, group: G })
    p.labeledField(ctx, { label: 'Nr., bl., ap.', name: 'adresa_detalii', group: G })
    p.labeledField(ctx, {
      label: 'În calitate de asistent personal al persoanei cu handicap',
      name: 'persoana_asistata',
      required: true,
      group: G,
    })

    p.paragraph(ctx, 'Prin prezenta vă aduc la cunoștință decesul persoanei cu handicap grav:', { size: 11, gap: 6 })
    p.labeledField(ctx, { label: 'Nume și prenume', name: 'decedat_nume', required: true, group: D })
    p.twoColFields(
      ctx,
      { label: 'Decesul a avut loc în data de', name: 'data_deces', required: true, group: D },
      { label: 'Anexez certificatul de deces nr.', name: 'certificat_deces_nr', required: true, group: D },
    )

    p.signatureFooter(ctx)
    consentDeclaration(ctx, p)
    p.signatureFooter(ctx, { dateLabel: 'Data consimțământului', signatureLabel: 'Semnătura' })
  },
}

export default spec
