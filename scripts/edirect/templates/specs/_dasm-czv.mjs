/**
 * Shared body for the two "Centrul de zi pentru seniori" enrolment forms
 * (DASM Cluj-Napoca). The two source files differ only in the centre number,
 * the e-mail the centre answers on, and the wording of the exclusivity
 * declaration — nr. 1 says "alt centru de zi pentru seniori din structura
 * instituției", nr. 2 says "alt centru de zi sau alt club de pensionari" — so
 * the body is written once and parameterised on those three.
 */

import { consentDeclaration } from './_dasm-cluj.mjs'

export function czvBody(ctx, p, { centre, exclusivity }) {
  p.addressee(ctx, { baked: `Centrul de zi pentru seniori nr. ${centre}`, bakedAddress: 'Direcția de Asistență Socială și Medicală Cluj-Napoca' })

  const G = 'Date de identificare'
  p.labeledField(ctx, {
    label: 'Subsemnata/ul (nume și prenume)', name: 'nume_si_prenume', required: true, group: G,
  })
  p.labeledField(ctx, {
    label: 'Cu domiciliul/reședința în municipiul Cluj-Napoca, str.',
    name: 'adresa',
    required: true,
    group: G,
  })
  p.twoColFields(
    ctx,
    { label: 'Nr.', name: 'nr', maxLength: 8, group: G },
    { label: 'Ap.', name: 'ap', maxLength: 8, group: G },
  )
  p.twoColFields(
    ctx,
    { label: 'Telefon', name: 'telefon', group: G },
    { label: 'E-mail', name: 'email', group: G },
  )

  p.paragraph(
    ctx,
    `Prin prezenta vă rog să-mi aprobați înscrierea la activitățile Centrului de zi pentru ` +
      `seniori nr. ${centre}.`,
    { size: 11, gap: 8 },
  )
  p.checkbox(ctx, {
    label: `Declar pe proprie răspundere că nu sunt înscris(ă) la ${exclusivity}.`,
    name: 'declaratie_exclusivitate',
    required: true,
    group: 'Declarații',
  })

  consentDeclaration(ctx, p)
  p.signatureFooter(ctx)
}
