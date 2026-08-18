/**
 * DASM Cluj-Napoca — declarație privind dovada stagiului de cotizare.
 *
 * Replica of `declaratie-referitoare-la-dovada-stagiului-de-cotizare2.pdf`,
 * attached to the stimulent de inserție and indemnizație creștere copil files
 * when the contribution record is already on an earlier file at the same
 * institution, so it need not be produced again.
 */

import { ORGANIZATION, COUNTY } from './_dasm-cluj.mjs'

const G = 'Declarant'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-declaratie-stagiu-cotizare',
  name: 'Declarație — dovada stagiului de cotizare la dosarul anterior',
  title: 'DECLARAȚIE',
  description:
    'Declarație pe proprie răspundere că dovada stagiului de cotizare se află la vechiul dosar de ' +
    'indemnizație sau la dosarul de indemnizație pentru celălalt copil, depusă la Direcția de ' +
    'Asistență Socială și Medicală Cluj-Napoca.',
  category: 'Declarații',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    p.labeledField(ctx, { label: 'Subsemnata/ul (nume și prenume)', name: 'nume_si_prenume', required: true, group: G })
    p.labeledField(ctx, {
      label: 'Domiciliat/ă în municipiul Cluj-Napoca, str.', name: 'adresa', required: true, group: G,
    })
    p.twoColFields(
      ctx,
      { label: 'Nr.', name: 'nr', maxLength: 8, group: G },
      { label: 'Ap.', name: 'ap', maxLength: 8, group: G },
    )
    p.twoColFields(
      ctx,
      { label: 'B.I./C.I. seria și nr.', name: 'act_identitate', required: true, group: G },
      { label: 'CNP', name: 'cnp', required: true, group: G },
    )

    p.paragraph(
      ctx,
      'declar pe proprie răspundere că dovada stagiului de cotizare se află la (bifați):',
      { size: 11, gap: 4 },
    )
    p.checkbox(ctx, { label: 'vechiul dosar de indemnizație;', name: 'vechiul_dosar', group: 'Obiectul declarației' })
    p.checkbox(ctx, {
      label: 'dosarul de indemnizație pentru celălalt copil.',
      name: 'dosar_celalalt_copil',
      group: 'Obiectul declarației',
    })

    p.signatureFooter(ctx)
  },
}

export default spec
