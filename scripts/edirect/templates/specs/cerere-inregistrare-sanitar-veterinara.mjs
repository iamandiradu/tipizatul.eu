/**
 * Phase 3 replica — „Anexa Nr. 6 la norma sanitară veterinară": cerere de
 * înregistrare sanitar-veterinară a unei unități. ANSVSA and its county
 * directorates, 23 files.
 *
 * The form has a distinct letterhead block at the top — operator, CUI, adresa,
 * tel/fax, registration number — printed *above* the word CERERE and filled by
 * the applicant, not the authority. It is reproduced in that position rather
 * than folded into the body, because a clerk reads it as the file's header.
 *
 * "Activități" is a three-row table on paper. Only the first row is required:
 * a unit registering a single activity should not have to defeat two
 * validation errors to submit.
 */

const G_OPERATOR = 'Operatorul economic'
const G_REPREZENTANT = 'Reprezentant legal'
const G_UNITATE = 'Unitatea și activitățile'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'cerere-inregistrare-sanitar-veterinara',
  name: 'Cerere de înregistrare sanitar-veterinară a unității',
  title: 'CERERE',
  description:
    'Cerere de înregistrare sanitar-veterinară a unei unități, adresată ' +
    'direcției sanitar-veterinare și pentru siguranța alimentelor ' +
    '(Anexa nr. 6 la norma sanitară veterinară).',
  category: 'Cereri',

  body(ctx, p) {
    p.paragraph(ctx, 'Anexa Nr. 6 la norma sanitară veterinară', { size: 9, gap: 8 })

    // Letterhead block, as printed above the title on the source.
    p.labeledField(ctx, { label: 'Operatorul economic', name: 'operator', required: true, group: G_OPERATOR, maxLength: 120 })
    p.labeledField(ctx, { label: 'C.U.I. / C.I.F. / C.N.P.', name: 'cui', required: true, group: G_OPERATOR, maxLength: 20 })
    p.labeledField(ctx, { label: 'Adresa', name: 'operator_adresa', required: true, group: G_OPERATOR, maxLength: 160 })
    p.labeledField(ctx, { label: 'Tel./fax', name: 'operator_telefon', group: G_OPERATOR, maxLength: 60 })
    p.twoColFields(
      ctx,
      { label: 'Nr. înregistrare', name: 'nr_inregistrare', group: G_OPERATOR, maxLength: 30 },
      { label: 'Din data', name: 'data_inregistrare', group: G_OPERATOR, validation: 'date' },
    )

    p.labeledField(ctx, {
      label: 'Subsemnatul',
      name: 'reprezentant_nume',
      required: true,
      group: G_REPREZENTANT,
      maxLength: 120,
    })
    p.labeledField(ctx, {
      label: 'Reprezentant legal al',
      name: 'entitate',
      required: true,
      group: G_REPREZENTANT,
      maxLength: 120,
    })
    p.labeledField(ctx, {
      label: 'Cu sediul social în',
      name: 'sediu_social',
      required: true,
      hint: 'Adresa completă, nr. tel., fax.',
      group: G_REPREZENTANT,
      maxLength: 160,
    })

    p.paragraph(ctx, 'Posesor al BI/CI:', { size: 10, gap: 4 })
    p.twoColFields(
      ctx,
      { label: 'Seria', name: 'act_serie', required: true, group: G_REPREZENTANT, maxLength: 10 },
      { label: 'Nr.', name: 'act_numar', required: true, group: G_REPREZENTANT, maxLength: 20 },
    )
    p.labeledField(ctx, { label: 'CNP', name: 'cnp', required: true, group: G_REPREZENTANT, maxLength: 13 })
    p.twoColFields(
      ctx,
      { label: 'Eliberat(ă) de', name: 'act_eliberat_de', required: true, group: G_REPREZENTANT },
      { label: 'La data de', name: 'act_data', group: G_REPREZENTANT, validation: 'date' },
    )

    p.paragraph(
      ctx,
      'prin prezenta solicit înregistrarea sanitar-veterinară a unității:',
      { size: 11, gap: 6 },
    )
    p.labeledField(ctx, { label: 'Unitatea', name: 'unitate', required: true, group: G_UNITATE, maxLength: 120 })
    p.labeledField(ctx, {
      label: 'Din localitatea',
      name: 'unitate_localitate',
      required: true,
      hint: 'Adresa completă a unității.',
      group: G_UNITATE,
      maxLength: 160,
    })

    p.paragraph(ctx, 'Pentru următoarele activități:', { size: 11, gap: 4 })
    for (let i = 1; i <= 3; i++) {
      p.labeledField(ctx, {
        label: `${i}. Activitatea`,
        name: `activitate_${i}`,
        required: i === 1,
        group: G_UNITATE,
        maxLength: 160,
      })
    }

    p.multilineField(
      ctx,
      {
        label: 'La prezenta cerere anexez următoarele documente',
        name: 'documente_anexate',
        group: G_UNITATE,
      },
      { lines: 3 },
    )

    p.labeledField(ctx, { label: 'Data', name: 'data', required: true, group: G_REPREZENTANT, validation: 'date' })
    p.labeledField(ctx, { label: 'Numele și prenumele', name: 'semnatar_nume', required: true, group: G_REPREZENTANT, maxLength: 120 })
    p.labeledField(ctx, { label: 'Semnătura, ștampila', name: 'semnatura', group: G_REPREZENTANT })
  },
}

export default spec
