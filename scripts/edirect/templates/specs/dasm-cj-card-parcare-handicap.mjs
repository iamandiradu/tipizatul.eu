/**
 * DASM Cluj-Napoca — cerere pentru eliberarea cardului-legitimație de parcare
 * pentru persoanele cu handicap.
 *
 * Replica of `Cerere-card-parcare-persoane-cu-dizabilitati-1.doc`. The body is
 * the national model under Legea 448/2006 + HG 268/2007, in two numbered
 * sections: I is filled in with the disabled person's data, II by whoever
 * files on their behalf. Both are reproduced, section II optional — an adult
 * filing for themselves leaves it blank — along with the two declarations the
 * form requires (no card drawn from another issuer; consent to processing).
 */

import {
  ORGANIZATION, COUNTY, SERVICES,
  dasmAddressee, registryLine, gdprNotice,
} from './_dasm-cluj.mjs'

const I = 'I. Persoana cu handicap'
const II = 'II. Familia / reprezentantul legal / însoțitorul'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-card-parcare-handicap',
  name: 'Cerere card-legitimație de parcare pentru persoanele cu handicap',
  title: 'CERERE pentru eliberarea cardului-legitimație de parcare pentru persoanele cu handicap',
  description:
    'Cerere adresată Direcției de Asistență Socială și Medicală Cluj-Napoca pentru ' +
    'eliberarea cardului-legitimație de parcare, conform Legii nr. 448/2006 și H.G. nr. 268/2007.',
  category: 'Asistență socială',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    registryLine(ctx, p, '802')
    dasmAddressee(ctx, p, SERVICES.dizabilitati)

    p.paragraph(ctx, 'I. (Se completează cu datele persoanei cu handicap.)', { size: 11, gap: 6 })
    p.labeledField(ctx, {
      label: 'Numele și prenumele', name: 'nume_si_prenume', required: true, group: I,
    })
    p.combField(ctx, { label: 'CNP', name: 'cnp', required: true, group: I }, { cells: 13 })
    p.labeledField(ctx, {
      label: 'Domiciliul: Cluj-Napoca, str.', name: 'adresa', required: true, group: I,
    })
    p.twoColFields(
      ctx,
      { label: 'Nr., bl., sc., et., ap.', name: 'adresa_detalii', group: I },
      { label: 'Cod poștal', name: 'cod_postal', group: I },
    )
    p.twoColFields(
      ctx,
      { label: 'Telefon', name: 'telefon', group: I },
      { label: 'E-mail', name: 'email', group: I },
    )
    p.labeledField(ctx, {
      label: 'Certificat de încadrare în grad de handicap (număr/serie/dată)',
      name: 'certificat_handicap',
      required: true,
      group: I,
    })

    p.paragraph(
      ctx,
      'II. (Se completează de către familie, asistentul personal, asistentul personal ' +
        'profesionist sau însoțitorul, pentru persoanele cu handicap grav sau accentuat, ' +
        'părinte, tutore, asistent maternal sau persoana care se ocupă de creșterea și ' +
        'îngrijirea copilului cu handicap grav sau accentuat în baza unei măsuri de protecție ' +
        'specială, stabilită în condițiile legii.)',
      { size: 10, gap: 6 },
    )
    p.labeledField(ctx, { label: 'Numele și prenumele', name: 'repr_nume', group: II })
    p.twoColFields(
      ctx,
      { label: 'Localitatea', name: 'repr_localitate', group: II },
      { label: 'Județul', name: 'repr_judet', group: II },
    )
    p.labeledField(ctx, { label: 'Strada, nr., bl., sc., et., ap.', name: 'repr_adresa', group: II })
    p.twoColFields(
      ctx,
      { label: 'Telefon', name: 'repr_telefon', group: II },
      { label: 'E-mail', name: 'repr_email', group: II },
    )
    p.labeledField(ctx, {
      label: 'Actul care face dovada reprezentativității și valabilitatea acestuia',
      name: 'act_reprezentare',
      hint: 'Documentele de identitate se prezintă în original.',
      group: II,
    })

    p.paragraph(
      ctx,
      'Solicit prin prezenta, în conformitate cu prevederile Legii nr. 448/2006 privind ' +
        'protecția și promovarea drepturilor persoanelor cu handicap, republicată, cu ' +
        'modificările și completările ulterioare, și cu prevederile Hotărârii Guvernului ' +
        'nr. 268/2007, eliberarea unui card-legitimație de parcare pentru persoanele cu handicap.',
      { size: 10.5, gap: 8 },
    )

    p.checkbox(ctx, {
      label:
        'Declar pe propria răspundere, sub sancțiunea falsului în declarații prevăzut de Codul ' +
        'penal, că nu am ridicat cardul-legitimație de parcare pentru persoanele cu handicap de ' +
        'la altă autoritate emitentă.',
      name: 'declar_fara_alt_card',
      required: true,
      group: 'Declarații',
    })
    p.checkbox(ctx, {
      label: 'Sunt de acord cu prelucrarea datelor cu caracter personal în conformitate cu legislația în vigoare.',
      name: 'acord_prelucrare_date',
      required: true,
      group: 'Declarații',
    })

    p.signatureFooter(ctx)
    gdprNotice(ctx, p)
  },
}

export default spec
