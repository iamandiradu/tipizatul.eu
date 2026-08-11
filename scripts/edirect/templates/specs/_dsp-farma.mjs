/**
 * Shared body for the national pharmacy-unit forms „Modelul nr. 2" and
 * „Modelul nr. 3" (Legea farmaciei nr. 266/2008 annex models). The two are
 * verbatim-identical across every county DSP in the catalog — the coverage
 * sampling found they alone account for ~45% of the "cerere tip" cluster —
 * and differ only in addressee, the request sentence, and one extra checkbox
 * in Model 3. Authored as faithful replicas, not approximations.
 */

import { representativeBlock } from './_shared.mjs'

const G_TIP = 'Tipul solicitării'
const G_UNIT = 'Unitatea farmaceutică'

/**
 * @param {object} cfg
 * @param {string}   cfg.requestText   the „vă rog să …" sentence (differs M2/M3)
 * @param {boolean} [cfg.withReluare]  Model 3 carries the extra „reluarea
 *                                     activității în perioada de suspendare" option
 * @returns body(ctx, p) for an ArchetypeSpec
 */
export function dspFarmaBody({ requestText, withReluare = false }) {
  return (ctx, p) => {
    representativeBlock(ctx, p)

    p.labeledField(ctx, {
      label: 'Farmacist-șef / asistent medical de farmacie-șef (nume și prenume)',
      name: 'farmacist_sef',
      required: true,
      group: G_UNIT,
    })

    p.paragraph(ctx, requestText, { size: 11, gap: 8 })

    p.labeledField(ctx, {
      label: 'Adresa unității farmaceutice',
      name: 'adresa_unitate',
      required: true,
      group: G_UNIT,
    })

    p.paragraph(ctx, '1. Înființare unitate farmaceutică:', { size: 11, gap: 4 })
    const UNIT_TYPES = [
      ['farmacie comunitară', 'fc'],
      ['farmacie cu circuit închis', 'fci'],
      ['drogherie', 'dr'],
    ]
    for (const [label, key] of UNIT_TYPES) {
      p.checkbox(ctx, { label, name: `cb_${key}`, group: G_TIP })
      p.checkbox(ctx, { label: 'în mediul urban', name: `cb_${key}_urban`, group: G_TIP, indent: 22 })
      p.checkbox(ctx, { label: 'în mediul rural', name: `cb_${key}_rural`, group: G_TIP, indent: 22 })
    }

    p.paragraph(ctx, '2. Modificarea condițiilor inițiale de autorizare, respectiv:', {
      size: 11, gap: 4,
    })
    p.checkbox(ctx, {
      label: 'mutare sediu social cu activitate sau a punctului de lucru al unității farmaceutice',
      name: 'cb_mutare_sediu', group: G_TIP,
    })
    p.checkbox(ctx, {
      label: 'modificare/reorganizare spațiu unitate farmaceutică',
      name: 'cb_modificare_spatiu', group: G_TIP,
    })
    p.checkbox(ctx, {
      label: 'înființare oficină comunitară rurală/sezonieră/oficină cu circuit închis',
      name: 'cb_infiintare_oficina', group: G_TIP,
    })
    p.checkbox(ctx, {
      label: 'activitate de vânzare și eliberare online a medicamentelor',
      name: 'cb_vanzare_online', group: G_TIP,
    })
    p.checkbox(ctx, {
      label: 'activitate de receptură și laborator',
      name: 'cb_receptura_laborator', group: G_TIP,
    })
    if (withReluare) {
      p.checkbox(ctx, {
        label: 'reluarea activității în perioada de suspendare, cu mutare',
        name: 'cb_reluare_activitate', group: G_TIP,
      })
    }
    p.checkbox(ctx, {
      label: 'desființare activitate opțională (precizați mai jos)',
      name: 'cb_desfiintare_activitate', group: G_TIP,
    })
    p.labeledField(ctx, {
      label: 'Activitatea opțională desființată',
      name: 'activitate_desfiintata',
      group: G_TIP,
    })

    p.paragraph(
      ctx,
      'Anexez prezentei cereri documentația în conformitate cu Legea farmaciei ' +
        'nr. 266/2008, republicată, cu modificările și completările ulterioare, ' +
        'și normele de aplicare ale acesteia. Declar pe propria răspundere că ' +
        'documentele atașate sunt conforme cu originalul și îmi asum răspunderea ' +
        'pentru veridicitatea acestora.',
      { size: 10.5, gap: 10 },
    )

    p.paragraph(ctx, 'Date de contact pentru corespondență în vederea soluționării cererii:', {
      size: 11, gap: 4,
    })
    p.twoColFields(
      ctx,
      { label: 'E-mail', name: 'email_corespondenta', group: 'Corespondență' },
      { label: 'Telefon', name: 'telefon_corespondenta', group: 'Corespondență' },
    )

    p.twoColFields(
      ctx,
      { label: 'Semnătura reprezentant legal', name: 'semnatura_reprezentant', group: 'Semnături' },
      { label: 'Semnătura farmacist-șef', name: 'semnatura_farmacist', group: 'Semnături' },
    )
  }
}
