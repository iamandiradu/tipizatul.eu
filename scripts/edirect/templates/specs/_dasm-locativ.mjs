/**
 * Shared blocks for the DASM Cluj-Napoca "Serviciul Fond Locativ Social"
 * forms (815.02–815.06 on https://dasmclujnapoca.ro/formulare/).
 *
 * All five open with the same addressee and the same applicant paragraph
 * (județ, localitate, street with bl./corp/sc./ap., CI/BI, CNP, telefon), and
 * four of them close with the same annex list and the same four e-mail
 * options. The declaration list a)–h) is the part the applicant must satisfy
 * to be granted a social tenancy at all, so it is reproduced verbatim rather
 * than summarised — only its final clause differs per form (what the consent
 * is given *for*), which is why it is a parameter.
 */

const ADDRESSEE = 'CONSILIUL LOCAL AL MUNICIPIULUI CLUJ-NAPOCA'
const SERVICE =
  'Direcția de Asistență Socială și Medicală · Serviciul Fond Locativ Social, ' +
  'spații cu destinație medicală'

export function locativHeader(ctx, p) {
  p.paragraph(ctx, 'Nr. ______________ / ______________', { size: 10, gap: 12 })
  p.addressee(ctx, { lead: 'CĂTRE,', baked: ADDRESSEE, bakedAddress: SERVICE })
}

/**
 * The applicant identification paragraph. `prefix` namespaces the fields so
 * the schimb-de-locuință form can carry two tenants in one document.
 */
export function locativApplicant(ctx, p, { prefix = '', group = 'Date de identificare' } = {}) {
  const n = (s) => (prefix ? `${prefix}_${s}` : s)
  p.labeledField(ctx, {
    label: 'Subsemnatul/a (nume și prenume)', name: n('nume_si_prenume'), required: true, group,
  })
  p.twoColFields(
    ctx,
    { label: 'Județul', name: n('judet'), required: true, group },
    { label: 'Localitatea', name: n('localitate'), required: true, group },
  )
  p.labeledField(ctx, { label: 'Strada', name: n('adresa'), required: true, group })
  p.twoColFields(
    ctx,
    { label: 'Nr., bl., corp, sc., ap.', name: n('adresa_detalii'), group },
    { label: 'CI/BI seria și nr.', name: n('act_identitate'), required: true, group },
  )
  p.twoColFields(
    ctx,
    { label: 'CNP', name: n('cnp'), required: true, group },
    { label: 'Telefon', name: n('telefon'), required: true, group },
  )
}

/** The rented dwelling — same block on încheiere, prelungire and transcriere. */
export function locuintaBlock(ctx, p, { group = 'Locuința socială' } = {}) {
  p.labeledField(ctx, {
    label: 'Locuința socială situată în municipiul Cluj-Napoca, str.',
    name: 'locuinta_adresa',
    required: true,
    group,
  })
  p.labeledField(ctx, { label: 'Nr., bl., corp, sc., ap.', name: 'locuinta_detalii', group })
}

/**
 * „În vederea prelucrării prezentei cereri sunt necesare următoarele
 * documente" — the declaration the applicant and their first-degree family
 * must give, verbatim, plus the supporting documents list.
 *
 * @param {string} consentFor  what clause h) consents to, per form
 * @param {string[]} [extraDocs]  documents this form asks for on top of the base set
 */
export function declaratieOlografa(ctx, p, consentFor, extraDocs = []) {
  p.paragraph(
    ctx,
    'În vederea prelucrării prezentei cereri sunt necesare următoarele documente:',
    { size: 10.5, gap: 6 },
  )
  p.paragraph(
    ctx,
    '1) Declarație olografă, nesupusă autentificării notariale, dată sub sancțiunea prevăzută de ' +
      'art. 326 alin. (1) din Codul penal al României, de către solicitant, precum și de către ' +
      'membrii familiei de gradul I ai acestuia care locuiesc și gospodăresc împreună (în cazul ' +
      'minorilor, declarația se formulează de reprezentantul legal), din care să rezulte că:',
    { size: 9.5, gap: 4 },
  )
  const clauses = [
    'a) nu ocupați și nu ați ocupat abuziv un imobil aflat în proprietatea Statului Român/în ' +
      'administrarea Consiliului Local al municipiului Cluj-Napoca/Municipiul Cluj-Napoca, ori în ' +
      'proprietatea Municipiului Cluj-Napoca;',
    'b) nu ați deținut, nu dețineți și nu ați înstrăinat o locuință proprietate personală sau o ' +
      'cotă parte din suprafața utilă a unei locuințe, mai mare de 18 mp., pe teritoriul României, ' +
      'după data de 1 ianuarie 1990;',
    'c) nu dețineți, nu ați deținut și nu ați înstrăinat o suprafață de teren construibil ' +
      'intravilan pe teritoriul României, după data de 1 ianuarie 1990;',
    'd) nu ați deținut, nu dețineți și nu ați înstrăinat o casă de vacanță, proprietate personală, ' +
      'pe teritoriul României, după data de 1 ianuarie 1990;',
    'e) nu ați beneficiat de sprijinul statului în credite și execuție pentru realizarea unei locuințe;',
    'f) nu dețineți, în calitate de chiriaș, o altă locuință din fondul locativ de stat, ' +
      'nerevendicată în baza legilor speciale;',
    'g) nu ați subînchiriat, nu ați transmis dreptul de locuire și nu ați schimbat destinația ' +
      'spațiului închiriat;',
    `h) consimțământul ca Direcția de Asistență Socială și Medicală să prelucreze datele cu ` +
      `caracter personal, în vederea ${consentFor}.`,
  ]
  for (const c of clauses) p.paragraph(ctx, c, { size: 9, gap: 2 })

  const docs = [
    ...extraDocs,
    'acte de identitate în valabilitate ale solicitantului și ale tuturor persoanelor ce vor ' +
      'beneficia de drepturi locative în contractul de închiriere;',
    'certificat de căsătorie (după caz);',
    'certificat de deces (după caz);',
    'sentință de divorț (dacă este cazul);',
    'veniturile nete pe ultimele 12 luni pentru fiecare membru al familiei.',
  ]
  docs.forEach((d, i) => p.paragraph(ctx, `${i + 2}) ${d}`, { size: 9, gap: 2 }))

  p.paragraph(
    ctx,
    '* Direcția de Asistență Socială și Medicală asigură gratuit fotocopierea documentelor. ' +
      '* Pentru documentele emise de alte instituții publice, organe de specialitate ale ' +
      'administrației publice centrale și locale, precum și de persoane juridice de drept privat ' +
      'care au obținut statut de utilitate publică sau sunt autorizate să presteze un serviciu ' +
      'public, pe care solicitantul nu le depune, acesta are posibilitatea de a-și da ' +
      'consimțământul expres ca Direcția de Asistență Socială și Medicală să obțină în numele său ' +
      'copii sau extrase ale acestora.',
    { size: 8.5, gap: 8 },
  )
}

/** „Anexez prezentei: •  …" — six ruled lines on the source forms. */
export function annexList(ctx, p, { rows = 6, group = 'Anexe' } = {}) {
  p.paragraph(ctx, 'Anexez prezentei:', { size: 10.5, gap: 4 })
  for (let i = 1; i <= rows; i++) {
    p.labeledField(ctx, { label: `Anexa ${i}`, name: `anexa_${i}`, group })
  }
}

/** The four e-mail options printed with checkboxes on the source forms. */
export function emailOptions(ctx, p, { group = 'Comunicarea răspunsului' } = {}) {
  p.checkbox(ctx, {
    label: 'Prin prezenta solicit comunicarea răspunsului pe următoarea adresă de e-mail:',
    name: 'solicit_raspuns_email',
    group,
  })
  p.labeledField(ctx, { label: 'Adresa de e-mail', name: 'email', group })
  p.checkbox(ctx, {
    label: 'Mă oblig să comunic instituției orice modificare intervenită în legătură cu această adresă de e-mail.',
    name: 'obligatie_modificare_email',
    group,
  })
  p.checkbox(ctx, {
    label:
      'Îmi exprim consimțământul ca Direcția de Asistență Socială și Medicală să comunice orice ' +
      'informații, date personale, clarificări și completări pe adresa de e-mail indicată mai sus.',
    name: 'consimtamant_comunicare_email',
    group,
  })
  p.checkbox(ctx, {
    label:
      'Am luat la cunoștință faptul că, în cazul nefuncționării serverului de e-mail comunicat sau ' +
      'în cazul adresei greșite de e-mail, Direcția de Asistență Socială și Medicală nu poate fi ' +
      'trasă la răspundere pentru acest lucru.',
    name: 'cunostinta_risc_email',
    group,
  })
}

/** The GDPR footer these forms print at the top of every page. */
export function locativGdpr(ctx, p) {
  p.paragraph(
    ctx,
    'Timp estimativ de completare: 10 minute. Datele personale solicitate prin prezenta cerere vor ' +
      'fi prelucrate numai în vederea procesării și soluționării solicitării dumneavoastră. ' +
      'Direcția de Asistență Socială și Medicală garantează securitatea procesării datelor și ' +
      'arhivarea acestora în conformitate cu prevederile legale în vigoare. Responsabilul cu ' +
      'protecția datelor poate fi contactat pe adresa de e-mail: tic@dasmclujnapoca.ro. În ' +
      'conformitate cu Regulamentul nr. 679/2016 aveți dreptul de a solicita accesul la datele cu ' +
      'caracter personal, rectificarea sau ștergerea acestora, restricționarea prelucrării, ' +
      'dreptul de a vă opune prelucrării, precum și dreptul la portabilitatea datelor.',
    { size: 8, gap: 2 },
  )
  p.paragraph(
    ctx,
    'Cluj-Napoca, str. Venus f.n. · telefon: 0264/599.316 · http://dasmclujnapoca.ro · contact@dasmclujnapoca.ro',
    { size: 8, gap: 0 },
  )
}
