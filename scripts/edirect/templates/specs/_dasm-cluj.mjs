/**
 * Shared building blocks for the DASM Cluj-Napoca replicas.
 *
 * Source: https://dasmclujnapoca.ro/formulare/ (scraped by
 * scripts/sources/dasm-cluj/fetch.mjs — the institution does not publish on
 * eDirect). Its forms are institution-specific by construction: every one of
 * them opens „Către, DIRECŢIA DE ASISTENŢĂ SOCIALĂ ŞI MEDICALĂ" followed by
 * the service that handles it, so the addressee is baked rather than left as
 * an editable slot, and every spec declares `organization`/`county`.
 *
 * Three blocks repeat across nearly the whole set and live here:
 *   registryLine   — the „Nr. ____ /802/ ____" the registry clerk fills
 *   emailConsent   — the reply-by-e-mail request and its three undertakings
 *   gdprNotice     — the Regulation 679/2016 fine print in the footer
 */

export const DASM = 'DIRECȚIA DE ASISTENȚĂ SOCIALĂ ȘI MEDICALĂ'
export const ORGANIZATION = 'Direcția de Asistență Socială și Medicală Cluj-Napoca'
export const COUNTY = 'Cluj'
export const CONTACT_LINE =
  'Cluj-Napoca, str. Venus f.n. · telefon: 0264-599316 · http://dasmclujnapoca.ro'

/** The service (compartment) each form is addressed to, as printed on it. */
export const SERVICES = {
  protectieSociala: 'Serviciul Protecție Socială',
  dizabilitati: 'Serviciul Asistența Persoanelor cu Dizabilități',
  copil: 'Serviciul Protecția Copilului și Familiei',
  varstnici: 'Serviciul Asistența Persoanelor Vârstnice',
  resurseUmane: 'Serviciul Resurse Umane, Salarizare',
  financiar: 'Serviciul Financiar, Contabilitate, Buget',
  fondLocativ: 'Serviciul Fondul Locativ Social',
}

/**
 * „Către, DIRECŢIA DE ASISTENŢĂ SOCIALĂ ŞI MEDICALĂ / Serviciul …" — the
 * addressee block every DASM form opens with, baked (see the module header).
 */
export function dasmAddressee(ctx, p, service) {
  p.addressee(ctx, { baked: DASM, bakedAddress: service })
}

/**
 * The registration stamp: „Nr. ______ / 802 / ____________". It is filled by
 * the registry desk when the form is handed in, not by the applicant, so it is
 * drawn as printed text rather than as fields the web form would ask for.
 */
export function registryLine(ctx, p, compartment) {
  p.paragraph(ctx, `Nr. ______________ /${compartment}/ ______________`, { size: 10, gap: 12 })
}

/**
 * Contact rows plus the reply-by-e-mail request and the three undertakings
 * printed under it. The undertakings are prose on the source form — accepted
 * by signing it, not ticked — so they are reproduced as prose here.
 */
export function emailConsent(ctx, p, { group = 'Contact' } = {}) {
  p.twoColFields(
    ctx,
    { label: 'Telefon de contact', name: 'telefon', group },
    { label: 'E-mail', name: 'email', group },
  )
  p.paragraph(
    ctx,
    'Prin prezenta solicit comunicarea răspunsului pe adresa de e-mail indicată mai sus.',
    { size: 10, gap: 4 },
  )
  p.paragraph(
    ctx,
    '• Am luat la cunoștință faptul că, în cazul nefuncționării serverului de e-mail comunicat ' +
      'sau în cazul adresei greșite de e-mail, Direcția de Asistență Socială și Medicală nu poate ' +
      'fi trasă la răspundere pentru acest lucru;',
    { size: 9, gap: 2 },
  )
  p.paragraph(
    ctx,
    '• Mă oblig să comunic instituției orice modificare intervine în legătură cu această adresă de e-mail;',
    { size: 9, gap: 2 },
  )
  p.paragraph(
    ctx,
    '• Îmi exprim consimțământul ca Direcția de Asistență Socială și Medicală să comunice orice ' +
      'informații, date personale, clarificări și completări pe adresa de e-mail indicată mai sus.',
    { size: 9, gap: 10 },
  )
}

/**
 * The GDPR footer. Verbatim from the source forms — it states who the operator
 * is and how to reach the data-protection officer, which is the part a citizen
 * may actually need later.
 */
export function gdprNotice(ctx, p) {
  p.paragraph(
    ctx,
    'Datele personale care vă sunt solicitate prin prezenta cerere vor fi prelucrate numai în ' +
      'vederea procesării și soluționării solicitării dumneavoastră. Direcția de Asistență Socială ' +
      'și Medicală garantează securitatea procesării datelor și arhivarea acestora în conformitate ' +
      'cu prevederile legale în vigoare. Responsabilul cu protecția datelor poate fi contactat pe ' +
      'adresa de e-mail: tic@dasmclujnapoca.ro.',
    { size: 8, gap: 2 },
  )
  p.paragraph(
    ctx,
    'În conformitate cu Regulamentul nr. 679 din 27 aprilie 2016 aveți dreptul de a solicita ' +
      'Direcției de Asistență Socială și Medicală, în ceea ce privește datele cu caracter personal ' +
      'referitoare la persoana vizată, accesul la acestea, rectificarea sau ștergerea acestora sau ' +
      'restricționarea prelucrării sau dreptul de a vă opune prelucrării, precum și a dreptului la ' +
      'portabilitatea datelor.',
    { size: 8, gap: 4 },
  )
  p.paragraph(ctx, CONTACT_LINE, { size: 8, gap: 0 })
}

/**
 * The full „Declarație de consimțământ" printed under the request on the
 * Serviciul Asistența Persoanelor Vârstnice forms. It is a distinct declaration
 * with its own signature line on the source, not a footer notice, so it keeps
 * its heading and its own name field.
 */
export function consentDeclaration(ctx, p, { group = 'Declarație de consimțământ' } = {}) {
  p.paragraph(ctx, 'Declarație de consimțământ', { size: 11.5, gap: 6 })
  p.labeledField(ctx, {
    label: 'Subsemnatul/a (nume și prenume)',
    name: 'consimtamant_nume',
    required: true,
    group,
  })
  p.paragraph(
    ctx,
    'sunt de acord ca Direcția de Asistență Socială și Medicală, cu sediul în Cluj-Napoca, ' +
      'str. Venus f.n., jud. Cluj, România, să fie autorizată să proceseze datele mele personale ' +
      'din prezenta cerere numai în vederea procesării și soluționării solicitării.',
    { size: 10, gap: 6 },
  )
  p.paragraph(
    ctx,
    'Consimțământul privind prelucrarea datelor cu caracter personal, precum și furnizarea ' +
      'datelor, sunt voluntare. Consimțământul poate fi revocat în orice moment, cu efect ' +
      'ulterior, printr-o notificare către Direcția de Asistență Socială și Medicală, inclusiv ' +
      'prin e-mail la contact@dasmclujnapoca.ro. Revocarea nu afectează legalitatea utilizării ' +
      'datelor înainte de retragerea consimțământului. Dacă consimțământul nu este acordat sau a ' +
      'fost revocat, datele personale nu vor fi utilizate în scopurile de mai sus.',
    { size: 9, gap: 4 },
  )
  p.paragraph(
    ctx,
    'Destinatarii datelor cu caracter personal sunt numai angajații care au ca atribuții ' +
      'soluționarea cererii pentru care se face prezenta declarație. Responsabilul cu protecția ' +
      'datelor poate fi contactat la contact@dasmclujnapoca.ro. În conformitate cu Regulamentul ' +
      'nr. 679/2016 aveți dreptul de a solicita accesul la datele cu caracter personal, ' +
      'rectificarea sau ștergerea acestora, restricționarea prelucrării, dreptul de a vă opune ' +
      'prelucrării, precum și dreptul la portabilitatea datelor.',
    { size: 9, gap: 6 },
  )
}

/**
 * „Subsemnatul(a) …, domiciliat(ă) în Cluj-Napoca, str. …, nr. …, ap. …" —
 * the applicant rows the Cluj forms use. The locality is printed on the source
 * form (these are municipal services), so only the street rows are fields.
 * `cnp` is included where the source asks for it.
 */
export function clujApplicant(ctx, p, { cnp = false, group = 'Date de identificare' } = {}) {
  p.labeledField(ctx, {
    label: 'Subsemnatul/a (nume și prenume)',
    name: 'nume_si_prenume',
    required: true,
    hint: 'Numele complet, conform actului de identitate.',
    group,
  })
  if (cnp) {
    p.labeledField(ctx, { label: 'CNP', name: 'cnp', required: true, group })
  }
  p.labeledField(ctx, {
    label: 'Domiciliat/ă în Cluj-Napoca, str.',
    name: 'adresa',
    required: true,
    group,
  })
  p.twoColFields(
    ctx,
    { label: 'Nr.', name: 'nr', maxLength: 8, group },
    { label: 'Ap.', name: 'ap', maxLength: 8, group },
  )
}
