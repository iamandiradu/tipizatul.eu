/**
 * DASM Cluj-Napoca — cerere de eliberare a unei adeverințe de la Serviciul
 * Resurse Umane, Salarizare.
 *
 * Replica of `cereri-adeverinte.pdf`, listed under both the personal
 * contractual and the funcții publice sets. What the certificate is needed for
 * decides what the service writes in it, so that line is the substance of the
 * request and is kept as a multi-line field.
 */

import { ORGANIZATION, COUNTY, SERVICE_RU } from './_dasm-hr.mjs'

const G = 'Salariat'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-hr-cerere-adeverinta',
  name: 'Cerere pentru eliberarea unei adeverințe — Resurse Umane',
  title: 'CERERE',
  description:
    'Cererea prin care un salariat al Direcției de Asistență Socială și Medicală Cluj-Napoca ' +
    'solicită Serviciului Resurse Umane, Salarizare eliberarea unei adeverințe.',
  category: 'Resurse umane',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    p.addressee(ctx, {
      lead: 'CĂTRE,',
      baked: SERVICE_RU,
      bakedAddress: 'Direcția de Asistență Socială și Medicală Cluj-Napoca',
    })

    p.labeledField(ctx, { label: 'Subsemnatul/a (nume și prenume)', name: 'nume_si_prenume', required: true, group: G })
    p.labeledField(ctx, { label: 'CNP', name: 'cnp', required: true, group: G })
    p.labeledField(ctx, { label: 'Domiciliat/ă în', name: 'adresa', required: true, group: G })
    p.labeledField(ctx, { label: 'Str., nr., bl., ap.', name: 'adresa_detalii', group: G })
    p.paragraph(ctx, 'având calitatea de (bifați):', { size: 10.5, gap: 2 })
    p.checkbox(ctx, { label: 'funcționar public;', name: 'calitate_functionar_public', group: G })
    p.checkbox(ctx, { label: 'personal contractual.', name: 'calitate_personal_contractual', group: G })
    p.labeledField(ctx, { label: 'În cadrul Serviciului/Centrului', name: 'serviciu', required: true, group: G })

    p.multilineField(
      ctx,
      {
        label: 'Prin prezenta solicit eliberarea unei adeverințe pentru a-mi servi la',
        name: 'scopul_adeverintei',
        required: true,
        group: 'Obiectul cererii',
      },
      { lines: 4 },
    )

    p.signatureFooter(ctx)
  },
}

export default spec
