/**
 * Shared building blocks for the "cerere" archetype family. The applicant
 * identity block (nume, CNP, contact, domiciliu) is identical across
 * cerere-tip / cerere / cerere-dsp / cerere-si-declaratie / cerere-recunoastere
 * / cerere-eliberare-certificat, so it lives here and each spec composes it.
 */

const GROUP = 'Date de identificare'

/**
 * Applicant identity block: name, CNP + phone, address, locality + county,
 * e-mail. Field names align with romanian-patterns (cnp, telefon, …).
 * @param {import('../lib/author.mjs').AuthorCtx} ctx
 * @param {object} p  layout primitives
 * @param {object} [opts]
 * @param {boolean} [opts.email=true]          include the e-mail row
 * @param {boolean} [opts.actIdentitate=false] include the CI serie/nr row —
 *   the coverage sampling's class-B gap (many institutional forms identify
 *   the applicant by B.I./C.I. on top of CNP)
 */
export function identityBlock(ctx, p, { email = true, actIdentitate = false } = {}) {
  p.labeledField(ctx, {
    label: 'Subsemnatul/a (nume și prenume)',
    name: 'nume_si_prenume',
    required: true,
    hint: 'Numele complet, conform actului de identitate.',
    group: GROUP,
  })

  p.twoColFields(
    ctx,
    { label: 'CNP', name: 'cnp', required: true, group: GROUP },
    { label: 'Telefon', name: 'telefon', group: GROUP },
  )

  if (actIdentitate) {
    p.labeledField(ctx, {
      label: 'Act de identitate B.I./C.I. (serie și număr)',
      name: 'act_identitate',
      group: GROUP,
    })
  }

  p.labeledField(ctx, {
    label: 'Domiciliul (stradă, nr., bloc, ap.)',
    name: 'adresa',
    required: true,
    group: GROUP,
  })

  p.twoColFields(
    ctx,
    { label: 'Localitatea', name: 'localitate', group: GROUP },
    { label: 'Județul', name: 'judet', group: GROUP },
  )

  if (email) {
    p.labeledField(ctx, {
      label: 'E-mail',
      name: 'email',
      hint: 'Pentru a primi răspunsul instituției pe cale electronică.',
      group: GROUP,
    })
  }
}

/**
 * Named-party identity block for two-party documents (împuternicire,
 * contract de comodat): same rows as declarantBlock but with a heading and
 * prefixed field names so two parties coexist in one form.
 * @param {import('../lib/author.mjs').AuthorCtx} ctx
 * @param {object} p
 * @param {object} cfg
 * @param {string} cfg.prefix   field-name prefix (e.g. 'mandant')
 * @param {string} cfg.heading  drawn above the block (e.g. 'I. Comodantul')
 * @param {string} [cfg.group]  Template JSON group; defaults to heading
 */
export function partyBlock(ctx, p, { prefix, heading, group }) {
  const G = group ?? heading

  p.paragraph(ctx, heading, { size: 11.5, gap: 4 })

  p.labeledField(ctx, {
    label: 'Nume și prenume',
    name: `${prefix}_nume`,
    required: true,
    group: G,
  })

  p.twoColFields(
    ctx,
    { label: 'CNP', name: `${prefix}_cnp`, required: true, group: G },
    { label: 'Act identitate (serie, nr.)', name: `${prefix}_act_identitate`, group: G },
  )

  p.labeledField(ctx, {
    label: 'Domiciliul (stradă, nr., bloc, ap.)',
    name: `${prefix}_adresa`,
    required: true,
    group: G,
  })

  p.twoColFields(
    ctx,
    { label: 'Localitatea', name: `${prefix}_localitate`, group: G },
    { label: 'Județul', name: `${prefix}_judet`, group: G },
  )
}

/**
 * Legal-representative identity block — the applicant is a company/entity
 * acting through its legal representative. The coverage sampling
 * (COVERAGE-SAMPLE.md) found ~59% of the "cerere tip" cluster opens with
 * exactly this: „Subsemnatul …, în calitate de reprezentant legal al …, cu
 * sediul social …, ONRC …, CUI …".
 * @param {import('../lib/author.mjs').AuthorCtx} ctx
 * @param {object} p
 */
export function representativeBlock(ctx, p) {
  const G = 'Reprezentant și entitate'

  p.labeledField(ctx, {
    label: 'Subsemnatul/a (nume și prenume)',
    name: 'nume_si_prenume',
    required: true,
    hint: 'Numele complet al reprezentantului legal.',
    group: G,
  })

  p.labeledField(ctx, {
    label: 'În calitate de reprezentant legal al (denumirea entității)',
    name: 'denumire_entitate',
    required: true,
    group: G,
  })

  p.labeledField(ctx, {
    label: 'Sediul social (adresa)',
    name: 'sediu_social',
    required: true,
    group: G,
  })

  p.twoColFields(
    ctx,
    { label: 'Telefon', name: 'telefon', group: G },
    { label: 'E-mail', name: 'email', group: G },
  )

  p.twoColFields(
    ctx,
    { label: 'Nr. înreg. ONRC', name: 'nr_onrc', group: G },
    // maxLength 12, not the cui-pattern's 10: VAT-registered entities write
    // the RO prefix ("RO" + up to 10 digits).
    { label: 'CUI / Cod fiscal', name: 'cui', required: true, maxLength: 12, group: G },
  )
}

/**
 * Declarant identity block — used by the declaration family. Differs from
 * `identityBlock` by carrying the identity-document fields (CI serie/nr) a
 * declaration needs to identify the signatory, and dropping the contact rows.
 * @param {import('../lib/author.mjs').AuthorCtx} ctx
 * @param {object} p
 */
export function declarantBlock(ctx, p) {
  p.labeledField(ctx, {
    label: 'Subsemnatul/a (nume și prenume)',
    name: 'nume_si_prenume',
    required: true,
    hint: 'Numele complet, conform actului de identitate.',
    group: GROUP,
  })

  p.twoColFields(
    ctx,
    { label: 'CNP', name: 'cnp', required: true, group: GROUP },
    { label: 'Act identitate (serie, nr.)', name: 'act_identitate', group: GROUP },
  )

  p.labeledField(ctx, {
    label: 'Domiciliul (stradă, nr., bloc, ap.)',
    name: 'adresa',
    required: true,
    group: GROUP,
  })

  p.twoColFields(
    ctx,
    { label: 'Localitatea', name: 'localitate', group: GROUP },
    { label: 'Județul', name: 'judet', group: GROUP },
  )
}
