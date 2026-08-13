/**
 * Shared body for the pharmacy INSPECTION-request models of Legea farmaciei
 * nr. 266/2008 — „Modelul nr. 4", „Model nr. 10" and „Modelul nr. 13".
 *
 * Distinct from `_dsp-farma.mjs`, which serves Models 2 and 3. Those are
 * *înființare* requests and open with a unit-type section (comunitară /
 * circuit închis / drogherie, urban or rural). These three ask the DSP to
 * schedule an inspection and share a different skeleton:
 *
 *   Către DIRECȚIA DE SĂNĂTATE PUBLICĂ A JUDEȚULUI …
 *   Subsemnatul, … în calitate de … la societatea comercială/unitatea
 *   sanitară …, sediu social, telefon/e-mail, ONRC, cod fiscal
 *   [Models 10 and 13 only: autorizația de funcționare nr. … emisă pentru
 *    farmacia comunitară / cu circuit închis / drogheria de la adresa …]
 *   „vă rog să planificați inspecția …" — the sentence that separates them
 *   [Model 4 only: authorisation-type checkboxes]
 *   Anexez … Legea farmaciei 266/2008 … / Declar pe propria răspundere …
 *   Corespondența: poștă / e-mail
 *   Semnătura, Ștampila
 *
 * Together these three cover 77 files across 213 institutions — every county
 * DSP publishes the same annex models, which is why the fan-out is so wide.
 */

import { representativeBlock } from './_shared.mjs'

const G_UNIT = 'Unitatea farmaceutică'
const G_CORESP = 'Corespondență'

/**
 * @param {object} cfg
 * @param {string}  cfg.model          the annex label, e.g. 'Modelul nr. 13'
 * @param {string}  cfg.requestText    the „vă rog să planificați …" sentence
 * @param {boolean} [cfg.withAutorizatie]  Models 10/13 cite an existing
 *   authorisation; Model 4 is the request that obtains one, so it has none.
 * @param {boolean} [cfg.withUnitTypes]   Model 4 alone chooses what the
 *   authorisation is for.
 * @param {boolean} [cfg.dualSignatory]   Model 4 is signed by BOTH the
 *   administrator/manager and the farmacist-șef.
 * @returns body(ctx, p) for an ArchetypeSpec
 */
export function dspInspectieBody({
  model,
  requestText,
  withAutorizatie = false,
  withUnitTypes = false,
  dualSignatory = false,
}) {
  return (ctx, p) => {
    p.paragraph(ctx, model, { size: 10, gap: 6 })

    p.addressee(ctx, {
      lead: 'Către,',
      label: 'DIRECȚIA DE SĂNĂTATE PUBLICĂ A JUDEȚULUI',
      required: true,
    })

    representativeBlock(ctx, p)

    // Model 4 is submitted jointly: the source signs it "Semnătura
    // administrator/manager" AND "Farmacist-şef", so the second person is part
    // of the request, not an afterthought.
    if (dualSignatory) {
      // The source opens "Subsemnaţii" — plural — and fixes the first
      // signatory's capacity as administrator/manager. Losing that turns a
      // jointly-submitted request into a single-signatory one.
      p.paragraph(
        ctx,
        'Subsemnații, în calitate de administrator/manager, și farmacist-șef / ' +
          'asistent medical de farmacie-șef,',
        { size: 11, gap: 6 },
      )
      p.labeledField(ctx, {
        label: 'Farmacist-șef / asistent medical de farmacie-șef (nume și prenume)',
        name: 'farmacist_sef',
        required: true,
        hint: 'Al doilea semnatar al cererii.',
        group: G_UNIT,
      })
    } else {
      p.labeledField(ctx, {
        label: 'În calitate de',
        name: 'calitate',
        required: true,
        hint: 'Calitatea în care semnați (administrator, manager, farmacist-șef…).',
        group: G_UNIT,
      })
    }

    if (withAutorizatie) {
      p.labeledField(ctx, {
        label: 'Autorizația de funcționare nr.',
        name: 'autorizatie_nr',
        required: true,
        group: G_UNIT,
      })
      p.labeledField(ctx, {
        label: 'Emisă pentru farmacia comunitară / farmacia cu circuit închis / drogheria aflată la adresa',
        name: 'adresa_autorizata',
        required: true,
        group: G_UNIT,
      })
    }

    p.paragraph(ctx, requestText, { size: 11, gap: 8 })

    p.labeledField(ctx, {
      label: 'Adresa sediului la care se solicită inspecția',
      name: 'adresa_inspectie',
      required: true,
      group: G_UNIT,
    })

    if (withUnitTypes) {
      p.paragraph(ctx, 'În vederea obținerii autorizației de funcționare pentru:', {
        size: 11, gap: 4,
      })
      p.checkbox(ctx, { label: 'farmacie comunitară înființată în mediul urban', name: 'cb_fc_urban', group: G_UNIT })
      p.checkbox(ctx, { label: 'farmacie comunitară înființată în mediul rural', name: 'cb_fc_rural', group: G_UNIT })
      p.checkbox(ctx, { label: 'farmacie cu circuit închis', name: 'cb_fci', group: G_UNIT })
      p.checkbox(ctx, { label: 'drogherie', name: 'cb_drogherie', group: G_UNIT })
    }

    p.paragraph(
      ctx,
      'Anexez prezentei cereri documentația solicitată de Legea farmaciei nr. ' +
        '266/2008, republicată, cu modificările și completările ulterioare şi de ' +
        'normele de aplicare a acesteia.',
      { size: 11, gap: 8 },
    )

    p.checkbox(ctx, {
      label:
        'Declar pe propria răspundere că actele în copie sunt conforme cu ' +
        'originalul şi îmi asum responsabilitatea pentru veridicitatea celor ' +
        'susţinute în documentaţia depusă.',
      name: 'declar_conformitate',
      required: true,
      group: G_UNIT,
    })

    p.paragraph(ctx, 'Corespondența în vederea soluționării cererii solicit să se efectueze prin:', {
      size: 11, gap: 4,
    })
    p.checkbox(ctx, { label: 'poștă', name: 'cb_posta', group: G_CORESP })
    p.labeledField(ctx, { label: 'Adresa poștală', name: 'adresa_posta', group: G_CORESP })
    p.checkbox(ctx, { label: 'e-mail', name: 'cb_email', group: G_CORESP })
    p.labeledField(ctx, { label: 'Adresa de e-mail', name: 'adresa_email', group: G_CORESP })

    if (dualSignatory) {
      // Two signature lines, as printed: administrator/manager and
      // farmacist-șef. signatureFooter draws a single one, which would
      // silently drop the co-signatory from the paper form.
      p.twoColFields(
        ctx,
        { label: 'Semnătura administrator/manager', name: 'semnatura_administrator', group: G_UNIT },
        { label: 'Farmacist-șef', name: 'semnatura_farmacist_sef', group: G_UNIT },
      )
      p.labeledField(ctx, { label: 'Data', name: 'data', group: G_UNIT, validation: 'date' })
    } else {
      p.signatureFooter(ctx)
    }

    // Every one of these models ends with a stamp. Institutions reject an
    // unstamped copy, so the box has to be on the printed form.
    p.paragraph(ctx, 'Ștampila', { size: 11, gap: 6 })
  }
}
