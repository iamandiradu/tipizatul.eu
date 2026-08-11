/**
 * Section E of the tichet-social cerere: the income table from Anexa 1,
 * Legea 248/2015 — 80 numbered categories under 18 legal headings.
 *
 * EXTRACTED, NOT TRANSCRIBED. Parsed from the scraped source by fixed
 * column positions, then validated: cods 1-80 with no gaps or duplicates and
 * no empty category text. Hand-copying 80 legal definitions is exactly where
 * content drift comes from, so the wording below is the source's own.
 *
 * `acte` is the "Acte doveditoare" column and is empty on
 * 44 rows: in the original it is a merged cell spanning a run of
 * rows, so the evidence named on the first row of a run applies to the rest.
 */

/** @type {{cod:number,heading:string,categoria:string,acte:string}[]} */
export const INCOME_ROWS = [
  {
    cod: 1,
    heading: "VENITURI DIN ACTIVITĂŢI INDEPENDENTE",
    categoria:
      "Venituri din profesii libere, veniturile obţinute din exercitarea profesiilor medicale, de avocat, notar, auditor financiar, consultant fiscal, expert contabil, contabil autorizat, consultant de plasament în valori mobiliare, arhitect sau a altor profesii reglementate, desfăşurate în mod independent, în condiţiile legii",
    acte: "adeverinţă eliberată de Administraţia financiară",
  },
  {
    cod: 2,
    heading: "VENITURI DIN ACTIVITĂŢI INDEPENDENTE",
    categoria:
      "Venituri comerciale provenite din fapte de comerţ ale contribuabililor, din prestări de servicii, precum şi din practicarea unei meserii",
    acte: "",
  },
  {
    cod: 3,
    heading: "VENITURI DIN ACTIVITĂŢI INDEPENDENTE",
    categoria:
      "Veniturile din valorificarea sub orice formă a drepturilor de proprietate intelectuală provin din brevete de invenţie, desene şi modele, mostre, mărci de fabrică şi de comerţ, procedee tehnice, know-how, din drepturi de autor şi drepturi conexe dreptului de autor şi altele asemenea",
    acte: "",
  },
  {
    cod: 4,
    heading: "SALARIUL ŞI ALTE DREPTURI SALARIALE",
    categoria:
      "Salariul obţinut pe bază de contract de muncă/raport de serviciu",
    acte: "adeverinţa eliberată de",
  },
  {
    cod: 5,
    heading: "SALARIUL ŞI ALTE DREPTURI SALARIALE",
    categoria:
      "Salariul asistentului personal al persoanei cu handicap",
    acte: "",
  },
  {
    cod: 6,
    heading: "SALARIUL ŞI ALTE DREPTURI SALARIALE",
    categoria:
      "Salariul asistentului maternal",
    acte: "",
  },
  {
    cod: 7,
    heading: "SALARIUL ŞI ALTE DREPTURI SALARIALE",
    categoria:
      "Salariul îngrijitorului la domiciliu al persoanei vârstnice dependente",
    acte: "",
  },
  {
    cod: 8,
    heading: "SALARIUL ŞI ALTE DREPTURI SALARIALE",
    categoria:
      "Venitul lunar realizat ca membru asociat sau persoană autorizată să desfăşoare o activitate independentă",
    acte: "adeverinţă eliberată de Adm. financiară",
  },
  {
    cod: 9,
    heading: "SALARIUL ŞI ALTE DREPTURI SALARIALE",
    categoria:
      "Indemnizaţia de şomaj şi/sau venit lunar de completare",
    acte: "mandat poştal/ extras de cont/decizie",
  },
  {
    cod: 10,
    heading: "SALARIUL ŞI ALTE DREPTURI SALARIALE",
    categoria:
      "Indemnizaţiile din activităţi desfăşurate ca urmare a unei funcţii de demnitate publică, stabilite potrivit legii",
    acte: "adeverinţă eliberată de Adm. financiară",
  },
  {
    cod: 11,
    heading: "SALARIUL ŞI ALTE DREPTURI SALARIALE",
    categoria:
      "Indemnizaţii din activităţi desfăşurate ca urmare a unei funcţii alese în cadrul persoanelor juridice fără scop patrimonial",
    acte: "",
  },
  {
    cod: 12,
    heading: "SALARIUL ŞI ALTE DREPTURI SALARIALE",
    categoria:
      "Drepturile de soldă lunară, indemnizaţiile, primele, premiile, sporurile şi alte drepturi ale personalului militar, acordate potrivit legii",
    acte: "",
  },
  {
    cod: 13,
    heading: "SALARIUL ŞI ALTE DREPTURI SALARIALE",
    categoria:
      "Indemnizaţia lunară brută, precum şi suma din profitul net, cuvenite administratorilor la companii/ societăţi naţionale, societăţi comerciale la care statul sau o autoritate a administraţiei publice locale este acţionar majoritar, precum şi la regiile autonome",
    acte: "",
  },
  {
    cod: 14,
    heading: "SALARIUL ŞI ALTE DREPTURI SALARIALE",
    categoria:
      "Remuneraţia obţinută de directori în baza unui contract de mandat conform prevederilor legii societăţilor comerciale",
    acte: "",
  },
  {
    cod: 15,
    heading: "SALARIUL ŞI ALTE DREPTURI SALARIALE",
    categoria:
      "Remuneraţia primită de preşedintele asociaţiei de proprietari sau de alte persoane, în baza contractului de mandat, potrivit legii privind înfiinţarea, organizarea şi funcţionarea asociaţiilor de proprietari",
    acte: "",
  },
  {
    cod: 16,
    heading: "SALARIUL ŞI ALTE DREPTURI SALARIALE",
    categoria:
      "Sumele primite de membrii fondatori ai societăţilor comerciale constituite prin subscripţie publică",
    acte: "",
  },
  {
    cod: 17,
    heading: "SALARIUL ŞI ALTE DREPTURI SALARIALE",
    categoria:
      "Sumele primite de reprezentanţii în adunarea generală a acţionarilor, în consiliul de administraţie, membrii directoratului şi ai consiliului de supraveghere, precum şi în comisia de cenzori",
    acte: "",
  },
  {
    cod: 18,
    heading: "SALARIUL ŞI ALTE DREPTURI SALARIALE",
    categoria:
      "Sumele primite de reprezentanţii în organisme tripartite, potrivit legii",
    acte: "",
  },
  {
    cod: 19,
    heading: "SALARIUL ŞI ALTE DREPTURI SALARIALE",
    categoria:
      "Indemnizaţia lunară a asociatului unic, la nivelul valorii înscrise în declaraţia de asigurări sociale",
    acte: "",
  },
  {
    cod: 20,
    heading: "SALARIUL ŞI ALTE DREPTURI SALARIALE",
    categoria:
      "Sumele acordate de organizaţii nonprofit şi de alte entităţi neplătitoare de impozit pe profit, peste limita de 2,5 ori nivelul legal stabilit pentru indemnizaţia primită pe perioada delegării şi detaşării în altă localitate, în ţară şi în străinătate, în interesul serviciului, pentru salariaţii din instituţiile publice",
    acte: "",
  },
  {
    cod: 21,
    heading: "SALARIUL ŞI ALTE DREPTURI SALARIALE",
    categoria:
      "Indemnizaţia administratorilor, precum şi suma din profitul net cuvenită administratorilor societăţilor comerciale potrivit actului constitutiv sau stabilită de adunarea generală a acţionarilor",
    acte: "adeverinţă eliberată de Adm. financiară",
  },
  {
    cod: 22,
    heading: "SALARIUL ŞI ALTE DREPTURI SALARIALE",
    categoria:
      "Sume reprezentând salarii sau diferenţe de salarii stabilite în baza unor hotărâri judecătoreşti rămase definitive şi irevocabile, precum şi actualizarea acestora cu indicele de inflaţie",
    acte: "",
  },
  {
    cod: 23,
    heading: "SALARIUL ŞI ALTE DREPTURI SALARIALE",
    categoria:
      "Indemnizaţiile lunare plătite conform legii de angajatori pe perioada de neconcurenţă, stabilite conform contractului individual de muncă",
    acte: "",
  },
  {
    cod: 24,
    heading: "SALARIUL ŞI ALTE DREPTURI SALARIALE",
    categoria:
      "Orice alte sume sau avantaje de natură salarială ori asimilate salariilor în vederea impunerii",
    acte: "",
  },
  {
    cod: 25,
    heading: "VENITURI DIN CEDAREA FOLOSINŢEI BUNURILOR",
    categoria:
      "Veniturile, în bani şi/sau în natură, provenind din cedarea folosinţei bunurilor mobile şi imobile, obţinute de către proprietar, uzufructuar sau alt deţinător legal, altele decât veniturile din activităţi independente",
    acte: "adeverinţă eliberată de Adm. financiară",
  },
  {
    cod: 26,
    heading: "VENITURI DIN INVESTIŢII",
    categoria:
      "Dividende",
    acte: "adeverinţă",
  },
  {
    cod: 27,
    heading: "VENITURI DIN INVESTIŢII",
    categoria:
      "Venituri impozabile din dobânzi",
    acte: "Adm.",
  },
  {
    cod: 28,
    heading: "VENITURI DIN INVESTIŢII",
    categoria:
      "Câştiguri din transferul titlurilor de valoare",
    acte: "",
  },
  {
    cod: 29,
    heading: "VENITURI DIN INVESTIŢII",
    categoria:
      "Venituri din operaţiuni de vânzare-cumpărare de valută la termen, pe bază de contract, precum şi orice alte operaţiuni similare",
    acte: "adeverinţă eliberată de Adm. financiară",
  },
  {
    cod: 30,
    heading: "VENITURI DIN INVESTIŢII",
    categoria:
      "Venituri din lichidarea unei persoane juridice",
    acte: "",
  },
  {
    cod: 31,
    heading: "PENSII DE STAT",
    categoria:
      "Pensia pentru limită de vârstă",
    acte: "mandat poştal/",
  },
  {
    cod: 32,
    heading: "PENSII DE STAT",
    categoria:
      "Pensia anticipată",
    acte: "cont/decizie",
  },
  {
    cod: 33,
    heading: "PENSII DE STAT",
    categoria:
      "Pensia anticipată parţială",
    acte: "",
  },
  {
    cod: 34,
    heading: "PENSII DE STAT",
    categoria:
      "Pensia de invaliditate",
    acte: "",
  },
  {
    cod: 35,
    heading: "PENSII DE STAT",
    categoria:
      "Pensia de urmaş",
    acte: "",
  },
  {
    cod: 36,
    heading: "PENSII AGRICULTORI",
    categoria:
      "Pensie agricultor",
    acte: "mandat poştal/ extras de cont/decizie",
  },
  {
    cod: 37,
    heading: "PENSII MILITARE",
    categoria:
      "Pensie de serviciu",
    acte: "mandat poştal/",
  },
  {
    cod: 38,
    heading: "PENSII MILITARE",
    categoria:
      "Pensia de invaliditate",
    acte: "cont/decizie",
  },
  {
    cod: 39,
    heading: "PENSII MILITARE",
    categoria:
      "Pensia de urmaş",
    acte: "",
  },
  {
    cod: 40,
    heading: "PENSII MILITARE",
    categoria:
      "Pensia I.O.V.R.",
    acte: "",
  },
  {
    cod: 41,
    heading: "INDEMNIZAŢII",
    categoria:
      "Indemnizaţia pt. persoanele care şi-au pierdut total sau parţial capacitatea de muncă ca urmare a participării la revoluţie şi pt. urmaşii acestora",
    acte: "mandat poştal/ extras de cont/decizie",
  },
  {
    cod: 42,
    heading: "INDEMNIZAŢII",
    categoria:
      "Indemnizaţia de însoţitor pentru pensionari gr. I invaliditate/ nevăzători handicap grav",
    acte: "",
  },
  {
    cod: 43,
    heading: "INDEMNIZAŢII",
    categoria:
      "Indemnizaţia pentru incapacitatea temporară de muncă",
    acte: "adeverinţă angajator",
  },
  {
    cod: 44,
    heading: "INDEMNIZAŢII",
    categoria:
      "Indemnizaţia lunară pentru activitatea de liber-profesionist a artiştilor interpreţi sau executanţi",
    acte: "",
  },
  {
    cod: 45,
    heading: "INDEMNIZAŢII ŞI STIMULENTE PENTRU CREŞTEREA COPILULUI",
    categoria:
      "Indemnizaţia pentru maternitate",
    acte: "adeverinţă angajator",
  },
  {
    cod: 46,
    heading: "INDEMNIZAŢII ŞI STIMULENTE PENTRU CREŞTEREA COPILULUI",
    categoria:
      "Indemnizaţia pentru creşterea copilului până la vârsta de 1, 2 sau 3 ani",
    acte: "mandat poştal/ extras de cont/decizie",
  },
  {
    cod: 47,
    heading: "INDEMNIZAŢII ŞI STIMULENTE PENTRU CREŞTEREA COPILULUI",
    categoria:
      "Stimulent lunar/de inserţie",
    acte: "",
  },
  {
    cod: 48,
    heading: "INDEMNIZAŢII ŞI STIMULENTE PENTRU CREŞTEREA COPILULUI",
    categoria:
      "Indemnizaţia şi ajutoare pentru creşterea copilului cu handicap",
    acte: "",
  },
  {
    cod: 49,
    heading: "INDEMNIZAŢII CU CARACTER PERMANENT",
    categoria:
      "Indemnizaţia lunară acordată magistraţilor înlăturaţi din justiţie din considerente politice",
    acte: "mandat poştal/ extras de cont/decizie",
  },
  {
    cod: 50,
    heading: "INDEMNIZAŢII CU CARACTER PERMANENT",
    categoria:
      "Indemnizaţia lunară acordată persoanelor persecutate din motive politice sau etnice",
    acte: "",
  },
  {
    cod: 51,
    heading: "INDEMNIZAŢII CU CARACTER PERMANENT",
    categoria:
      "Indemnizaţia, sporul sau renta acordată invalizilor, veteranilor şi văduvelor de război",
    acte: "",
  },
  {
    cod: 52,
    heading: "INDEMNIZAŢII CU CARACTER PERMANENT",
    categoria:
      "Indemnizaţia lunară pentru persoanele care au efectuat stagiul militar în cadrul Direcţiei Generale a Serviciului Muncii în perioada 1950 - 1961",
    acte: "mandat poştal/ extras de cont/decizie",
  },
  {
    cod: 53,
    heading: "INDEMNIZAŢII CU CARACTER PERMANENT",
    categoria:
      "Indemnizaţia lunară pentru pensionarii sistemului de pensii, membri ai uniunilor de creaţie, legal constituite şi recunoscute ca persoane juridice de utilitate publică",
    acte: "",
  },
  {
    cod: 54,
    heading: "INDEMNIZAŢII CU CARACTER PERMANENT",
    categoria:
      "Indemnizaţia lunară pentru persoanele cu handicap",
    acte: "",
  },
  {
    cod: 55,
    heading: "INDEMNIZAŢII CU CARACTER PERMANENT",
    categoria:
      "Indemnizaţia cuvenită revoluţionarilor",
    acte: "",
  },
  {
    cod: 56,
    heading: "INDEMNIZAŢII CU CARACTER PERMANENT",
    categoria:
      "Indemnizaţia de merit acordată în temeiul Legii nr. 118/2002",
    acte: "",
  },
  {
    cod: 57,
    heading: "INDEMNIZAŢII CU CARACTER PERMANENT",
    categoria:
      "Renta viageră pentru sportivi",
    acte: "",
  },
  {
    cod: 58,
    heading: "VENITURI DIN ACTIVITĂŢI AGRICOLE",
    categoria:
      "Venituri din cultivarea şi valorificarea florilor, legumelor şi zarzavaturilor, în sere şi solare special destinate acestor scopuri şi/ sau în sistem irigat",
    acte: "adeverinţă eliberată de Administraţia financiară",
  },
  {
    cod: 59,
    heading: "VENITURI DIN ACTIVITĂŢI AGRICOLE",
    categoria:
      "Venituri din cultivarea şi valorificarea arbuştilor, plantelor decorative şi ciupercilor",
    acte: "",
  },
  {
    cod: 60,
    heading: "VENITURI DIN ACTIVITĂŢI AGRICOLE",
    categoria:
      "Venituri din exploatarea pepinierelor viticole şi pomicole şi altele asemenea",
    acte: "adeverinţă eliberată de Administraţia",
  },
  {
    cod: 61,
    heading: "VENITURI DIN ACTIVITĂŢI AGRICOLE",
    categoria:
      "Venituri din valorificarea produselor agricole obţinute după recoltare, în stare naturală, de pe terenurile agricole proprietate privată sau luate în arendă, către unităţi specializate pentru colectare, unităţi de procesare industrială sau către alte unităţi, pentru utilizare ca atare",
    acte: "",
  },
  {
    cod: 62,
    heading: "VENITURI DIN PREMII ŞI DIN JOCURI DE NOROC",
    categoria:
      "Veniturile din premii ce cuprind veniturile din concursuri",
    acte: "adeverinţă eliberată de",
  },
  {
    cod: 63,
    heading: "VENITURI DIN PREMII ŞI DIN JOCURI DE NOROC",
    categoria:
      "Veniturile din jocuri de noroc ce cuprind câştigurile realizate ca urmare a participării la jocuri de noroc, inclusiv cele de tip jack-pot",
    acte: "financiară",
  },
  {
    cod: 64,
    heading: "ŞI AL DEZMEMBRĂMINTELOR ACESTUIA",
    categoria:
      "Venituri din transferul dreptului de proprietate şi al dezmembrămintelor acestuia, altele decât cele cu titlu de moştenire",
    acte: "adeverinţă eliberată de Administraţia financiară",
  },
  {
    cod: 65,
    heading: "VENITURI DIN ALTE SURSE",
    categoria:
      "Prime de asigurări suportate de o persoană fizică independentă sau de orice altă entitate, în cadrul unei activităţi pentru o persoană fizică în legătură cu care suportatorul nu are o relaţie generatoare de venituri din salarii",
    acte: "adeverinţă eliberată de Administraţia financiară",
  },
  {
    cod: 66,
    heading: "VENITURI DIN ALTE SURSE",
    categoria:
      "Câştiguri primite de la societăţile de asigurări, ca urmare a contractului de asigurare încheiat între părţi, cu ocazia tragerilor de amortizare",
    acte: "",
  },
  {
    cod: 67,
    heading: "VENITURI DIN ALTE SURSE",
    categoria:
      "Venituri, sub forma diferenţelor de preţ pentru anumite bunuri, servicii şi alte drepturi, primite de persoanele fizice pensionari, foşti salariaţi, potrivit clauzelor contractului de muncă sau în baza unor legi speciale",
    acte: "",
  },
  {
    cod: 68,
    heading: "VENITURI DIN ALTE SURSE",
    categoria:
      "Venituri primite de persoanele fizice reprezentând onorarii din activitatea de arbitraj comercial",
    acte: "",
  },
  {
    cod: 69,
    heading: "VENITURI DIN ALTE SURSE",
    categoria:
      "Venituri din alte surse sunt orice venituri identificate ca fiind impozabile",
    acte: "",
  },
  {
    cod: 70,
    heading: "VENITURI OBŢINUTE DIN STRĂINĂTATE",
    categoria:
      "Venituri obţinute din străinătate",
    acte: "Contract de muncă",
  },
  {
    cod: 71,
    heading: "ALOCAŢII",
    categoria:
      "Alocaţia de stat pentru copii",
    acte: "mandat poştal/",
  },
  {
    cod: 72,
    heading: "ALOCAŢII",
    categoria:
      "Alocaţia lunară de plasament",
    acte: "cont/decizie",
  },
  {
    cod: 73,
    heading: "ALOCAŢII",
    categoria:
      "Alocaţia de întreţinere",
    acte: "Hotărâre judecătorească",
  },
  {
    cod: 74,
    heading: "ALOCAŢII",
    categoria:
      "Burse pentru elevi",
    acte: "adeverinţă",
  },
  {
    cod: 75,
    heading: "ALOCAŢII",
    categoria:
      "Burse pentru studenţi",
    acte: "învăţământ",
  },
  {
    cod: 76,
    heading: "AJUTOARE",
    categoria:
      "Ajutorul bănesc lunar pentru persoanele care au devenit incapabile de muncă în perioada efectuării unei pedepse privative de libertate",
    acte: "mandat poştal/ extras de cont/decizie",
  },
  {
    cod: 77,
    heading: "ALTE SURSE DE VENIT",
    categoria:
      "Depozite bancare",
    acte: "adeverinţă eliberată de",
  },
  {
    cod: 78,
    heading: "ALTE SURSE DE VENIT",
    categoria:
      "Rentă viageră agricolă",
    acte: "financiară",
  },
  {
    cod: 79,
    heading: "ALTE SURSE DE VENIT",
    categoria:
      "Alte venituri",
    acte: "",
  },
  {
    cod: 80,
    heading: "ALTE SURSE DE VENIT",
    categoria:
      "Venituri potenţiale obţinute din valorificarea unor bunuri mobile şi imobile (conform HCL)***",
    acte: "",
  },
]

/** Distinct headings, in source order. */
export const INCOME_HEADINGS = [...new Set(INCOME_ROWS.map((r) => r.heading))]
