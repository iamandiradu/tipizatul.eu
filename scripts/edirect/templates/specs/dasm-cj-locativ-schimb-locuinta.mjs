/**
 * DASM Cluj-Napoca — cerere privind aprobarea unui schimb de locuință
 * (formularul 815.05, H.C.L. 402/2012).
 *
 * A two-party request: both tenants sign the same sheet, each with their own
 * identification block and their own tenancy contract, so the applicant block
 * is instantiated twice and the footer carries two signatures. Its document
 * list is its own — notarised agreements from both tenants, no-debt
 * certificates — not the shared one from the other locativ forms.
 */

import { ORGANIZATION, COUNTY } from './_dasm-cluj.mjs'
import {
  locativHeader, locativApplicant, annexList, emailOptions, locativGdpr,
} from './_dasm-locativ.mjs'

function tenantBlock(ctx, p, { prefix, heading }) {
  const G = heading
  p.paragraph(ctx, heading, { size: 11, gap: 4 })
  locativApplicant(ctx, p, { prefix, group: G })
  p.twoColFields(
    ctx,
    { label: 'Titular al contractului de închiriere nr.', name: `${prefix}_contract_nr`, required: true, group: G },
    { label: 'Din data de', name: `${prefix}_contract_data`, required: true, group: G },
  )
  p.twoColFields(
    ctx,
    { label: 'Locuința compusă din (nr. camere)', name: `${prefix}_camere`, maxLength: 3, group: G },
    { label: 'Situată în localitatea', name: `${prefix}_locuinta_localitate`, required: true, group: G },
  )
  p.labeledField(ctx, { label: 'Strada', name: `${prefix}_locuinta_adresa`, required: true, group: G })
  p.labeledField(ctx, { label: 'Nr., bl., corp, sc., ap.', name: `${prefix}_locuinta_detalii`, group: G })
  p.paragraph(
    ctx,
    'solicit aprobarea schimbului de locuință în temeiul H.C.L. 402/2012.',
    { size: 10.5, gap: 10 },
  )
}

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'dasm-cj-locativ-schimb-locuinta',
  name: 'Cerere aprobare schimb de locuință',
  title: 'CERERE PRIVIND APROBAREA UNUI SCHIMB DE LOCUINȚĂ',
  description:
    'Cerere comună a celor doi titulari de contract de închiriere, adresată Consiliului Local al ' +
    'municipiului Cluj-Napoca prin Direcția de Asistență Socială și Medicală, pentru aprobarea ' +
    'schimbului de locuință în temeiul H.C.L. 402/2012.',
  category: 'Fond locativ',
  organization: ORGANIZATION,
  county: COUNTY,

  body(ctx, p) {
    locativHeader(ctx, p)

    tenantBlock(ctx, p, { prefix: 'titular1', heading: 'I. Primul titular' })
    tenantBlock(ctx, p, { prefix: 'titular2', heading: 'II. Al doilea titular' })

    p.paragraph(
      ctx,
      'Declarăm că suprafața locativă ce face obiectul schimbului nu este deținută ca accesoriu la ' +
        'contractul de muncă și nu formează obiectul unui litigiu judecătoresc în curs de ' +
        'soluționare. Ne asumăm răspunderea pentru exactitatea datelor înscrise în prezenta cerere.',
      { size: 10, gap: 8 },
    )

    p.paragraph(
      ctx,
      'În vederea prelucrării prezentei cereri sunt necesare următoarele documente:',
      { size: 10.5, gap: 4 },
    )
    const docs = [
      'Declarații notariale ale ambilor titulari ai contractelor de închiriere care solicită ' +
        'schimbul, din care să reiasă acordul acestora privind copermutarea gratuită a posesiei și ' +
        'folosinței locuinței;',
      'Adeverințe de la asociațiile de locatari care certifică faptul că nu înregistrează debite ' +
        'din neachitarea cheltuielilor comune (în cazul în care nu există asociații de locatari ' +
        'înființate se vor prezenta declarații notariale în acest sens);',
      'Acte doveditoare din care să rezulte că nu se înregistrează debite către furnizorii de utilități;',
      'Declarații olografe ale ambilor titulari ai contractelor de închiriere care solicită ' +
        'schimbul, din care să reiasă consimțământul ca Direcția de Asistență Socială și Medicală ' +
        'să prelucreze datele cu caracter personal privind copermutarea gratuită a posesiei și ' +
        'folosinței locuinței.',
    ]
    docs.forEach((d, i) => p.paragraph(ctx, `${i + 1}) ${d}`, { size: 9, gap: 2 }))
    p.paragraph(
      ctx,
      '* Primăria municipiului Cluj-Napoca asigură gratuit fotocopierea documentelor. * Pentru ' +
        'documentele emise de alte instituții publice pe care solicitantul nu le depune, acesta ' +
        'are posibilitatea de a-și da consimțământul expres ca acestea să fie obținute în numele său.',
      { size: 8.5, gap: 8 },
    )

    annexList(ctx, p)
    emailOptions(ctx, p)

    p.signatureFooter(ctx, { dateLabel: 'Data', signatureLabel: 'Semnătura primului titular' })
    p.signatureFooter(ctx, { dateLabel: 'Data', signatureLabel: 'Semnătura celui de-al doilea titular' })
    locativGdpr(ctx, p)
  },
}

export default spec
