/**
 * Shared body for the two asistent-personal certificate requests at DASM
 * Cluj-Napoca. The same sheet is addressed either to Serviciul Resurse Umane,
 * Salarizare (proof of employment, for DGASPC) or to Serviciul Financiar,
 * Contabilitate, Buget (net income, for a doctor, a bank, school grants,
 * social housing). Only the addressee and the registration line differ.
 */

import { consentDeclaration } from './_dasm-cluj.mjs'

const G = 'Asistent personal'

export function apAdeverintaBody(ctx, p, { service, registryLine }) {
  p.paragraph(ctx, registryLine, { size: 10, gap: 12 })
  p.addressee(ctx, {
    lead: 'CĂTRE,',
    baked: service,
    bakedAddress: 'Direcția de Asistență Socială și Medicală Cluj-Napoca',
  })

  p.labeledField(ctx, { label: 'Subsemnatul/a (nume și prenume)', name: 'nume_si_prenume', required: true, group: G })
  p.combField(ctx, { label: 'CNP', name: 'cnp', required: true, group: G }, { cells: 13 })
  p.labeledField(ctx, { label: 'Domiciliat/ă în Cluj-Napoca, str.', name: 'adresa', required: true, group: G })
  p.labeledField(ctx, { label: 'Nr., bl., ap.', name: 'adresa_detalii', group: G })
  p.labeledField(ctx, {
    label: 'Angajat/ă în funcția de asistent personal al persoanei cu handicap',
    name: 'persoana_asistata',
    required: true,
    group: G,
  })

  p.multilineField(
    ctx,
    {
      label: 'Prin prezenta solicit eliberarea unei adeverințe pentru',
      name: 'scopul_adeverintei',
      required: true,
      group: 'Obiectul cererii',
    },
    { lines: 3 },
  )
  p.twoColFields(
    ctx,
    { label: 'Telefon', name: 'telefon', required: true, group: 'Contact' },
    { label: 'E-mail', name: 'email', group: 'Contact' },
  )

  p.signatureFooter(ctx)
  consentDeclaration(ctx, p)
  p.signatureFooter(ctx, { dateLabel: 'Data consimțământului', signatureLabel: 'Semnătura' })
}
