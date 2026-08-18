/**
 * ANEXA NR. 1 la Normele metodologice de aplicare a Legii nr. 196/2016 privind
 * venitul minim de incluziune (H.G. nr. 1154/2022) — „CERERE – DECLARAȚIE PE
 * PROPRIA RĂSPUNDERE pentru acordarea unor drepturi de asistență socială".
 *
 * National model, authored from the DASM Cluj-Napoca copies (`CERERE-2025.pdf`
 * and `Cerere-declaratie-pe-proprie-raspundere-pentru-acordarea-unor-drepturi-
 * de-asistenta-sociala.pdf`, 11 pages). One form covers three distinct rights —
 * venitul minim de incluziune, ajutorul pentru încălzirea locuinței and
 * suplimentul pentru energie — which is why DASM's page lists it four times
 * (VMI, chirie, cantină, încălzire) behind the same file.
 *
 * Structure follows the source chapter by chapter: Cap. 1 solicitant, Cap. 2
 * persoana îndreptățită, Cap. 3 familia (partener, copii, alte persoane
 * majore), Cap. 4 locuința și sursele de încălzire, Cap. 5 venituri și bunuri,
 * Cap. 6 modalitatea de plată, Cap. 7 acordul de prelucrare, Cap. 8 declarația,
 * plus the ANGAJAMENT DE PLATĂ printed as the last page.
 *
 * The repeated person blocks (four children, four other adults) keep their
 * identity rows as fields, but their two closed lists — relația de rudenie and
 * situația școlară — become one field each carrying the options as a hint.
 * Reproducing 11 checkboxes per person would put ~90 boxes on the form for
 * choices that are one-of-many, which no viewer would render as a group.
 *
 * Left generic (no `organization`): every primărie in the country receives this
 * form. It reaches DASM Cluj's procedure pages through the document joins.
 */

const CETATENIE_HINT = 'Română, UE sau non-UE (în acest caz precizați țara).'
const ACT_HINT =
  'Cetățeni români: BI, CI, CIP, P. Cetățeni străini sau apatrizi: DI, PST, PSTL. ' +
  'Cetățeni UE/SEE/Confederația Elvețiană: CIN, CR.'
const SCOLARA_HINT = 'Fără studii, generale, medii sau superioare.'
const PROFESIONALA_HINT =
  'Salariat, pensionar, șomer, student, independent, lucrător agricol, lucrător ocazional, elev sau altele.'
const RUDENIE_HINT =
  'Copil natural, copil adoptat, copil în plasament familial, copil în tutelă, copil în curatelă ' +
  'sau copil încredințat spre adopție.'
const SCOLARA_COPIL_HINT = 'Preșcolar, elev cls. I-VIII, elev cls. IX-XII sau fără studii.'

/** Identity rows shared by Cap. 1, Cap. 2 and the adult members in Cap. 3. */
function identityRows(ctx, p, { prefix, group, contact = false }) {
  const n = (s) => `${prefix}_${s}`
  p.twoColFields(
    ctx,
    { label: 'Numele', name: n('nume'), required: true, group },
    { label: 'Prenumele', name: n('prenume'), required: true, group },
  )
  p.combField(ctx, { label: 'Cod numeric personal', name: n('cnp'), required: true, group }, { cells: 13 })
  p.labeledField(ctx, { label: 'Cetățenia', name: n('cetatenie'), hint: CETATENIE_HINT, group })
  p.twoColFields(
    ctx,
    { label: 'Act de identitate/doveditor', name: n('act_tip'), hint: ACT_HINT, group },
    { label: 'Seria și nr.', name: n('act_serie_nr'), required: true, group },
  )
  p.twoColFields(
    ctx,
    { label: 'Eliberat de', name: n('act_eliberat_de'), group },
    { label: 'La data de', name: n('act_data'), group },
  )
  if (contact) {
    p.labeledField(ctx, { label: 'Strada', name: n('strada'), required: true, group })
    p.labeledField(ctx, { label: 'Nr., bl., sc., et., ap., sector', name: n('adresa_detalii'), group })
    p.twoColFields(
      ctx,
      { label: 'Localitatea', name: n('localitate'), required: true, group },
      { label: 'Județul', name: n('judet'), required: true, group },
    )
    p.twoColFields(
      ctx,
      { label: 'Telefon', name: n('telefon'), group },
      { label: 'Mobil', name: n('mobil'), group },
    )
  }
}

/** Cap. 3 c) — one of the four other adult members of the family. */
function adultBlock(ctx, p, { prefix, heading }) {
  const G = heading
  p.paragraph(ctx, heading, { size: 10.5, gap: 4 })
  identityRows(ctx, p, { prefix, group: G })
  p.labeledField(ctx, {
    label: 'Dacă a locuit în afara țării în ultimii 2 ani (perioada și țara)',
    name: `${prefix}_strainatate`,
    hint: 'Lăsați necompletat dacă nu a locuit în afara țării.',
    group: G,
  })
  p.twoColFields(
    ctx,
    { label: 'Situația școlară', name: `${prefix}_situatie_scolara`, hint: SCOLARA_HINT, group: G },
    { label: 'Situația profesională', name: `${prefix}_situatie_profesionala`, hint: PROFESIONALA_HINT, group: G },
  )
  p.twoColFields(
    ctx,
    { label: 'Venituri totale realizate în luna anterioară (lei)', name: `${prefix}_venituri`, group: G },
    { label: 'Grad de dizabilitate', name: `${prefix}_dizabilitate`, hint: 'Se atașează acte doveditoare.', group: G },
  )
}

/** Cap. 3 b) — one of the four children of the entitled person. */
function childBlock(ctx, p, { prefix, heading }) {
  const G = heading
  p.paragraph(ctx, heading, { size: 10.5, gap: 4 })
  p.twoColFields(
    ctx,
    { label: 'Numele', name: `${prefix}_nume`, group: G },
    { label: 'Prenumele', name: `${prefix}_prenume`, group: G },
  )
  p.combField(ctx, { label: 'Cod numeric personal', name: `${prefix}_cnp`, group: G }, { cells: 13 })
  p.twoColFields(
    ctx,
    { label: 'Act de identitate/doveditor — seria și nr.', name: `${prefix}_act_serie_nr`, group: G },
    { label: 'Relația de rudenie cu persoana îndreptățită', name: `${prefix}_rudenie`, hint: RUDENIE_HINT, group: G },
  )
  p.twoColFields(
    ctx,
    { label: 'Situația școlară', name: `${prefix}_situatie_scolara`, hint: SCOLARA_COPIL_HINT, group: G },
    { label: 'Școala nr. / localitatea', name: `${prefix}_scoala`, group: G },
  )
  p.labeledField(ctx, {
    label: 'Grad de dizabilitate', name: `${prefix}_dizabilitate`, hint: 'Se atașează acte doveditoare.', group: G,
  })
}

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'cerere-venit-minim-incluziune',
  name: 'Cerere-declarație pentru venit minim de incluziune, ajutor de încălzire și supliment pentru energie',
  title: 'CERERE – DECLARAȚIE PE PROPRIA RĂSPUNDERE pentru acordarea unor drepturi de asistență socială',
  description:
    'Anexa nr. 1 la Normele metodologice de aplicare a Legii nr. 196/2016 privind venitul minim de ' +
    'incluziune (H.G. nr. 1154/2022). Cu acest formular se solicită venitul minim de incluziune, ' +
    'ajutorul pentru încălzirea locuinței și suplimentul pentru energie.',
  category: 'Cereri',

  body(ctx, p) {
    p.paragraph(
      ctx,
      'Anexa nr. 1 la Normele metodologice de aplicare a prevederilor Legii nr. 196/2016 privind ' +
        'venitul minim de incluziune, aprobate prin Hotărârea Guvernului nr. 1154/2022. Se depune ' +
        'la unitatea administrativ-teritorială de domiciliu; plata este asigurată prin Agenția ' +
        'Națională pentru Plăți și Inspecție Socială.',
      { size: 9, gap: 10 },
    )

    // ── Cap. 1 ───────────────────────────────────────────────────────────────
    const C1 = 'Cap. 1 — Solicitantul'
    p.paragraph(
      ctx,
      'Cap. 1. Acest capitol al cererii se completează de către solicitant. Dacă solicitantul este ' +
        'persoana îndreptățită sau reprezentantul familiei, datele se vor repeta la Cap. 2.',
      { size: 10, gap: 6 },
    )
    identityRows(ctx, p, { prefix: 'solicitant', group: C1, contact: true })
    p.paragraph(ctx, 'Depun prezenta cerere (bifați):', { size: 10.5, gap: 2 })
    p.checkbox(ctx, { label: 'în nume propriu;', name: 'calitate_nume_propriu', group: C1 })
    p.checkbox(ctx, { label: 'în calitate de reprezentant al familiei mele;', name: 'calitate_reprezentant_familie', group: C1 })
    p.checkbox(ctx, { label: 'în numele persoanei îndreptățite.', name: 'calitate_reprezentant_persoana', group: C1 })

    p.paragraph(ctx, 'Vă rog să aprobați acordarea (bifați):', { size: 10.5, gap: 2 })
    p.checkbox(ctx, { label: 'venitului minim de incluziune;', name: 'solicit_vmi', group: C1 })
    p.checkbox(ctx, { label: 'ajutorului pentru încălzire;', name: 'solicit_ajutor_incalzire', group: C1 })
    p.checkbox(ctx, { label: 'suplimentului pentru energie.', name: 'solicit_supliment_energie', group: C1 })

    // ── Cap. 2 ───────────────────────────────────────────────────────────────
    const C2 = 'Cap. 2 — Persoana îndreptățită'
    p.paragraph(ctx, 'Cap. 2. Date despre persoana îndreptățită', { size: 11, gap: 6 })
    identityRows(ctx, p, { prefix: 'indreptatit', group: C2, contact: true })

    p.paragraph(ctx, 'Starea civilă (bifați):', { size: 10.5, gap: 2 })
    p.checkbox(ctx, { label: 'căsătorit(ă);', name: 'stare_casatorit', group: C2 })
    p.checkbox(ctx, { label: 'necăsătorit(ă);', name: 'stare_necasatorit', group: C2 })
    p.checkbox(ctx, { label: 'uniune consensuală;', name: 'stare_uniune_consensuala', group: C2 })
    p.checkbox(ctx, { label: 'văduv(ă);', name: 'stare_vaduv', group: C2 })
    p.checkbox(ctx, { label: 'divorțat(ă);', name: 'stare_divortat', group: C2 })
    p.checkbox(ctx, { label: 'despărțit(ă) în fapt.', name: 'stare_despartit_in_fapt', group: C2 })

    p.twoColFields(
      ctx,
      { label: 'Situația școlară', name: 'indreptatit_situatie_scolara', hint: SCOLARA_HINT, group: C2 },
      { label: 'Situația profesională', name: 'indreptatit_situatie_profesionala', hint: PROFESIONALA_HINT, group: C2 },
    )
    p.twoColFields(
      ctx,
      { label: 'Venituri totale realizate în luna anterioară depunerii cererii (lei)', name: 'indreptatit_venituri', required: true, group: C2 },
      { label: 'Grad de dizabilitate', name: 'indreptatit_dizabilitate', group: C2 },
    )

    p.paragraph(
      ctx,
      'Dacă beneficiază sau a beneficiat de unele drepturi de asistență socială (bifați):',
      { size: 10.5, gap: 2 },
    )
    p.checkbox(ctx, { label: 'venit minim de incluziune;', name: 'beneficiat_vmi', group: C2 })
    p.checkbox(ctx, { label: 'supliment pentru energie;', name: 'beneficiat_supliment', group: C2 })
    p.checkbox(ctx, {
      label: 'ajutor pentru încălzirea locuinței (pentru sezonul rece anterior), pentru:',
      name: 'beneficiat_ajutor_incalzire', group: C2,
    })
    p.checkbox(ctx, { label: 'energie termică;', name: 'beneficiat_energie_termica', indent: 18, group: C2 })
    p.checkbox(ctx, { label: 'gaze naturale;', name: 'beneficiat_gaze', indent: 18, group: C2 })
    p.checkbox(ctx, { label: 'energie electrică;', name: 'beneficiat_energie_electrica', indent: 18, group: C2 })
    p.checkbox(ctx, { label: 'lemne, cărbuni.', name: 'beneficiat_lemne', indent: 18, group: C2 })

    // ── Cap. 3 ───────────────────────────────────────────────────────────────
    p.paragraph(ctx, 'Cap. 3. Date despre familia persoanei îndreptățite', { size: 11, gap: 6 })
    p.twoColFields(
      ctx,
      { label: 'Număr de persoane majore (inclusiv persoana îndreptățită)', name: 'familie_majori', maxLength: 2, group: 'Cap. 3 — Familia' },
      { label: 'Număr de copii', name: 'familie_copii', maxLength: 2, group: 'Cap. 3 — Familia' },
    )

    const PARTENER = 'Cap. 3 a) — Partenerul/partenera'
    p.paragraph(ctx, 'a) Date despre partenerul/partenera persoanei îndreptățite', { size: 10.5, gap: 4 })
    identityRows(ctx, p, { prefix: 'partener', group: PARTENER })
    p.twoColFields(
      ctx,
      { label: 'Situația școlară', name: 'partener_situatie_scolara', hint: SCOLARA_HINT, group: PARTENER },
      { label: 'Situația profesională', name: 'partener_situatie_profesionala', hint: PROFESIONALA_HINT, group: PARTENER },
    )
    p.twoColFields(
      ctx,
      { label: 'Venituri totale realizate în luna anterioară (lei)', name: 'partener_venituri', group: PARTENER },
      { label: 'Grad de dizabilitate', name: 'partener_dizabilitate', group: PARTENER },
    )

    p.paragraph(ctx, 'b) Date despre copiii persoanei îndreptățite', { size: 10.5, gap: 4 })
    for (let i = 1; i <= 4; i++) {
      childBlock(ctx, p, { prefix: `copil${i}`, heading: `Cap. 3 b) — Copilul ${i}` })
    }

    p.paragraph(ctx, 'c) Date despre celelalte persoane majore din familia persoanei îndreptățite', { size: 10.5, gap: 4 })
    for (let i = 1; i <= 4; i++) {
      adultBlock(ctx, p, { prefix: `major${i}`, heading: `Cap. 3 c) — Persoana majoră ${i}` })
    }

    // ── Cap. 4 ───────────────────────────────────────────────────────────────
    const C4 = 'Cap. 4 — Locuința'
    p.paragraph(ctx, 'Cap. 4. Date privind locuința familiei/persoanei singure îndreptățite', { size: 11, gap: 6 })
    p.paragraph(ctx, 'Familia/persoana singură îndreptățită locuiește:', { size: 10.5, gap: 2 })
    p.checkbox(ctx, { label: 'singură;', name: 'locuieste_singura', group: C4 })
    p.checkbox(ctx, { label: 'împreună cu altă persoană singură sau familie.', name: 'locuieste_impreuna', group: C4 })

    p.twoColFields(
      ctx,
      {
        label: 'Regimul juridic al locuinței',
        name: 'regim_juridic',
        hint: 'Proprietate personală, în închiriere public/privat sau altele.',
        group: C4,
      },
      {
        label: 'Modul de dobândire al locuinței',
        name: 'mod_dobandire',
        hint: 'Cumpărare, moștenire sau altele.',
        group: C4,
      },
    )
    p.twoColFields(
      ctx,
      { label: 'Model locuință (număr de camere)', name: 'numar_camere', hint: '1, 2, 3, 4 sau peste 4 camere.', group: C4 },
      {
        label: 'Tipul locuinței',
        name: 'tip_locuinta',
        hint:
          'Casă cu curte, casă fără curte, apartament la bloc, locuință socială, locuință de ' +
          'serviciu, locuință de necesitate sau instituționalizat/nu are locuință.',
        group: C4,
      },
    )
    p.paragraph(ctx, 'Tipul construcției (bifați):', { size: 10.5, gap: 2 })
    p.checkbox(ctx, {
      label:
        'TIP A — construcția cu structura de rezistență din beton armat, metal, lemn, piatră, ' +
        'cărămidă arsă sau din orice alte materiale rezultate în urma unui tratament termic și/sau chimic;',
      name: 'constructie_tip_a', group: C4,
    })
    p.checkbox(ctx, {
      label:
        'TIP B — construcția cu pereți exteriori din cărămidă nearsă sau din orice alte materiale ' +
        'nesupuse unui tratament termic și/sau chimic.',
      name: 'constructie_tip_b', group: C4,
    })

    const POLITA = 'Cap. 4 — Polița de asigurare a locuinței'
    p.labeledField(ctx, { label: 'Polița de asigurare a locuinței este încheiată la societatea', name: 'polita_societate', group: POLITA })
    p.twoColFields(
      ctx,
      { label: 'Nr. poliță', name: 'polita_nr', group: POLITA },
      { label: 'Valabilă de la / până la', name: 'polita_valabilitate', group: POLITA },
    )
    p.checkbox(ctx, {
      label: 'Polița acoperă riscurile obligatorii (cutremur, alunecări de teren, inundații).',
      name: 'polita_riscuri_obligatorii', group: POLITA,
    })

    const INCALZIRE = 'Cap. 4 — Sursele de încălzire'
    p.paragraph(
      ctx,
      'Familia/persoana singură îndreptățită se încălzește cu (se pot bifa mai multe surse, în ' +
        'funcție de ceea ce se utilizează în locuință):',
      { size: 10.5, gap: 2 },
    )
    p.checkbox(ctx, { label: 'energie termică;', name: 'incalzire_energie_termica', group: INCALZIRE })
    p.checkbox(ctx, { label: 'gaze naturale;', name: 'incalzire_gaze_naturale', group: INCALZIRE })
    p.checkbox(ctx, { label: 'combustibili solizi/petrolieri;', name: 'incalzire_combustibili_solizi', group: INCALZIRE })
    p.checkbox(ctx, { label: 'energie electrică.', name: 'incalzire_energie_electrica', group: INCALZIRE })
    p.twoColFields(
      ctx,
      { label: 'Furnizor energie termică', name: 'furnizor_energie_termica', group: INCALZIRE },
      { label: 'Codul titularului de contract', name: 'cod_titular_energie_termica', group: INCALZIRE },
    )
    p.twoColFields(
      ctx,
      { label: 'Furnizor gaze naturale', name: 'furnizor_gaze', group: INCALZIRE },
      { label: 'Codul client / CLC', name: 'cod_client_gaze', group: INCALZIRE },
    )
    p.twoColFields(
      ctx,
      { label: 'Furnizor energie electrică', name: 'furnizor_energie_electrica', group: INCALZIRE },
      { label: 'Codul client / CLC', name: 'cod_client_energie_electrica', group: INCALZIRE },
    )
    p.paragraph(
      ctx,
      'Pentru consumul energetic din gospodărie, în afara încălzirii locuinței — iluminatul ' +
        'locuinței, susținerea facilităților de gătit și asigurarea apei calde, asigurarea ' +
        'continuității în alimentare a echipamentelor electrice de care depinde viața persoanelor ' +
        'din motive de sănătate și utilizarea mijloacelor de comunicare care presupun utilizarea de ' +
        'energie — se completează furnizorul și codul de client de mai sus.',
      { size: 8.5, gap: 8 },
    )

    // ── Cap. 5 ───────────────────────────────────────────────────────────────
    const C5 = 'Cap. 5 — Venituri și bunuri'
    p.paragraph(
      ctx,
      'Cap. 5. În acest capitol se completează datele privind toate veniturile și bunurile ' +
        'familiei/persoanei singure îndreptățite în luna anterioară solicitării.',
      { size: 11, gap: 6 },
    )
    p.twoColFields(
      ctx,
      { label: 'Luna pentru care se declară veniturile', name: 'luna_venituri', required: true, group: C5 },
      { label: 'Venitul total realizat (lei)', name: 'venit_total', required: true, group: C5 },
    )

    p.paragraph(ctx, '2. Cu privire la bunuri — dețin în proprietate/închiriere/concesiune/arendă (bifați):', { size: 10.5, gap: 2 })
    p.checkbox(ctx, {
      label: 'clădiri, alte spații locative în afara locuinței în care locuiesc;',
      name: 'bun_cladiri', group: C5,
    })
    p.checkbox(ctx, {
      label:
        'terenuri situate în intravilan cu suprafața de peste 1.200 mp în zona urbană/2.500 mp în ' +
        'zona rurală, în afara terenurilor de împrejmuire a locuinței și a curții aferente;',
      name: 'bun_terenuri', group: C5,
    })
    p.checkbox(ctx, {
      label: 'mai mult de un vehicul cu o vechime mai mare de 10 ani, cu drept de circulație pe drumurile publice;',
      name: 'bun_vehicule_vechi', group: C5,
    })
    p.checkbox(ctx, {
      label:
        'autovehicul cu drept de circulație pe drumurile publice cu o vechime mai mică de 10 ani și ' +
        'care nu este destinat transportului persoanei cu handicap din familie;',
      name: 'bun_autovehicul_nou', group: C5,
    })
    p.checkbox(ctx, {
      label:
        'șalupe, bărci cu motor, iahturi sau alte tipuri de ambarcațiuni (cu excepția celor ' +
        'necesare pentru transport în cazul persoanelor care locuiesc în aria Rezervației Biosferei ' +
        'Delta Dunării).',
      name: 'bun_ambarcatiuni', group: C5,
    })
    p.checkbox(ctx, {
      label: 'Nu dețin în proprietate/închiriere/concesiune/arendă bunurile menționate anterior.',
      name: 'bun_niciunul', group: C5,
    })

    p.paragraph(ctx, '3. Cu privire la gospodărirea împreună cu alte persoane/familii:', { size: 10.5, gap: 2 })
    p.labeledField(ctx, { label: 'Venitul rezultat din gospodărirea împreună (lei/lună)', name: 'venit_gospodarire_impreuna', group: C5 })

    p.paragraph(ctx, '4. Cu privire la veniturile din agricultură (bifați):', { size: 10.5, gap: 2 })
    p.checkbox(ctx, {
      label: 'realizez venituri impozabile din activități agricole, silvicultură și piscicultură;',
      name: 'venituri_agricole_da', group: C5,
    })
    p.checkbox(ctx, {
      label: 'nu realizez venituri impozabile din activități agricole, silvicultură și piscicultură.',
      name: 'venituri_agricole_nu', group: C5,
    })

    p.paragraph(ctx, '5. Cu privire la conturi bancare (bifați dacă este cazul):', { size: 10.5, gap: 2 })
    p.checkbox(ctx, {
      label:
        'dețin/unul dintre membrii familiei deține unul sau mai multe conturi/depozite bancare a ' +
        'căror sumă totală este mai mare de 3 ori față de valoarea câștigului salarial mediu brut ' +
        'prevăzut de Legea asigurărilor sociale de stat.',
      name: 'conturi_peste_plafon', group: C5,
    })

    p.paragraph(
      ctx,
      'Notă: la stabilirea veniturilor nete lunare ale familiei se iau în considerare totalitatea ' +
        'sumelor primite/realizate de persoana singură, respectiv de fiecare membru al familiei. ' +
        'Fac excepție, între altele: prestațiile sociale acordate în baza Legii nr. 448/2006; ' +
        'alocația de stat pentru copii (Legea nr. 61/1993); bursele și alte forme de sprijin ' +
        'financiar destinate exclusiv susținerii educației; sumele primite ca zilier (Legea nr. ' +
        '52/2011) sau ca prestator casnic (Legea nr. 111/2022); stimulentul educațional (Legea nr. ' +
        '248/2015); ajutorul pentru încălzirea locuinței și suplimentul pentru energie (Legea nr. ' +
        '226/2021); indemnizațiile de hrană prevăzute de Legea nr. 584/2003 și Legea nr. 302/2018; ' +
        'sumele ocazionale cu caracter de despăgubiri sau sprijin financiar pentru situații ' +
        'excepționale. Venitul minim de incluziune, ajutorul pentru încălzire și suplimentul pentru ' +
        'energie nu se acordă dacă familia sau persoana singură deține cel puțin unul dintre ' +
        'bunurile din lista bunurilor ce conduc la excluderea acordării dreptului.',
      { size: 8.5, gap: 10 },
    )

    // ── Cap. 6 ───────────────────────────────────────────────────────────────
    const C6 = 'Cap. 6 — Modalitatea de plată'
    p.paragraph(
      ctx,
      'Cap. 6. Modalitatea de plată a venitului minim de incluziune (cu excepția ajutoarelor ' +
        'pentru încălzirea locuinței/suplimentului pentru energie în cazul energiei termice, ' +
        'gazelor naturale și energiei electrice):',
      { size: 11, gap: 4 },
    )
    p.checkbox(ctx, { label: 'mandat poștal;', name: 'plata_mandat_postal', group: C6 })
    p.checkbox(ctx, { label: 'în cont bancar.', name: 'plata_cont_bancar', group: C6 })
    p.labeledField(ctx, { label: 'Nume titular cont', name: 'titular_cont', group: C6 })
    p.labeledField(ctx, { label: 'Număr cont bancar (IBAN)', name: 'iban', group: C6 })
    p.labeledField(ctx, { label: 'Deschis la banca', name: 'banca', group: C6 })

    // ── Cap. 7 ───────────────────────────────────────────────────────────────
    const C7 = 'Cap. 7 — Acordul privind prelucrarea datelor'
    p.paragraph(
      ctx,
      'Cap. 7. Acord privind prelucrarea datelor cu caracter personal, precum și pentru preluarea ' +
        'de informații pentru acordarea dreptului:',
      { size: 11, gap: 4 },
    )
    p.checkbox(ctx, {
      label:
        'Sunt de acord cu prelucrarea datelor cu caracter personal în scopul acordării venitului ' +
        'minim de incluziune, precum și a altor drepturi complementare acestuia ori de natură ' +
        'socială, precum și cu prelucrarea în scop statistic a acestora.',
      name: 'acord_prelucrare', required: true, group: C7,
    })
    p.checkbox(ctx, {
      label:
        'Sunt de acord cu preluarea de date și informații cu privire la persoana mea și/sau a ' +
        'membrilor familiei pe care o reprezint, pentru acordarea venitului minim de incluziune.',
      name: 'acord_preluare_informatii', required: true, group: C7,
    })

    // ── Cap. 8 ───────────────────────────────────────────────────────────────
    p.paragraph(
      ctx,
      'Cap. 8. Declar pe propria răspundere și sub sancțiunile Codului penal că datele și ' +
        'informațiile prezentate sunt complete și corespund realității și mă oblig să aduc la ' +
        'cunoștința autorităților, în scris și în termenul prevăzut de lege, orice modificare a ' +
        'situației mai sus prezentate care poate conduce la încetarea sau suspendarea drepturilor.',
      { size: 10, gap: 6 },
    )
    p.labeledField(ctx, { label: 'Numele solicitantului', name: 'nume_solicitant_declaratie', required: true, group: 'Cap. 8 — Declarația' })
    p.signatureFooter(ctx)

    // ── Angajament de plată ──────────────────────────────────────────────────
    const A = 'Angajament de plată'
    p.paragraph(ctx, 'ANGAJAMENT DE PLATĂ', { size: 12, gap: 8 })
    p.labeledField(ctx, { label: 'Subsemnatul/a (nume și prenume)', name: 'angajament_nume', required: true, group: A })
    p.twoColFields(
      ctx,
      { label: 'Cu domiciliul în', name: 'angajament_localitate', required: true, group: A },
      { label: 'Județul', name: 'angajament_judet', group: A },
    )
    p.labeledField(ctx, { label: 'Str., nr.', name: 'angajament_adresa', required: true, group: A })
    p.combField(ctx, { label: 'CNP', name: 'angajament_cnp', required: true, group: A }, { cells: 13 })
    p.labeledField(ctx, { label: 'C.I. seria și nr.', name: 'angajament_act_identitate', group: A })
    p.paragraph(
      ctx,
      'solicitant/beneficiar de venit minim de incluziune, declar prin prezenta că, în situația în ' +
        'care am încasat în mod necuvenit beneficii de asistență socială și s-a dispus recuperarea ' +
        'acestora prin dispoziție a primarului/decizie a directorului executiv al agenției ' +
        'teritoriale pentru plăți și inspecție socială, îmi iau angajamentul de a plăti aceste sume ' +
        'prin (bifați):',
      { size: 10, gap: 4 },
    )
    p.checkbox(ctx, {
      label:
        'restituire prin rețineri lunare din drepturile cuvenite și din alte beneficii de asistență ' +
        'socială acordate de plătitorul beneficiului pentru care s-a constituit debitul, până la ' +
        'achitarea integrală a sumei de care am beneficiat necuvenit;',
      name: 'angajament_retineri', group: A,
    })
    p.checkbox(ctx, { label: 'restituire voluntară din următoarele categorii de venituri pe care le obțin:', name: 'angajament_voluntar', group: A })
    p.labeledField(ctx, { label: 'Venituri din', name: 'angajament_venituri_1', group: A })
    p.labeledField(ctx, { label: 'Venituri din', name: 'angajament_venituri_2', group: A })
    p.paragraph(
      ctx,
      'Prezentul angajament l-am luat în conformitate cu art. 29 alin. (1) și (5) din Legea nr. ' +
        '196/2016 privind venitul minim de incluziune, cu modificările și completările ulterioare. ' +
        'Declar că înțeleg faptul că, în cazul nerespectării prezentului angajament de plată, se va ' +
        'proceda la executarea silită, potrivit prevederilor legale.',
      { size: 9.5, gap: 8 },
    )
    p.signatureFooter(ctx, { dateLabel: 'Data angajamentului', signatureLabel: 'Semnătura' })
  },
}

export default spec
