/**
 * DASM Cluj-Napoca — cerere pentru acordarea tichetului social pe suport
 * electronic pentru nou-născuți (O.U.G. nr. 34/2024).
 *
 * Replica of `CERERE-TICHETE-NOU-NASCUTI-SPCF.odt` ("Anexa 1"). Eligibility is
 * a closed list of six categories and each one is proved by a different
 * document, so both lists are reproduced as options — which category the
 * mother ticks decides what she must attach.
 */

import { ORGANIZATION, COUNTY } from './_dasm-cluj.mjs'

const G = 'Date de identificare'
const C = 'Categoria în care mă încadrez'
const D = 'Documente doveditoare anexate'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-tichete-nou-nascuti',
  name: 'Cerere tichete sociale pentru nou-născuți (O.U.G. 34/2024)',
  title: 'CERERE pentru acordarea tichetului social pe suport electronic pentru nou-născuți',
  description:
    'Cerere adresată Direcției de Asistență Socială și Medicală Cluj-Napoca pentru acordarea ' +
    'tichetelor sociale pe suport electronic pentru nou-născuți, conform O.U.G. nr. 34/2024.',
  category: 'Asistență socială',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    p.paragraph(ctx, 'Anexa 1', { size: 9, gap: 10 })

    p.labeledField(ctx, {
      label: 'Subsemnata (nume și prenume)', name: 'nume_si_prenume', required: true, group: G,
    })
    p.combField(ctx, { label: 'CNP', name: 'cnp', required: true, group: G }, { cells: 13 })
    p.twoColFields(
      ctx,
      { label: 'C.I. seria și nr.', name: 'ci_serie_nr', required: true, group: G },
      { label: 'Eliberată de', name: 'ci_eliberat_de', group: G },
    )
    p.twoColFields(
      ctx,
      { label: 'La data de', name: 'ci_data', group: G },
      { label: 'Valabilă până la', name: 'ci_valabilitate', group: G },
    )
    p.labeledField(ctx, {
      label: 'Domiciliul/reședința în Cluj-Napoca, str.', name: 'adresa', required: true, group: G,
    })
    p.twoColFields(
      ctx,
      { label: 'Nr.', name: 'nr', maxLength: 8, group: G },
      { label: 'Ap.', name: 'ap', maxLength: 8, group: G },
    )
    p.twoColFields(
      ctx,
      { label: 'Telefon', name: 'telefon', group: G },
      { label: 'E-mail', name: 'email', group: G },
    )

    p.paragraph(
      ctx,
      'Solicit aprobarea acordării tichetelor sociale pe suport electronic pentru nou-născuți, ' +
        'deoarece sunt mama copilului:',
      { size: 11, gap: 6 },
    )
    p.labeledField(ctx, { label: 'Copilul (nume și prenume)', name: 'copil_nume', required: true, group: 'Copilul' })
    p.combField(ctx, { label: 'CNP copil', name: 'copil_cnp', required: true, group: 'Copilul' }, { cells: 13 })

    p.paragraph(ctx, 'și sunt (bifați categoria care corespunde situației dumneavoastră):', { size: 11, gap: 4 })
    p.checkbox(ctx, {
      label:
        'beneficiară căreia îi este stabilit, prin dispoziție scrisă a primarului, dreptul la ' +
        'oricare din componentele venitului minim de incluziune, în baza Legii nr. 196/2016, cu ' +
        'modificările și completările ulterioare;',
      name: 'categorie_vmi', group: C,
    })
    p.checkbox(ctx, { label: 'persoană cu dizabilități;', name: 'categorie_dizabilitati', group: C })
    p.checkbox(ctx, {
      label:
        'persoană aflată temporar în situații critice de viață, respectiv victimă a ' +
        'calamităților, a violenței domestice, aflată în situații deosebite de vulnerabilitate ' +
        'sau în alte situații de risc, stabilite prin ancheta socială;',
      name: 'categorie_situatie_critica', group: C,
    })
    p.checkbox(ctx, { label: 'persoană ce nu deține acte de identitate;', name: 'categorie_fara_acte', group: C })
    p.checkbox(ctx, { label: 'minoră;', name: 'categorie_minora', group: C })
    p.checkbox(ctx, {
      label: 'cetățean străin/apatrid provenit din zone de conflict armat.',
      name: 'categorie_conflict_armat', group: C,
    })

    p.paragraph(ctx, 'Documentele care fac dovada celor declarate mai sus:', { size: 11, gap: 4 })
    p.checkbox(ctx, {
      label: 'cartea de identitate (exceptând persoanele care nu dețin acte de identitate);',
      name: 'doc_carte_identitate', group: D,
    })
    p.checkbox(ctx, { label: 'certificatul de naștere al copilului;', name: 'doc_certificat_nastere', group: D })
    p.checkbox(ctx, { label: 'certificatul de încadrare în grad de handicap;', name: 'doc_certificat_handicap', group: D })
    p.checkbox(ctx, { label: 'dovada că sunt victimă a calamităților;', name: 'doc_calamitati', group: D })
    p.checkbox(ctx, { label: 'dovada că sunt victimă a violenței domestice.', name: 'doc_violenta_domestica', group: D })

    p.paragraph(
      ctx,
      'Declar că am fost informată cu privire la prelucrarea datelor mele cu caracter personal ' +
        'în scopul îndeplinirii atribuțiilor legale ale instituției. Am luat la cunoștință că ' +
        'informațiile din cererea depusă și din documentele anexate vor fi prelucrate de către ' +
        'Direcția de Asistență Socială și Medicală cu respectarea prevederilor Regulamentului ' +
        '(UE) 2016/679.',
      { size: 9.5, gap: 8 },
    )

    p.signatureFooter(ctx)
  },
}

export default spec
