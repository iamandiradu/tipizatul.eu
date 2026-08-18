/**
 * DASM Cluj-Napoca — cerere de accesare a serviciilor Centrului pentru
 * Prevenirea și Combaterea Violenței în Familie.
 *
 * Replica of `Cerere-CPCVF.odt`. The forms page lists it as "Cerere solicitare
 * servicii CRPC" under Serviciul protecția copilului și familiei, but the
 * document itself is the CPCVF form — the centre named in its letterhead and
 * in the request sentence — so the replica follows the document.
 *
 * The three services are listed as options rather than prose: a victim ticks
 * what they need, and the centre routes the file accordingly.
 */

import { ORGANIZATION, COUNTY, registryLine, gdprNotice } from './_dasm-cluj.mjs'

const CENTRE = 'Centrul pentru Prevenirea și Combaterea Violenței în Familie'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-servicii-violenta-domestica',
  name: 'Cerere servicii — Centrul pentru Prevenirea și Combaterea Violenței în Familie',
  title: 'CERERE',
  description:
    'Cerere de accesare a serviciilor oferite de Centrul pentru Prevenirea și Combaterea ' +
    'Violenței în Familie din cadrul Direcției de Asistență Socială și Medicală Cluj-Napoca ' +
    '(consiliere juridică, psihologică și socială).',
  category: 'Asistență socială',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    registryLine(ctx, p, '803.2')
    p.addressee(ctx, {
      baked: CENTRE,
      bakedAddress:
        'Direcția de Asistență Socială și Medicală Cluj-Napoca · telefon: 0372 799 098 / ' +
        '0736 350 534 · violentainfamilie@dasmclujnapoca.ro',
    })

    const G = 'Date de identificare'
    p.labeledField(ctx, {
      label: 'Subsemnatul/a (nume și prenume)', name: 'nume_si_prenume', required: true, group: G,
    })
    p.labeledField(ctx, {
      label: 'Cu domiciliul/reședința în municipiul Cluj-Napoca, str.',
      name: 'adresa',
      required: true,
      group: G,
    })
    p.labeledField(ctx, { label: 'Nr., bloc, scara, etaj, ap.', name: 'adresa_detalii', group: G })
    p.twoColFields(
      ctx,
      { label: 'C.I./B.I. seria și nr.', name: 'act_identitate', group: G },
      { label: 'CNP', name: 'cnp', required: true, group: G },
    )

    p.paragraph(
      ctx,
      'în calitate de victimă a violenței domestice, solicit accesarea serviciilor oferite de ' +
        'Centrul pentru Prevenirea și Combaterea Violenței în Familie, și anume:',
      { size: 11, gap: 6 },
    )
    const S = 'Servicii solicitate'
    p.checkbox(ctx, { label: 'consiliere juridică;', name: 'consiliere_juridica', group: S })
    p.checkbox(ctx, { label: 'consiliere psihologică;', name: 'consiliere_psihologica', group: S })
    p.checkbox(ctx, { label: 'consiliere socială.', name: 'consiliere_sociala', group: S })

    p.signatureFooter(ctx)
    gdprNotice(ctx, p)
  },
}

export default spec
