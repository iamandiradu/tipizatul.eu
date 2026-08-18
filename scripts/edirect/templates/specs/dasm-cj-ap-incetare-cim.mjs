/**
 * DASM Cluj-Napoca — cerere de încetare a contractului individual de muncă al
 * asistentului personal, prin acordul părților.
 *
 * Replica of `CERERE-INCETARE-CIM-ACORD-PARTI.doc`. The declaration that the
 * assisted person was told in advance is on the source and is kept: the whole
 * point of the notice period is that the person being cared for is not left
 * without an assistant overnight.
 */

import { ORGANIZATION, COUNTY } from './_dasm-hr.mjs'
import { consentDeclaration } from './_dasm-cluj.mjs'

const G = 'Asistent personal'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-ap-incetare-cim',
  name: 'Cerere de încetare a contractului individual de muncă — asistent personal',
  title: 'CERERE DE ÎNCETARE A CONTRACTULUI INDIVIDUAL DE MUNCĂ',
  description:
    'Cererea prin care asistentul personal al unei persoane cu handicap solicită încetarea ' +
    'contractului individual de muncă prin acordul părților, adresată Direcției de Asistență ' +
    'Socială și Medicală Cluj-Napoca.',
  category: 'Resurse umane',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    p.paragraph(ctx, 'Nr. de înregistrare ______________ /804/ ______________', { size: 10, gap: 4 })
    p.paragraph(ctx, 'Aprob — Director executiv: ____________________', { size: 10, gap: 12 })
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

    p.labeledField(ctx, {
      label: 'Solicit încetarea contractului individual de muncă, prin acordul părților, începând cu data de',
      name: 'data_incetarii',
      required: true,
      group: 'Obiectul cererii',
    })
    p.checkbox(ctx, {
      label: 'Declar pe propria răspundere că am înștiințat din timp despre această intenție persoana asistată.',
      name: 'declar_instiintare',
      required: true,
      group: 'Obiectul cererii',
    })

    p.signatureFooter(ctx)
    consentDeclaration(ctx, p)
    p.signatureFooter(ctx, { dateLabel: 'Data consimțământului', signatureLabel: 'Semnătura' })
  },
}

export default spec
