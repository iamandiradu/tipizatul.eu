/**
 * DASM Cluj-Napoca — cerere de transcriere a contractului de închiriere
 * (formularul 815.04).
 *
 * The reason for the transcription is mandatory on the source form, and each
 * reason carries its own required detail — date and place of death, the divorce
 * document and the court that issued it, date and place of marriage — so the
 * form footnotes them. They are reproduced as a hint on the reason field.
 */

import { ORGANIZATION, COUNTY } from './_dasm-cluj.mjs'
import {
  locativHeader, locativApplicant, locuintaBlock, declaratieOlografa,
  annexList, emailOptions, locativGdpr,
} from './_dasm-locativ.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-locativ-transcriere-contract',
  name: 'Cerere transcriere contract de închiriere — locuință socială',
  title: 'CERERE',
  description:
    'Cerere adresată Consiliului Local al municipiului Cluj-Napoca, prin Direcția de Asistență ' +
    'Socială și Medicală, pentru transcrierea contractului de închiriere al unei locuințe ' +
    'sociale (deces, divorț, căsătorie etc.).',
  category: 'Fond locativ',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    locativHeader(ctx, p)
    locativApplicant(ctx, p)

    p.paragraph(
      ctx,
      'formulez prezenta CERERE prin care solicit transcrierea contractului de închiriere:',
      { size: 10.5, gap: 6 },
    )
    p.twoColFields(
      ctx,
      { label: 'Contractul de închiriere nr.', name: 'contract_nr', required: true, group: 'Contractul de închiriere' },
      { label: 'Din data de', name: 'contract_data', required: true, group: 'Contractul de închiriere' },
    )
    locuintaBlock(ctx, p)
    p.multilineField(
      ctx,
      {
        label: 'Motivul transcrierii',
        name: 'motiv_transcriere',
        required: true,
        hint:
          'Se indică obligatoriu motivul (deces, divorț, căsătorie etc.). În caz de DECES — data ' +
          'și locul decesului. În caz de DIVORȚ — numărul, data și tipul actului de divorț, ' +
          'precum și instituția care l-a încheiat. În caz de CĂSĂTORIE — data și locul căsătoriei.',
        group: 'Motivul transcrierii',
      },
      { lines: 4 },
    )

    declaratieOlografa(ctx, p, 'transcrierii contractului de închiriere', [
      'Acte doveditoare din care să rezulte că nu se înregistrează debite la plata cheltuielilor ' +
        'comune către asociația de proprietari/locatari/furnizorii de utilități;',
    ])
    annexList(ctx, p)
    emailOptions(ctx, p)
    p.signatureFooter(ctx)
    locativGdpr(ctx, p)
  },
}

export default spec
