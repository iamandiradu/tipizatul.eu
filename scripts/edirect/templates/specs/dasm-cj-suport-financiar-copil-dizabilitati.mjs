/**
 * DASM Cluj-Napoca — cerere pentru acordarea suportului financiar pentru
 * copilul încadrat în grad de handicap.
 *
 * Replica of `Cerere-suport-financiar-pentru-copiii-cu-dizabilitati.pdf`.
 * Unlike the rest of the dizabilități set this one is addressed „Domnule
 * primar" (the benefit is granted by the mayor, administered by DASM), and it
 * carries a second page: the OUG 41/2016 art. 2^1 consent that lets DASM pull
 * supporting documents from other institutions instead of the applicant
 * fetching them. Both pages are reproduced; the annex checklist is kept as
 * options so the applicant can tick what they attached.
 */

import { ORGANIZATION, COUNTY, gdprNotice } from './_dasm-cluj.mjs'

const G = 'Solicitant'
const C = 'Copilul'
const A = 'Anexe'
const D = 'Declarații și consimțământ'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-suport-financiar-copil-dizabilitati',
  name: 'Cerere suport financiar pentru copilul cu dizabilități',
  title: 'CERERE pentru acordarea suportului financiar pentru copil',
  description:
    'Cerere adresată Primarului municipiului Cluj-Napoca, prin Direcția de Asistență Socială ' +
    'și Medicală, pentru acordarea suportului financiar pentru copilul încadrat în grad de ' +
    'handicap. Se depune câte o cerere pentru fiecare copil.',
  category: 'Asistență socială',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    p.paragraph(ctx, 'Domnule primar,', { size: 11.5, gap: 10 })

    p.labeledField(ctx, {
      label: 'Subsemnatul/a (nume și prenume)', name: 'nume_si_prenume', required: true, group: G,
    })
    p.labeledField(ctx, {
      label: 'Domiciliat/ă în municipiul Cluj-Napoca, str.', name: 'adresa', required: true, group: G,
    })
    p.twoColFields(
      ctx,
      { label: 'Nr., bloc, sc., ap.', name: 'adresa_detalii', group: G },
      { label: 'Telefon', name: 'telefon', group: G },
    )
    p.labeledField(ctx, { label: 'E-mail', name: 'email', group: G })
    p.twoColFields(
      ctx,
      { label: 'C.I. seria și nr.', name: 'ci_serie_nr', required: true, group: G },
      { label: 'CNP', name: 'cnp', required: true, group: G },
    )
    p.twoColFields(
      ctx,
      { label: 'Eliberat de', name: 'ci_eliberat_de', group: G },
      { label: 'La data de', name: 'ci_data', group: G },
    )
    p.labeledField(ctx, {
      label: 'Contul bancar (IBAN)',
      name: 'iban',
      required: true,
      hint: 'Contul în care se virează suportul financiar.',
      group: G,
    })
    p.paragraph(ctx, 'în calitate de (bifați):', { size: 11, gap: 4 })
    p.checkbox(ctx, { label: 'părinte;', name: 'calitate_parinte', group: G })
    p.checkbox(ctx, { label: 'reprezentant legal.', name: 'calitate_reprezentant_legal', group: G })

    p.paragraph(
      ctx,
      'vă rog să-mi aprobați acordarea suportului financiar pentru copilul:',
      { size: 11, gap: 8 },
    )

    p.labeledField(ctx, { label: 'Nume și prenume', name: 'copil_nume', required: true, group: C })
    p.twoColFields(
      ctx,
      { label: 'CNP', name: 'copil_cnp', required: true, group: C },
      { label: 'C.N./C.I. seria și nr.', name: 'copil_act_identitate', group: C },
    )
    p.twoColFields(
      ctx,
      { label: 'Eliberat de', name: 'copil_act_eliberat_de', group: C },
      { label: 'La data de', name: 'copil_act_data', group: C },
    )
    p.labeledField(ctx, {
      label: 'Încadrat în grad de handicap',
      name: 'grad_handicap',
      required: true,
      hint: 'Grav, accentuat, mediu sau ușor.',
      group: C,
    })
    p.labeledField(ctx, {
      label: 'Conform certificatului de încadrare nr.', name: 'certificat_nr', required: true, group: C,
    })
    p.twoColFields(
      ctx,
      { label: 'Eliberat de', name: 'certificat_eliberat_de', group: C },
      { label: 'Valabil până la data de', name: 'certificat_valabil', group: C },
    )

    p.paragraph(
      ctx,
      'Prin prezenta mă oblig să aduc la cunoștință, în termen de 10 zile, orice schimbare ' +
        'intervenită în situația copilului de natură a duce la încetarea acordării suportului ' +
        'financiar. Declar pe propria răspundere, sub sancțiunea prevăzută de Codul penal pentru ' +
        'infracțiunea de fals în declarații, că pentru acest copil nu s-a depus altă cerere în ' +
        'vederea acordării suportului financiar.',
      { size: 10, gap: 8 },
    )

    p.checkbox(ctx, {
      label:
        'Îmi exprim în mod expres consimțământul ca DASM să consulte și să prelucreze ' +
        'informațiile, inclusiv datele mele cu caracter personal, înregistrate pe numele ' +
        'subsemnatului în evidențele de la nivelul Municipiului Cluj-Napoca.',
      name: 'consimtamant_evidente',
      required: true,
      group: D,
    })
    p.checkbox(ctx, {
      label:
        'Am luat la cunoștință faptul că, în cazul nefuncționării serverului de e-mail comunicat ' +
        'sau în cazul adresei greșite de e-mail, Direcția de Asistență Socială și Medicală nu ' +
        'poate fi trasă la răspundere pentru acest lucru; mă oblig să comunic instituției orice ' +
        'modificare a adresei de e-mail și îmi exprim consimțământul ca răspunsul să fie ' +
        'comunicat pe adresa indicată mai sus.',
      name: 'consimtamant_email',
      group: D,
    })

    p.paragraph(ctx, 'Anexez prezentei cereri:', { size: 11, gap: 4 })
    p.checkbox(ctx, {
      label: 'certificatul de naștere (copii sub 14 ani) și/sau cartea de identitate (copii peste 14 ani);',
      name: 'anexa_act_copil', group: A,
    })
    p.checkbox(ctx, { label: 'certificatul de încadrare în grad de handicap al copilului;', name: 'anexa_certificat', group: A })
    p.checkbox(ctx, { label: 'cartea de identitate a părintelui/reprezentantului legal;', name: 'anexa_ci_parinte', group: A })
    p.checkbox(ctx, {
      label:
        'hotărârea Comisiei pentru Protecția Copilului/hotărârea judecătorească de plasament, ' +
        'tutelă, încredințare în vederea adopției, de exercitare a autorității părintești și ' +
        'altele asemenea, dacă este cazul;',
      name: 'anexa_hotarare', group: A,
    })
    p.checkbox(ctx, { label: 'extras de cont bancar al beneficiarului/solicitantului.', name: 'anexa_extras_cont', group: A })

    p.signatureFooter(ctx, { signatureLabel: 'Semnătura' })

    p.paragraph(
      ctx,
      'Notă: 1. Pentru copiii aflați în evidențele DASM ca beneficiari ai serviciilor unui ' +
        'asistent personal sau pentru care este stabilit dreptul la indemnizația lunară ' +
        'echivalentă cu salariul net al asistentului personal gradația 0, se depune doar ' +
        'prezentul formular de cerere. 2. În cazul în care în familie sunt doi sau mai mulți ' +
        'copii încadrați în grad de handicap, se completează câte o cerere pentru fiecare copil.',
      { size: 9, gap: 14 },
    )

    // Page 2 — the OUG 41/2016 consent, a separate signed document on the
    // source form.
    p.paragraph(ctx, 'DECLARAȚIE DE CONSIMȚĂMÂNT', { size: 12, gap: 10 })
    const O = 'Declarație de consimțământ (OUG nr. 41/2016)'
    p.labeledField(ctx, { label: 'Subsemnatul/a (nume și prenume)', name: 'decl_nume', required: true, group: O })
    p.twoColFields(
      ctx,
      { label: 'CI/BI seria și nr.', name: 'decl_act_identitate', group: O },
      { label: 'CNP', name: 'decl_cnp', required: true, group: O },
    )
    p.labeledField(ctx, { label: 'Domiciliat/ă în', name: 'decl_adresa', required: true, group: O })
    p.twoColFields(
      ctx,
      { label: 'Cererea nr.', name: 'decl_cerere_nr', group: O },
      { label: 'Din data de', name: 'decl_cerere_data', group: O },
    )
    p.paragraph(
      ctx,
      'în temeiul art. 2^1 alin. (2) din O.U.G. nr. 41/2016 privind stabilirea unor măsuri de ' +
        'simplificare la nivelul administrației publice centrale și locale, consimt ca Direcția ' +
        'de Asistență Socială și Medicală, în vederea soluționării cererii de mai sus, să solicite ' +
        'copii de pe avize sau alte documente emise de alte instituții publice, organe de ' +
        'specialitate ale administrației publice centrale și locale, precum și de persoanele ' +
        'juridice de drept privat care, potrivit legii, au obținut statut de utilitate publică sau ' +
        'sunt autorizate să presteze un serviciu public, în regim de putere publică.',
      { size: 10, gap: 6 },
    )
    p.paragraph(
      ctx,
      'Înțeleg că prelucrarea datelor cu caracter personal se realizează cu respectarea ' +
        'Regulamentului (UE) 2016/679 și că pot reveni oricând asupra consimțământului acordat ' +
        'prin prezenta. Consimțământul este valabil până la exercitarea dreptului de opoziție, ' +
        'printr-o cerere datată și semnată, depusă la sediul Direcției de Asistență Socială și ' +
        'Medicală sau transmisă la adresa dizabilitati@dasmclujnapoca.ro.',
      { size: 10, gap: 8 },
    )
    p.signatureFooter(ctx, { dateLabel: 'Data declarației', signatureLabel: 'Semnătura declarantului' })

    gdprNotice(ctx, p)
  },
}

export default spec
