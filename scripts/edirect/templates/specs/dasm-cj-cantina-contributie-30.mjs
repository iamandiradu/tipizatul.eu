/**
 * DASM Cluj-Napoca — cerere pentru acordarea serviciilor mesei la Cantina de
 * Ajutor Social cu plata unei contribuții de 30% (Legea nr. 208/1997, art. 4
 * alin. 2).
 *
 * Replica of `CERERE-CANTINA-301-2.pdf`. The household table decides the
 * per-person income the 30% is computed from, so it is reproduced as a grid.
 * The form also carries a delegation (someone else may collect the meal when
 * illness prevents the applicant) and, on its last page, the ANGAJAMENT the
 * beneficiary signs — both reproduced.
 */

import {
  ORGANIZATION, COUNTY, SERVICES, dasmAddressee,
} from './_dasm-cluj.mjs'

const G = 'Date de identificare'
const D = 'Delegare pentru ridicarea hranei'
const A = 'Angajament'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-cantina-contributie-30',
  name: 'Cerere cantină de ajutor social — contribuție 30%',
  title: 'CERERE pentru acordarea serviciilor mesei cu plata unei contribuții de 30% din venitul pe persoană',
  description:
    'Cerere adresată Direcției de Asistență Socială și Medicală Cluj-Napoca pentru acordarea ' +
    'serviciilor Cantinei de Ajutor Social cu plata unei contribuții de 30% din venitul pe ' +
    'persoană, conform Legii nr. 208/1997.',
  category: 'Asistență socială',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    p.paragraph(ctx, 'Nr. ______________ / ______________', { size: 10, gap: 12 })
    dasmAddressee(ctx, p, SERVICES.protectieSociala)

    p.labeledField(ctx, { label: 'Numele și prenumele', name: 'nume_si_prenume', required: true, group: G })
    p.labeledField(ctx, { label: 'Adresa', name: 'adresa', required: true, group: G })
    p.labeledField(ctx, { label: 'Nr., bl., sc., ap.', name: 'adresa_detalii', group: G })
    p.twoColFields(
      ctx,
      { label: 'B.I./C.I./C.P. seria și nr.', name: 'act_identitate', required: true, group: G },
      { label: 'Telefon', name: 'telefon', group: G },
    )
    p.combField(ctx, { label: 'CNP', name: 'cnp', required: true, group: G }, { cells: 13 })

    p.labeledField(ctx, {
      label: 'Vă rog să-mi aprobați acordarea unui număr de porții de hrană',
      name: 'numar_portii',
      required: true,
      maxLength: 3,
      group: 'Obiectul cererii',
    })
    p.checkbox(ctx, { label: 'hrană rece;', name: 'hrana_rece', group: 'Obiectul cererii' })
    p.checkbox(ctx, { label: 'hrană caldă.', name: 'hrana_calda', group: 'Obiectul cererii' })

    p.paragraph(
      ctx,
      'Declar pe propria răspundere că familia mea este compusă din următoarele persoane:',
      { size: 11, gap: 6 },
    )
    p.table(ctx, {
      name: 'membru',
      rows: 10,
      group: 'Componența familiei',
      columns: [
        { header: 'Nume, prenume', key: 'nume' },
        { header: 'C.N.P.', key: 'cnp', width: 96, maxLength: 13 },
        { header: 'Ocupația', key: 'ocupatie', width: 96 },
        { header: 'Venituri', key: 'venituri', width: 70 },
      ],
    })
    p.labeledField(ctx, {
      label: 'Veniturile totale lunare nete ale familiei (lei)',
      name: 'venit_total_familie',
      required: true,
      group: 'Componența familiei',
    })

    p.paragraph(
      ctx,
      'Bolile de care sufăr nu îmi permit să ridic personal porția de hrană, de aceea deleg ' +
        'următoarea persoană să o ridice pentru mine:',
      { size: 10.5, gap: 6 },
    )
    p.labeledField(ctx, { label: 'Doamna/Domnul (nume și prenume)', name: 'delegat_nume', group: D })
    p.twoColFields(
      ctx,
      { label: 'C.I./B.I./P.C. seria și nr.', name: 'delegat_act_identitate', group: D },
      { label: 'CNP', name: 'delegat_cnp', group: D },
    )

    p.paragraph(
      ctx,
      'Declar pe propria răspundere și sub sancțiunile Codului penal că datele și informațiile ' +
        'prezentate sunt complete și corespund realității și mă oblig să aduc la cunoștință, în ' +
        'scris, în termen de 5 zile de la data modificării, orice schimbare intervenită în ' +
        'componența familiei, a veniturilor realizate sau cu privire la domiciliu, care poate ' +
        'conduce la încetarea acestui drept.',
      { size: 9.5, gap: 8 },
    )
    p.signatureFooter(ctx, { signatureLabel: 'Semnătura solicitantului' })

    p.multilineField(
      ctx,
      { label: 'Documente depuse', name: 'documente_depuse', group: 'Documente depuse' },
      { lines: 5 },
    )

    // Last page of the source: the undertaking the beneficiary signs.
    p.paragraph(ctx, 'ANGAJAMENT', { size: 12, gap: 10 })
    p.labeledField(ctx, { label: 'Subsemnatul/a (nume și prenume)', name: 'angajament_nume', required: true, group: A })
    p.labeledField(ctx, { label: 'Domiciliat/ă în', name: 'angajament_adresa', required: true, group: A })
    p.labeledField(ctx, { label: 'Str., nr., bl., sc., ap.', name: 'angajament_adresa_detalii', group: A })
    p.twoColFields(
      ctx,
      { label: 'CI/BI/PC seria și nr.', name: 'angajament_act_identitate', group: A },
      { label: 'CNP', name: 'angajament_cnp', required: true, group: A },
    )
    p.twoColFields(
      ctx,
      { label: 'Eliberat de', name: 'angajament_eliberat_de', group: A },
      { label: 'La data de', name: 'angajament_data_act', group: A },
    )
    p.paragraph(
      ctx,
      'am luat la cunoștință și mă angajez ca, pentru a beneficia de serviciile Cantinei de Ajutor ' +
        'Social, să respect următoarele cerințe: să prezint până în data de 20 a fiecărei luni o ' +
        'copie de pe cuponul de pensie primit în luna curentă, la Serviciul Protecție Socială din ' +
        'cadrul Direcției de Asistență Socială și Medicală, sau altă dovadă a veniturilor; să achit ' +
        'lunar 30% din venitul pe membru de familie, conform Legii nr. 208/1997 art. 4 alin. 2, ' +
        'pentru hrana de care beneficiez. Sunt de acord ca pentru nerespectarea vreuneia dintre ' +
        'cerințele menționate anterior să mi se înceteze porția/porțiile de hrană.',
      { size: 9.5, gap: 8 },
    )
    p.signatureFooter(ctx, { dateLabel: 'Data angajamentului', signatureLabel: 'Semnătura beneficiarului' })
  },
}

export default spec
