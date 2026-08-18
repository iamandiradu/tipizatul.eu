/**
 * Declarație pe propria răspundere privind calitatea de lucrător al Securității
 * sau de colaborator al acesteia — O.U.G. nr. 24/2008, art. 5 alin. (1), cerută
 * la dosarul de concurs pentru funcții publice prin art. 49 alin. (1) lit. j)
 * din H.G. nr. 611/2008.
 *
 * National model, authored from the DASM Cluj-Napoca copy
 * (`Declaratie-pe-propria-raspundere-cf-OUG-24-20081.pdf`). The declaration
 * identifies the signatory through their parents and place of birth, because
 * that is how the CNSAS archive is searched — those rows are not optional
 * decoration and are kept.
 *
 * Left generic (no `organization`): the declaration is filed wherever the
 * candidature is.
 */

const G = 'Declarant'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'declaratie-oug-24-2008',
  name: 'Declarație pe propria răspundere conform O.U.G. nr. 24/2008',
  title: 'DECLARAȚIE PE PROPRIA RĂSPUNDERE',
  description:
    'Declarația privind calitatea de lucrător al Securității sau de colaborator al acesteia, ' +
    'conform art. 5 alin. (1) din O.U.G. nr. 24/2008 și art. 49 alin. (1) lit. j) din H.G. nr. ' +
    '611/2008. Sunt exceptate persoanele care la data de 22 decembrie 1989 nu împliniseră vârsta ' +
    'de 16 ani.',
  category: 'Declarații',

  body(ctx, p) {
    p.paragraph(
      ctx,
      'Sunt exceptate de la obligația de a face declarația pe propria răspundere privind calitatea ' +
        'de lucrător al Securității sau de colaborator al acesteia persoanele care la data de 22 ' +
        'decembrie 1989 nu împliniseră vârsta de 16 ani.',
      { size: 9, gap: 10 },
    )

    p.labeledField(ctx, {
      label: 'Subsemnatul/a (numele și toate prenumele din actul de identitate)',
      name: 'nume_si_prenume',
      required: true,
      group: G,
    })
    p.labeledField(ctx, { label: 'Eventuale nume anterioare', name: 'nume_anterioare', group: G })
    p.labeledField(ctx, { label: 'Cetățean român, fiul/fiica lui (numele și prenumele tatălui)', name: 'nume_tata', required: true, group: G })
    p.labeledField(ctx, { label: 'Și al/a (numele și prenumele mamei)', name: 'nume_mama', required: true, group: G })
    p.twoColFields(
      ctx,
      { label: 'Născut/ă la data de (ziua, luna, anul)', name: 'data_nasterii', required: true, group: G },
      { label: 'În (localitatea/județul)', name: 'loc_nastere', required: true, group: G },
    )
    p.labeledField(ctx, { label: 'Domiciliat/ă în (domiciliul din actul de identitate)', name: 'adresa', required: true, group: G })
    p.labeledField(ctx, {
      label: 'Legitimat/ă cu (felul, seria și numărul actului de identitate)', name: 'act_identitate', required: true, group: G,
    })

    p.paragraph(
      ctx,
      'cunoscând prevederile art. 326 din Codul penal cu privire la falsul în declarații, după ' +
        'luarea la cunoștință a conținutului Ordonanței de urgență a Guvernului nr. 24/2008 privind ' +
        'accesul la propriul dosar și deconspirarea Securității, declar prin prezenta, pe propria ' +
        'răspundere, că (bifați):',
      { size: 10, gap: 4 },
    )
    p.checkbox(ctx, {
      label: 'am fost lucrător al Securității sau colaborator al acesteia, în sensul art. 2 lit. a) și b) din ordonanța de urgență;',
      name: 'am_fost',
      group: 'Declarația',
    })
    p.checkbox(ctx, {
      label: 'nu am fost lucrător al Securității sau colaborator al acesteia, în sensul art. 2 lit. a) și b) din ordonanța de urgență.',
      name: 'nu_am_fost',
      group: 'Declarația',
    })

    p.signatureFooter(ctx)
  },
}

export default spec
