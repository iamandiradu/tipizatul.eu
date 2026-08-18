/**
 * DASM Cluj-Napoca — cerere de înscriere în programul multianual de
 * stomatologie pentru populația defavorizată (H.C.L. nr. 596/2021).
 *
 * Replica of `Cerere-inscriere-in-programul-stomatologic.pdf`. Eligibility is
 * a closed list of four categories with their own income ceilings, printed on
 * the form — reproduced as options, since which one applies decides what proof
 * of income has to be attached. The exclusion-asset list printed on the back
 * of the source (Anexa nr. 4 la H.G. 1154/2022) is what the applicant declares
 * they have read, so it is reproduced under the declaration.
 */

import {
  ORGANIZATION, COUNTY, SERVICES, dasmAddressee,
} from './_dasm-cluj.mjs'

const G = 'Date de identificare'
const C = 'Categoria în care mă încadrez'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-inscriere-program-stomatologic',
  name: 'Cerere înscriere în programul stomatologic',
  title: 'CERERE DE ÎNSCRIERE ÎN PROGRAMUL STOMATOLOGIC',
  description:
    'Cerere adresată Direcției de Asistență Socială și Medicală Cluj-Napoca pentru înscrierea în ' +
    'programul multianual „Promovarea sănătății orale prin creșterea accesibilității populației ' +
    'defavorizate la servicii de stomatologie", aprobat prin H.C.L. nr. 596/2021.',
  category: 'Asistență socială',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    p.paragraph(ctx, 'Nr. înreg. ______________   Din data ______________', { size: 10, gap: 12 })
    dasmAddressee(ctx, p, SERVICES.protectieSociala)

    p.labeledField(ctx, {
      label: 'Subsemnatul/a (nume și prenume)', name: 'nume_si_prenume', required: true, group: G,
    })
    p.labeledField(ctx, {
      label: 'Domiciliat/ă în municipiul Cluj-Napoca, strada', name: 'adresa', required: true, group: G,
    })
    p.labeledField(ctx, { label: 'Nr., bl., ap.', name: 'adresa_detalii', group: G })
    p.combField(ctx, { label: 'CNP', name: 'cnp', required: true, group: G }, { cells: 13 })
    p.twoColFields(
      ctx,
      { label: 'B.I./C.I. seria și nr.', name: 'act_identitate', required: true, group: G },
      { label: 'Eliberat de', name: 'ci_eliberat_de', group: G },
    )
    p.twoColFields(
      ctx,
      { label: 'La data de', name: 'ci_data', group: G },
      { label: 'Telefon de contact', name: 'telefon', required: true, group: G },
    )

    p.paragraph(
      ctx,
      'solicit prin prezenta înscrierea în programul multianual „Promovarea sănătății orale prin ' +
        'creșterea accesibilității populației defavorizate la servicii de stomatologie", program ' +
        'în parteneriat cu Universitatea de Medicină și Farmacie „Iuliu Hațieganu" și Spitalul ' +
        'Clinic Județean de Urgență Cluj-Napoca, aprobat prin H.C.L. nr. 596/2021, astfel cum a ' +
        'fost modificată prin H.C.L. nr. 521/2024, H.C.L. nr. 62/2025 și H.C.L. nr. 478/2025.',
      { size: 10.5, gap: 8 },
    )

    p.checkbox(ctx, {
      label:
        'Declar pe propria răspundere că nu dețin niciunul din bunurile ce duc la excluderea ' +
        'persoanelor din cadrul programului și că am luat la cunoștință lista acestor bunuri.',
      name: 'declaratie_bunuri',
      required: true,
      group: 'Declarații',
    })

    p.paragraph(ctx, 'Menționez că mă încadrez în categoria:', { size: 11, gap: 4 })
    p.checkbox(ctx, {
      label:
        'pensionar cu venituri cumulate din pensii și alte drepturi de asigurări sociale de până ' +
        'la 2.100 lei;',
      name: 'categorie_pensionar', group: C,
    })
    p.checkbox(ctx, {
      label:
        'șomer care beneficiază de indemnizație de șomaj de până la 700 lei sau șomer ' +
        'neindemnizat, aflat în evidențele AJOFM;',
      name: 'categorie_somer', group: C,
    })
    p.checkbox(ctx, {
      label: 'persoană cu dizabilități — handicap grav sau accentuat;',
      name: 'categorie_dizabilitati', group: C,
    })
    p.checkbox(ctx, { label: 'beneficiar de V.M.I. / cantină.', name: 'categorie_vmi_cantina', group: C })

    p.labeledField(ctx, {
      label: 'Realizez un venit lunar net de (lei)', name: 'venit_lunar_net', required: true, group: C,
    })

    p.paragraph(
      ctx,
      'Anexez prezentei copii ale actelor de identitate și acte doveditoare de venit. Pentru ' +
        'mijloacele de transport deținute de persoanele cuprinse în cerere se atașează și o copie ' +
        'după certificatul de înmatriculare.',
      { size: 9.5, gap: 8 },
    )

    p.signatureFooter(ctx)

    p.paragraph(
      ctx,
      'LISTA BUNURILOR care conduc la excluderea persoanelor din cadrul programului ' +
        '(Anexa nr. 4 la H.G. nr. 1154/2022 — Normele metodologice de aplicare a Legii nr. 196/2016 ' +
        'privind venitul minim de incluziune)',
      { size: 9.5, gap: 6 },
    )
    p.paragraph(
      ctx,
      'A. Bunuri imobile: clădiri, alte spații locative în afara locuinței de domiciliu, precum și ' +
        'terenuri situate în intravilan cu suprafața de peste 1.200 mp în zona urbană și 2.500 mp ' +
        'în zona rurală, în afara terenurilor de împrejmuire a locuinței și a curții aferente.',
      { size: 8.5, gap: 3 },
    )
    p.paragraph(
      ctx,
      'B. Bunuri mobile: mai mult de un vehicul cu o vechime mai mare de 10 ani, cu drept de ' +
        'circulație pe drumurile publice; autovehicul cu drept de circulație pe drumurile publice ' +
        'cu o vechime mai mică de 10 ani, cu excepția celor utilizate și/sau adaptate pentru ' +
        'transportul persoanelor cu dizabilități; șalupe, bărci cu motor, iahturi sau alte tipuri ' +
        'de ambarcațiuni, cu excepția celor necesare pentru transport în cazul persoanelor care ' +
        'locuiesc în aria Rezervației Biosferei „Delta Dunării".',
      { size: 8.5, gap: 3 },
    )
    p.paragraph(
      ctx,
      'C. Depozite bancare: cel puțin unul dintre membrii familiei deține, în calitate de titular, ' +
        'unul sau mai multe conturi/depozite bancare a căror sumă totală este mai mare de 3 ori ' +
        'față de valoarea câștigului salarial mediu brut prevăzut de Legea asigurărilor sociale de stat.',
      { size: 8.5, gap: 3 },
    )
    p.paragraph(
      ctx,
      'Menționez faptul că am fost informat/ă cu privire la Regulamentul (UE) nr. 679/2016 privind ' +
        'protecția persoanelor fizice în ceea ce privește prelucrarea datelor cu caracter personal, ' +
        'pus în aplicare prin Legea nr. 190/2018.',
      { size: 8, gap: 0 },
    )
  },
}

export default spec
