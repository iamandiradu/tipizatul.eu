/**
 * Archetype #13 — Împuternicire (procură simplă / delegație).
 *
 * Non-notarial representation before authorities, where the law permits it.
 * Two-party: mandant (who empowers) + mandatar (who represents). Near-absent
 * in the eDirect catalog but top-5 on the Google most-used list.
 */

import { partyBlock } from './_shared.mjs'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'imputernicire',
  name: 'Împuternicire',
  title: 'ÎMPUTERNICIRE',
  description:
    'Împuternicire simplă (delegație) pentru reprezentare în fața unei ' +
    'instituții sau autorități, acolo unde legea nu cere formă notarială.',
  category: 'Declarații',

  body(ctx, p) {
    partyBlock(ctx, p, { prefix: 'mandant', heading: 'Subsemnatul/a (mandant):' })

    p.paragraph(ctx, 'împuternicesc prin prezenta pe:', { size: 11, gap: 6 })

    partyBlock(ctx, p, { prefix: 'mandatar', heading: 'Mandatar:' })

    p.labeledField(ctx, {
      label: 'Să mă reprezinte la / în fața',
      name: 'institutia_reprezentare',
      required: true,
      hint: 'Instituția sau entitatea în fața căreia are loc reprezentarea.',
      group: 'Obiectul împuternicirii',
    })

    p.multilineField(
      ctx,
      {
        label: 'În scopul / pentru următoarele operațiuni',
        name: 'obiectul_imputernicirii',
        required: true,
        group: 'Obiectul împuternicirii',
      },
      { lines: 5 },
    )

    p.labeledField(ctx, {
      label: 'Valabilitatea împuternicirii (perioada)',
      name: 'valabilitate',
      group: 'Obiectul împuternicirii',
    })

    p.paragraph(
      ctx,
      'Mandatarul va semna în numele meu și pentru mine, semnătura sa ' +
        'fiindu-mi pe deplin opozabilă, în limitele prezentei împuterniciri.',
      { size: 10.5, gap: 10 },
    )

    p.labeledField(ctx, { label: 'Data', name: 'data', group: 'Semnături' })
    p.twoColFields(
      ctx,
      { label: 'Semnătura mandant', name: 'semnatura_mandant', group: 'Semnături' },
      { label: 'Semnătura mandatar', name: 'semnatura_mandatar', group: 'Semnături' },
    )
  },
}

export default spec
