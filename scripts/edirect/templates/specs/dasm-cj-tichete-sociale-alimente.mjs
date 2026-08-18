/**
 * DASM Cluj-Napoca — cerere și declarație pe propria răspundere pentru
 * tichetele sociale pe suport electronic din Programul social „Alimente".
 *
 * Replica of `cerere-si-declaratie-tichete-sociale.pdf`, listed both under
 * Serviciul protecție socială and under Serviciul asistența persoanelor
 * vârstnice. Three documents printed on one sheet, all reproduced:
 *   A. the request, with the six eligibility categories,
 *   B. the means declaration on the back (household grid + asset list),
 *   C. the OUG 41/2016 consent.
 */

import { ORGANIZATION, COUNTY } from './_dasm-cluj.mjs'

const G = 'Date de identificare'
const C = 'Categoria în care se încadrează solicitantul sau un membru al familiei'
const B = 'Bunuri deținute'
const O = 'Declarație de consimțământ (OUG nr. 41/2016)'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-tichete-sociale-alimente',
  name: 'Cerere și declarație — tichete sociale, Programul social „Alimente"',
  title: 'CERERE ȘI DECLARAȚIE PE PROPRIA RĂSPUNDERE',
  description:
    'Cerere adresată Direcției de Asistență Socială și Medicală Cluj-Napoca pentru acordarea ' +
    'tichetelor sociale pe suport electronic în cadrul Programului social „Alimente", împreună cu ' +
    'declarația pe propria răspundere privind componența familiei, veniturile și bunurile deținute.',
  category: 'Asistență socială',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    p.paragraph(ctx, 'A. CERERE', { size: 11.5, gap: 8 })

    p.labeledField(ctx, { label: 'Subsemnatul/a (nume și prenume)', name: 'nume_si_prenume', required: true, group: G })
    p.combField(ctx, { label: 'CNP', name: 'cnp', required: true, group: G }, { cells: 13 })
    p.labeledField(ctx, {
      label: 'Cu domiciliul/reședința în Cluj-Napoca, str.', name: 'adresa', required: true, group: G,
    })
    p.twoColFields(
      ctx,
      { label: 'Nr., ap.', name: 'adresa_detalii', group: G },
      { label: 'Telefon', name: 'telefon', required: true, group: G },
    )

    p.paragraph(
      ctx,
      'în calitate de persoană singură / reprezentant al unei familii în care există cel puțin o ' +
        'persoană aflată în una dintre următoarele situații (bifați caseta corespunzătoare):',
      { size: 10.5, gap: 4 },
    )
    p.checkbox(ctx, {
      label: 'persoane cu handicap grav sau accentuat, neinstituționalizate;',
      name: 'categorie_handicap', group: C,
    })
    p.checkbox(ctx, {
      label:
        'pensionari, invalizi, veterani, văduve de război, persoane deportate, prizonieri, ' +
        'persecutați politic, eroi martiri ai revoluției, orfani, ale căror venituri nete lunare ' +
        'pentru persoana singură sunt de până la 2.600 lei și de până la 1.700 lei/membru de familie;',
      name: 'categorie_pensionari', group: C,
    })
    p.checkbox(ctx, {
      label:
        'șomeri înregistrați (cu/fără indemnizație de șomaj) ale căror venituri nete lunare pentru ' +
        'persoana singură sunt de până la 2.600 lei și de până la 1.700 lei/membru de familie;',
      name: 'categorie_someri', group: C,
    })
    p.checkbox(ctx, { label: 'beneficiari de venit minim de incluziune;', name: 'categorie_vmi', group: C })
    p.checkbox(ctx, { label: 'victimă a traficului de persoane;', name: 'categorie_trafic', group: C })
    p.checkbox(ctx, { label: 'victimă a violenței domestice.', name: 'categorie_violenta', group: C })

    p.paragraph(
      ctx,
      'Vă rog să-mi aprobați acordarea tichetelor sociale pe suport electronic în cadrul ' +
        'Programului social „Alimente". Declar pe propria răspundere că nu am obligații de plată ' +
        'față de bugetul local.',
      { size: 10.5, gap: 6 },
    )
    p.checkbox(ctx, {
      label:
        'Declar că îmi dau consimțământul în mod expres în ceea ce privește prelucrarea datelor ' +
        'mele cu caracter personal, cu scopul acordării tichetelor sociale în cadrul Programului ' +
        'social „Alimente". Am fost informat/ă cu privire la Regulamentul (UE) nr. 679/2016, pus ' +
        'în aplicare prin Legea nr. 190/2018.',
      name: 'consimtamant_prelucrare',
      required: true,
      group: 'Declarații',
    })

    p.paragraph(ctx, 'Anexez următoarele documente doveditoare:', { size: 10.5, gap: 4 })
    for (let i = 1; i <= 8; i++) {
      p.labeledField(ctx, { label: `${i}.`, name: `document_${i}`, group: 'Documente anexate' })
    }
    p.signatureFooter(ctx)

    // ── Verso ────────────────────────────────────────────────────────────────
    p.paragraph(ctx, 'B. DECLARAȚIE PE PROPRIA RĂSPUNDERE', { size: 11.5, gap: 8 })
    p.paragraph(
      ctx,
      'Subsemnatul/a, identificat/ă mai sus, declar pe propria răspundere componența familiei ' +
        'mele, veniturile nete lunare și bunurile imobile și mobile deținute de mine și de membrii ' +
        'familiei mele, conform celor de mai jos:',
      { size: 10, gap: 6 },
    )
    p.paragraph(
      ctx,
      'I. Componența familiei mele și veniturile nete lunare realizate de fiecare membru ' +
        '(se completează începând cu titularul cererii):',
      { size: 10, gap: 4 },
    )
    p.table(ctx, {
      name: 'membru',
      rows: 8,
      group: 'Componența familiei',
      columns: [
        { header: 'Numele și prenumele', key: 'nume' },
        { header: 'CNP', key: 'cnp', width: 92, maxLength: 13 },
        { header: 'Grad de rudenie', key: 'rudenie', width: 74 },
        { header: 'Ocupația', key: 'ocupatie', width: 74 },
        { header: 'Venituri', key: 'venituri', width: 62 },
      ],
    })
    p.labeledField(ctx, { label: 'Total venituri (lei)', name: 'total_venituri', required: true, group: 'Componența familiei' })
    p.paragraph(
      ctx,
      'Grad de rudenie: soț, soție, fiu, fiică etc. Ocupația: salariat, elev, student, pensionar, ' +
        'șomer etc. În situația existenței mai multor surse de venituri la aceeași persoană, ' +
        'acestea se cumulează și se atașează documentele doveditoare.',
      { size: 8.5, gap: 8 },
    )

    p.paragraph(
      ctx,
      'II. Bunurile imobile și mobile deținute de mine și de membrii familiei mele (bifați ' +
        'bunurile deținute):',
      { size: 10, gap: 4 },
    )
    p.checkbox(ctx, {
      label:
        'Clădiri, alte spații locative în afara locuinței de domiciliu, precum și terenuri situate ' +
        'în intravilan cu suprafața de peste 1.200 mp în zona urbană și 2.500 mp în zona rurală, ' +
        'în afara terenurilor de împrejmuire a locuinței și a curții aferente;',
      name: 'bun_imobile', group: B,
    })
    p.checkbox(ctx, {
      label: 'Mai mult de un vehicul cu o vechime mai mare de 10 ani, cu drept de circulație pe drumurile publice;',
      name: 'bun_vehicule_vechi', group: B,
    })
    p.checkbox(ctx, {
      label:
        'Autovehicul cu drept de circulație pe drumurile publice cu o vechime mai mică de 10 ani, ' +
        'cu excepția celor utilizate și/sau adaptate pentru transportul persoanelor cu dizabilități;',
      name: 'bun_autovehicul_nou', group: B,
    })
    p.checkbox(ctx, {
      label:
        'Șalupe, bărci cu motor, iahturi sau alte tipuri de ambarcațiuni, cu excepția celor ' +
        'necesare pentru transport în cazul persoanelor care locuiesc în aria Rezervației ' +
        'Biosferei „Delta Dunării";',
      name: 'bun_ambarcatiuni', group: B,
    })
    p.checkbox(ctx, {
      label:
        'Depozite bancare — cel puțin unul dintre membrii familiei deține, în calitate de titular, ' +
        'unul sau mai multe conturi/depozite bancare a căror sumă totală este mai mare de 3 ori ' +
        'față de valoarea câștigului salarial mediu brut prevăzut de Legea asigurărilor sociale de stat.',
      name: 'bun_depozite', group: B,
    })
    p.paragraph(
      ctx,
      'Sub sancțiunile Codului penal cu privire la falsul în declarații, declar pe propria ' +
        'răspundere că datele, informațiile și documentele anexate prezentei sunt reale, exacte și ' +
        'complete.',
      { size: 9.5, gap: 8 },
    )
    p.signatureFooter(ctx, { dateLabel: 'Data declarației', signatureLabel: 'Semnătura declarantului' })

    // ── Consimțământ OUG 41/2016 ─────────────────────────────────────────────
    p.paragraph(ctx, 'DECLARAȚIE DE CONSIMȚĂMÂNT', { size: 11.5, gap: 8 })
    p.labeledField(ctx, { label: 'Subsemnatul/a (nume și prenume)', name: 'consim_nume', required: true, group: O })
    p.twoColFields(
      ctx,
      { label: 'CI/BI seria și nr.', name: 'consim_act_identitate', group: O },
      { label: 'CNP', name: 'consim_cnp', required: true, group: O },
    )
    p.labeledField(ctx, { label: 'Domiciliat/ă în', name: 'consim_adresa', required: true, group: O })
    p.twoColFields(
      ctx,
      { label: 'Cererea nr.', name: 'consim_cerere_nr', group: O },
      { label: 'Din data de', name: 'consim_cerere_data', group: O },
    )
    p.paragraph(
      ctx,
      'în temeiul art. 2^1 alin. (2) din O.U.G. nr. 41/2016, consimt ca Direcția de Asistență ' +
        'Socială și Medicală, în vederea soluționării cererii de mai sus, să solicite copii de pe ' +
        'avize sau alte documente emise de alte instituții publice, organe de specialitate ale ' +
        'administrației publice centrale și locale, precum și de persoane juridice de drept privat ' +
        'care au obținut statut de utilitate publică sau sunt autorizate să presteze un serviciu ' +
        'public, în regim de putere publică. Consimțământul este valabil până la exercitarea ' +
        'dreptului de opoziție, care poate fi exercitat printr-o cerere datată și semnată, depusă ' +
        'la sediul instituției sau transmisă la protectievarstnic@dasmclujnapoca.ro.',
      { size: 9.5, gap: 8 },
    )
    p.signatureFooter(ctx, { dateLabel: 'Data consimțământului', signatureLabel: 'Semnătura' })
  },
}

export default spec
