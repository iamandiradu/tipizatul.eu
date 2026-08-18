/**
 * Phase 3 replica — „Modelul nr. 4" addressed to MINISTERUL SĂNĂTĂȚII,
 * Direcția Farmaceutică și Dispozitive Medicale: cerere de modificare a
 * condițiilor inițiale de autorizare a unei unități farmaceutice. 16 files.
 *
 * Not a duplicate of two neighbours it resembles:
 *   · cerere-dsp-model-4 is also "Modelul nr. 4" but is addressed to a county
 *     DSP and requests an inspection, not an authorisation change.
 *   · cerere-dsp-model-3 is also addressed to the Ministry and also covers
 *     "modificarea condițiilor inițiale", but with a different list — mutare
 *     sediu, reorganizare spațiu, oficină, online, receptură. This one covers
 *     change of holder, vaccination, suspension and annulment. The two lists
 *     are complementary, so both are needed.
 *
 * Signed by the legal representative AND the farmacist-șef, like the DSP
 * inspection models, so both signature lines are reproduced.
 */

const G_REPREZENTANT = 'Reprezentant legal'
const G_UNITATE = 'Unitatea farmaceutică'
const G_MODIF = 'Modificarea solicitată'
const G_CONTACT = 'Date de contact'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'cerere-ms-modificare-autorizatie',
  name: 'Cerere modificare a condițiilor de autorizare a unității farmaceutice',
  title: 'CERERE',
  description:
    'Cerere adresată Ministerului Sănătății — Direcția Farmaceutică și ' +
    'Dispozitive Medicale — pentru modificarea condițiilor inițiale de ' +
    'autorizare a unei unități farmaceutice (Modelul nr. 4, Legea farmaciei ' +
    'nr. 266/2008).',
  category: 'Cereri',

  body(ctx, p) {
    p.paragraph(ctx, 'Modelul nr. 4', { size: 9, gap: 6 })
    p.paragraph(
      ctx,
      'Către, MINISTERUL SĂNĂTĂŢII — DIRECŢIA FARMACEUTICĂ ȘI DISPOZITIVE MEDICALE',
      { size: 11, gap: 10 },
    )

    p.labeledField(ctx, { label: 'Subsemnatul/a (nume și prenume)', name: 'nume_si_prenume', required: true, group: G_REPREZENTANT, maxLength: 120 })
    p.labeledField(ctx, { label: 'În calitate de reprezentant legal al', name: 'denumire_entitate', required: true, group: G_REPREZENTANT, maxLength: 120 })
    p.labeledField(ctx, { label: 'Cu sediul social aflat la adresa', name: 'sediu_social', required: true, group: G_REPREZENTANT, maxLength: 160 })
    p.twoColFields(
      ctx,
      { label: 'Telefon', name: 'telefon', group: G_REPREZENTANT },
      { label: 'E-mail', name: 'email', group: G_REPREZENTANT },
    )
    p.twoColFields(
      ctx,
      { label: 'Nr. înreg. ONRC', name: 'nr_onrc', group: G_REPREZENTANT },
      { label: 'Cod unic de înregistrare / cod fiscal', name: 'cui', required: true, maxLength: 12, group: G_REPREZENTANT },
    )
    p.labeledField(ctx, {
      label: 'Farmacist-șef / asistent medical de farmacie-șef (nume și prenume)',
      name: 'farmacist_sef',
      required: true,
      group: G_REPREZENTANT,
      maxLength: 120,
    })

    p.paragraph(
      ctx,
      'vă rog să emiteți Autorizația de funcționare / Anexă la Autorizația de ' +
        'funcționare, emisă pentru farmacie comunitară / farmacie cu circuit ' +
        'închis / drogherie, pentru modificarea condițiilor inițiale de ' +
        'autorizare, respectiv:',
      { size: 11, gap: 8 },
    )
    p.twoColFields(
      ctx,
      { label: 'Autorizația nr.', name: 'autorizatie_nr', required: true, group: G_UNITATE },
      { label: 'Din data de', name: 'autorizatie_data', group: G_UNITATE, validation: 'date' },
    )

    p.paragraph(ctx, 'Adresa unității farmaceutice:', { size: 10, gap: 4 })
    p.labeledField(ctx, { label: 'Localitate', name: 'unitate_localitate', required: true, group: G_UNITATE })
    p.labeledField(ctx, { label: 'Strada', name: 'unitate_strada', required: true, group: G_UNITATE })
    p.twoColFields(
      ctx,
      { label: 'Nr.', name: 'unitate_nr', group: G_UNITATE, maxLength: 10 },
      { label: 'Bl.', name: 'unitate_bloc', group: G_UNITATE, maxLength: 10 },
    )
    p.twoColFields(
      ctx,
      { label: 'Sc.', name: 'unitate_scara', group: G_UNITATE, maxLength: 6 },
      { label: 'Et.', name: 'unitate_etaj', group: G_UNITATE, maxLength: 6 },
    )
    p.twoColFields(
      ctx,
      { label: 'Ap.', name: 'unitate_apartament', group: G_UNITATE, maxLength: 6 },
      { label: 'Județ', name: 'unitate_judet', required: true, group: G_UNITATE },
    )

    // Thirteen boxes, verbatim. They are the substance of this form — the
    // difference between suspending an activity for 30 days and annulling the
    // authorisation outright is the whole request.
    for (const [key, label] of [
      ['detinator_pj', 'schimbarea deținătorului de autorizație persoană juridică'],
      ['detinator_conducator', 'schimbarea deținătorului de autorizație conducător de unitate farmaceutică'],
      ['farmacist_online', 'schimbarea farmacistului responsabil pentru activitatea online'],
      ['vaccinare', 'activitate opțională de vaccinare'],
      ['adresa_sediu', 'modificarea adresei sediului social'],
      ['desfiintare_oficina', 'desfiinţare oficină comunitară rurală/sezonieră/oficină cu circuit închis'],
      ['incetare_online', 'încetarea activităţii de vânzare și eliberare online a medicamentelor'],
      ['suspendare_30', 'suspendarea activităţii unităţii farmaceutice pe o perioadă mai mică de 30 zile (notificare, fără înscriere mențiune)'],
      ['suspendare_180', 'suspendarea activităţii unităţii farmaceutice pe o perioadă de maxim 180 zile (înscriere mențiune pe anexă la autorizația de funcționare)'],
      ['reluare', 'reluarea activităţii în intervalul de suspendare'],
      ['anulare', 'anularea autorizaţiei de funcţionare'],
      ['desfiintare_optionala', 'desființare activitate opțională'],
      ['actualizare_date', 'actualizare alte date de identificare'],
    ]) {
      p.checkbox(ctx, { label, name: `mod_${key}`, group: G_MODIF })
    }
    p.labeledField(ctx, { label: 'Desființare activitate opțională — care', name: 'desfiintare_optionala_detaliu', group: G_MODIF, maxLength: 160 })
    p.labeledField(ctx, { label: 'Actualizare alte date de identificare — care', name: 'actualizare_date_detaliu', group: G_MODIF, maxLength: 160 })

    p.paragraph(
      ctx,
      'Anexez prezentei cereri documentaţia în conformitate cu Legea farmaciei ' +
        'nr. 266/2008, republicată, cu modificările şi completările ulterioare şi ' +
        'normele de aplicare ale acesteia.',
      { size: 11, gap: 8 },
    )
    p.checkbox(ctx, {
      label:
        'Declar pe propria răspundere că documentele atașate sunt conforme cu ' +
        'originalul şi îmi asum răspunderea pentru veridicitatea acestora.',
      name: 'declar_conformitate',
      required: true,
      group: G_UNITATE,
    })

    p.paragraph(ctx, 'Date de contact pentru corespondența în vederea soluționării cererii:', {
      size: 10, gap: 4,
    })
    p.twoColFields(
      ctx,
      { label: 'E-mail', name: 'corespondenta_email', required: true, group: G_CONTACT },
      { label: 'Telefon', name: 'corespondenta_telefon', group: G_CONTACT },
    )

    p.twoColFields(
      ctx,
      { label: 'Reprezentant legal — nume, prenume', name: 'semnatar_reprezentant', required: true, group: G_REPREZENTANT },
      { label: 'Semnătura', name: 'semnatura_reprezentant', group: G_REPREZENTANT },
    )
    p.twoColFields(
      ctx,
      { label: 'Farmacist-șef / asistent medical de farmacie-șef — nume, prenume', name: 'semnatar_farmacist', group: G_REPREZENTANT },
      { label: 'Semnătura', name: 'semnatura_farmacist', group: G_REPREZENTANT },
    )
  },
}

export default spec
