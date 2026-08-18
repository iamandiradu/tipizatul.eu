/**
 * DASM Cluj-Napoca — cerere de completare a dosarului de prestații sociale.
 *
 * Replica of `Cerere-completare-dosar-prestatii.pdf`. Which file is being
 * topped up (VMI, cantină, ajutor pentru plata chiriei) and which documents are
 * being handed in are both closed lists on the source, so both are reproduced
 * as options, with three free lines for anything not listed.
 */

import { ORGANIZATION, COUNTY, dasmAddressee } from './_dasm-cluj.mjs'

const G = 'Date de identificare'
const T = 'Tipul dosarului'
const D = 'Documente depuse'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-completare-dosar-prestatii',
  name: 'Cerere completare dosar prestații sociale',
  title: 'CERERE DE COMPLETARE A DOSARULUI',
  description:
    'Cerere adresată Direcției de Asistență Socială și Medicală Cluj-Napoca pentru completarea ' +
    'dosarului de venit minim de incluziune, cantină sau ajutor pentru plata chiriei.',
  category: 'Asistență socială',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    p.paragraph(ctx, 'Nr. ______________ /801/ ______________', { size: 10, gap: 12 })
    dasmAddressee(ctx, p, 'Cluj-Napoca')

    p.labeledField(ctx, { label: 'Subsemnatul/a (nume și prenume)', name: 'nume_si_prenume', required: true, group: G })
    p.combField(ctx, { label: 'CNP', name: 'cnp', required: true, group: G }, { cells: 13 })
    p.labeledField(ctx, {
      label: 'Domiciliat/ă în municipiul Cluj-Napoca, str.', name: 'adresa', required: true, group: G,
    })
    p.twoColFields(
      ctx,
      { label: 'Nr.', name: 'nr', maxLength: 8, group: G },
      { label: 'Ap.', name: 'ap', maxLength: 8, group: G },
    )

    p.paragraph(ctx, 'având dosar de:', { size: 11, gap: 4 })
    p.checkbox(ctx, { label: 'V.M.I. (venit minim de incluziune);', name: 'dosar_vmi', group: T })
    p.checkbox(ctx, { label: 'cantină;', name: 'dosar_cantina', group: T })
    p.checkbox(ctx, { label: 'ajutor pentru plata chiriei.', name: 'dosar_chirie', group: T })

    p.paragraph(ctx, 'solicit COMPLETAREA DOSARULUI cu următoarele documente:', { size: 11, gap: 4 })
    p.checkbox(ctx, { label: 'adeverință eliberată de AJOFM;', name: 'doc_ajofm', group: D })
    p.checkbox(ctx, { label: 'adeverință eliberată de Administrația Finanțelor Publice;', name: 'doc_anaf', group: D })
    p.checkbox(ctx, { label: 'cupon alocație;', name: 'doc_cupon_alocatie', group: D })
    p.checkbox(ctx, { label: 'cupon pensie;', name: 'doc_cupon_pensie', group: D })
    p.checkbox(ctx, { label: 'adeverință școală;', name: 'doc_adeverinta_scoala', group: D })
    p.checkbox(ctx, { label: 'copie act de identitate / certificat de naștere minor;', name: 'doc_act_identitate', group: D })
    p.checkbox(ctx, { label: 'certificat de căsătorie / deces;', name: 'doc_casatorie_deces', group: D })
    p.checkbox(ctx, { label: 'certificat de încadrare în grad de handicap;', name: 'doc_certificat_handicap', group: D })
    p.checkbox(ctx, { label: 'adeverință de venit;', name: 'doc_adeverinta_venit', group: D })
    for (let i = 1; i <= 3; i++) {
      p.labeledField(ctx, { label: `Alt document ${i}`, name: `doc_alt_${i}`, group: D })
    }

    p.labeledField(ctx, { label: 'Telefon', name: 'telefon', required: true, group: 'Contact' })
    p.signatureFooter(ctx, { signatureLabel: 'Semnătură' })
  },
}

export default spec
