// Romanian locality → county mapping for institutions whose `county` field is
// missing in index.json. Covers every locality that appears as a substring in
// the 331 institution names without a county. County names use the canonical
// ASCII forms used elsewhere in the corpus (e.g. "Iasi", "Caras-Severin").
//
// When a locality has homonyms in multiple counties, we pick the largest /
// most prominent one (e.g. "Stefanesti" → Botosani, the town, not the smaller
// commune in Arges). That bias is fine because the corpus is dominated by
// administrative bodies tied to the bigger settlement.

export const LOCALITY_TO_COUNTY = {
  // ── County self-references (so "X Judet/Judetean Brăila" resolves) ───────
  Alba: 'Alba',
  Arad: 'Arad',
  Arges: 'Arges',
  Bacau: 'Bacau',
  Bihor: 'Bihor',
  'Bistrita-Nasaud': 'Bistrita-Nasaud',
  Botosani: 'Botosani',
  Braila: 'Braila',
  Brasov: 'Brasov',
  Bucuresti: 'Bucuresti',
  Buzau: 'Buzau',
  Calarasi: 'Calarasi',
  'Caras-Severin': 'Caras-Severin',
  Cluj: 'Cluj',
  Constanta: 'Constanta',
  Covasna: 'Covasna',
  Dambovita: 'Dambovita',
  Dolj: 'Dolj',
  Galati: 'Galati',
  Gorj: 'Gorj',
  Harghita: 'Harghita',
  Hunedoara: 'Hunedoara',
  Ialomita: 'Ialomita',
  Iasi: 'Iasi',
  Ilfov: 'Ilfov',
  Maramures: 'Maramures',
  Mehedinti: 'Mehedinti',
  Mures: 'Mures',
  Neamt: 'Neamt',
  Olt: 'Olt',
  Prahova: 'Prahova',
  Salaj: 'Salaj',
  'Satu Mare': 'Satu Mare',
  Sibiu: 'Sibiu',
  Suceava: 'Suceava',
  Teleorman: 'Teleorman',
  Timis: 'Timis',
  Tulcea: 'Tulcea',
  Valcea: 'Valcea',
  Vaslui: 'Vaslui',
  Vrancea: 'Vrancea',

  // ── Municipalities, towns, communes mentioned in institution names ───────
  Abrud: 'Alba',
  Aiud: 'Alba',
  'Alba Iulia': 'Alba',
  Alexandria: 'Teleorman',
  Andrasesti: 'Ialomita',
  Anina: 'Caras-Severin',
  'Baia de Aries': 'Alba',
  'Baia Sprie': 'Maramures',
  Baicoi: 'Prahova',
  'Baile Olanesti': 'Valcea',
  Balcesti: 'Valcea',
  Bals: 'Olt',
  Barlad: 'Vaslui',
  Beresti: 'Bacau',
  'Beresti-Bistrita': 'Bacau',
  Bontida: 'Cluj',
  Borsa: 'Maramures',
  Borsec: 'Harghita',
  Botosani: 'Botosani',
  Bragadiru: 'Ilfov',
  Brosteni: 'Suceava',
  Budesti: 'Calarasi',
  'Caianu Mic': 'Bistrita-Nasaud',
  Calafat: 'Dolj',
  Campina: 'Prahova',
  Caransebes: 'Caras-Severin',
  Cazanesti: 'Ialomita',
  Cernavoda: 'Constanta',
  Cernica: 'Ilfov',
  Certesti: 'Galati',
  Ciochina: 'Ialomita',
  Ciorogarla: 'Ilfov',
  Ciuruleasa: 'Alba',
  'Cisnadie': 'Sibiu',
  'Cluj-Napoca': 'Cluj',
  Codlea: 'Brasov',
  Comisani: 'Dambovita',
  Constanta: 'Constanta',
  Corabia: 'Olt',
  'Costache Negri': 'Galati',
  Craiova: 'Dolj',
  'Cristuru Secuiesc': 'Harghita',
  Cruset: 'Gorj',
  Curtici: 'Arad',
  Dej: 'Cluj',
  Deta: 'Timis',
  Deva: 'Hunedoara',
  Dorohoi: 'Botosani',
  Dragalina: 'Calarasi',
  'Filipestii de Targ': 'Dambovita',
  Flamanzi: 'Botosani',
  Focsani: 'Vrancea',
  Gaesti: 'Dambovita',
  Geoagiu: 'Hunedoara',
  Gherla: 'Cluj',
  'Gheorghe Doja': 'Mures',
  Giurgiu: 'Giurgiu',
  Goruia: 'Caras-Severin',
  Gradinari: 'Caras-Severin',
  Grumazesti: 'Neamt',
  Gruiu: 'Ilfov',
  Gurahont: 'Arad',
  Harsova: 'Constanta',
  Hateg: 'Hunedoara',
  Homocea: 'Vrancea',
  Horezu: 'Valcea',
  Husi: 'Vaslui',
  Ianca: 'Braila',
  Ineu: 'Arad',
  'Intorsura Buzaului': 'Covasna',
  Isaccea: 'Tulcea',
  Isalnita: 'Dolj',
  Jijila: 'Tulcea',
  Lugoj: 'Timis',
  Macin: 'Tulcea',
  Magiresti: 'Bacau',
  Mahmudia: 'Tulcea',
  Marasesti: 'Vrancea',
  Mioveni: 'Arges',
  Mogosoaia: 'Ilfov',
  Moinesti: 'Bacau',
  Moreni: 'Dambovita',
  'Movila Miresii': 'Braila',
  Murighiol: 'Tulcea',
  'Negresti': 'Vaslui',
  'Negru Voda': 'Constanta',
  Nehoiu: 'Buzau',
  Nucet: 'Bihor',
  'Ocna de Fier': 'Caras-Severin',
  Oltenita: 'Calarasi',
  Onesti: 'Bacau',
  Oradea: 'Bihor',
  Orastie: 'Hunedoara',
  Orsova: 'Mehedinti',
  Paleu: 'Bihor',
  Panciu: 'Vrancea',
  Pechea: 'Galati',
  Pitesti: 'Arges',
  Plescuta: 'Arad',
  Ploiesti: 'Prahova',
  Predeal: 'Brasov',
  'Ramnicu Sarat': 'Buzau',
  Resita: 'Caras-Severin',
  'Rosiorii de Vede': 'Teleorman',
  Rovinari: 'Gorj',
  Roznov: 'Neamt',
  'Runcu Salvei': 'Bistrita-Nasaud',
  Sabaoani: 'Neamt',
  Salistea: 'Alba',
  Saniob: 'Bihor',
  Satulung: 'Maramures',
  Saveni: 'Botosani',
  Scanteiesti: 'Galati',
  Sebes: 'Alba',
  Sebis: 'Arad',
  'Sfantu Gheorghe': 'Covasna',
  'Sighetu Marmatiei': 'Maramures',
  Simeria: 'Hunedoara',
  Sinaia: 'Prahova',
  Siret: 'Suceava',
  'Slava Cercheza': 'Tulcea',
  Slimnic: 'Sibiu',
  Solca: 'Suceava',
  'Somcuta Mare': 'Maramures',
  Sovata: 'Mures',
  Stefanesti: 'Botosani',
  Sulina: 'Tulcea',
  Tamaseni: 'Neamt',
  Tandarei: 'Ialomita',
  'Targoviste': 'Dambovita',
  'Targu Bujor': 'Galati',
  'Targu Carbunesti': 'Gorj',
  'Targu-Jiu': 'Gorj',
  'Targu Jiu': 'Gorj',
  Tasnad: 'Satu Mare',
  Tecuci: 'Galati',
  Techirghiol: 'Constanta',
  Telciu: 'Bistrita-Nasaud',
  'Ticleni': 'Gorj',
  'Ticvaniu Mare': 'Caras-Severin',
  Timisoara: 'Timis',
  Tismana: 'Gorj',
  Topolog: 'Tulcea',
  Turceni: 'Gorj',
  Turda: 'Cluj',
  'Valea lui Mihai': 'Bihor',
  'Valea Marului': 'Galati',
  Vascau: 'Bihor',
  Victoria: 'Brasov',
  Voluntari: 'Ilfov',
  'Vulcana-Pandele': 'Dambovita',
  Zapodeni: 'Vaslui',
  Zlatna: 'Alba',
}

// Patterns that signal a national / central-government institution. We map
// these to "Bucuresti" because that's where the HQ sits and where users would
// look in the catalog. Order matters: the first match wins.
export const NATIONAL_PATTERNS = [
  /^Ministerul\b/i,
  /^Ministerul\s/i,
  /^Agentia\s+Nationala\b/i,
  /^Autoritatea\s+Nationala\b/i,
  /^Autoritatea\s+(Aeronautica|Feroviara|Navala|Rutiera)\b/i,
  /^Autoritatea\s+pentru\b/i,
  /^Centrul\s+National\b/i,
  /^Directia\s+Nationala\b/i,
  /^Agentia\s+Romana\b/i,
  /^Institutul\s+pentru\b/i,
  /^Inspectoratul\s+(de\s+Stat|General)\b/i,
  /^Inspectia\s+(de\s+Stat|Muncii)\b/i,
  /^Institutul\s+National\b/i,
  /^Institutul\s+de\s+Stat\b/i,
  /^Oficiul\s+(National|Roman|de\s+Stat|Romand)\b/i,
  /^Casa\s+Nationala\b/i,
  /^Administratia\s+(Nationala|Fondului|Rezervatiei)\b/i,
  /^Camera\s+(Consultantilor|Nationala)\b/i,
  /^Comisia\s+(de\s+clasificare|de\s+abilitare)\b/i,
  /^Comisii\s+de\s+abilitare\b/i,
  /^Consiliul\s+de\s+Mediere\b/i,
  /^Colegiul\s+(Medicilor\s+(din\s+Romania|Veterinari)|Farmaci|Fizioterapeutilor|National)/i,
  /^Ordinul\s+(Arhitectilor|Asistentilor|Tehnicienilor)/i,
  /^Uniunea\s+Nationala\b/i,
  /^Asociatia\s+Nationala\b/i,
  /Romania\s*[-–]?\s*(SA|S\.A\.)?\s*$/i, // tail-like "SC X SA Romania" — careful
  /^Arhivele\s+(Nationale|Militare)\b/i,
  /^Registrul\s+(Auto|Urbanistilor)\b/i,
  /^Serviciul\s+Roman\b/i,
  /^Directia\s+(Nationala|Generala)\s+(de\s+Pasapoarte|Turism|Logistica)/i,
  /^Biroul\s+Roman\b/i,
  /^MADR\b/,
  /^Academia\s+(Nationala|Tehnica\s+Militara|Fortelor|Navala|de\s+Politie)\b/i,
  /^Scoala\s+Nationala\b/i,
  /^CREDIDAM\b/,
  /^UCMR-ADA\b/,
  /^ANCOM\b/,
  /^Corpul\s+Expertilor\b/i,
  /^Camera\s+Consultantilor\b/i,
]

// Sector institutions → Bucuresti.
export const SECTOR_PATTERN = /\bSector(?:ul|ului)?\s*\d\b|\bSector\s+\d\b/i

// Specific organization → county overrides for cases the generic logic gets
// wrong or that don't fit any pattern (universities with city baked in, etc.).
export const ORG_OVERRIDES = {
  'S.C. APA PROD S.A. Deva': 'Hunedoara',
  'Aquatim S.A.': 'Timis',
  'CPL Concordia Filiala Cluj România SRL': 'Cluj',
  'APAVITAL S.A.': 'Iasi',
  'Compania de Apa Somes S.A.': 'Cluj',
  'Conpet S.A.': 'Prahova',
  'Distrigaz Sud Retele': 'Bucuresti',
  'Delgaz Grid S.A.': 'Mures',
  'Orange Romania S.A.': 'Bucuresti',
  'Retele Electrice Romania SA': 'Bucuresti',
  'Compania Municipala Termoenergetica Bucuresti S.A.': 'Bucuresti',
  'SC Termoficare Napoca SA': 'Cluj',
  'Solceta SA': 'Suceava',
  'Societatea de Transport Public Timisoara': 'Timis',
  'CT Bus S.A.': 'Constanta',
  'Politia Locala Ploiesti': 'Prahova',
  'Cresa Oradea': 'Bihor',
  'Serviciul Public Finante Locale - Municipiul Ploiesti': 'Prahova',
  'Administratia Serviciilor Sociale Comunitare Ploiesti': 'Prahova',
  'Directia de Asistenta Sociala a Municipiului Pitesti': 'Arges',
  'Directia de Asistenta Sociala Dorohoi': 'Botosani',
  'Directia de Asistenta Sociala Husi': 'Vaslui',
  'Directia de Asistenta Sociala Macin': 'Tulcea',
  'Directia de Asistenta Sociala Oradea': 'Bihor',
  'Directia de Asistenta Sociala Orsova': 'Mehedinti',
  'Directia de Asistenta Sociala Ramnicu Sarat': 'Buzau',
  'Directia de Asistenta Sociala Resita': 'Caras-Severin',
  'Directia de Asistenta Sociala Sebes': 'Alba',
  'Directia de Asistenta Sociala Sighetu Marmației': 'Maramures',
  'Directia de Asistenta Sociala Targoviste': 'Dambovita',
  'Directia de Asistenta Sociala Tecuci': 'Galati',
  'Directia Publica de Asistenta Sociala Harsova': 'Constanta',
  'Directia de Sanatate Publica Cluj-Napoca': 'Cluj',
  'Directia de Sanatate Publica Giurgiu': 'Giurgiu',
  'Inspectoratul Scolar Judetean Alba': 'Alba',
  'Institutia Prefectului Judetul Brăila': 'Braila',
  'Colegiul Medicilor Brăila': 'Braila',
  'Colegiul Medicilor Botoșani': 'Botosani',
  'Universitatea Babeș-Bolyai din Cluj-Napoca': 'Cluj',
  'Universitatea Tehnica Cluj-Napoca': 'Cluj',
  'Universitatea de Stiinte Agricole si Medicina Veterinara din Cluj-Napoca': 'Cluj',
  'Universitatea de Medicina si Farmacie Iuliu Hatieganu Cluj-Napoca': 'Cluj',
  'Universitatea de Arta si Design din Cluj-Napoca': 'Cluj',
  'Universitatea Sapientia din Cluj-Napoca': 'Cluj',
  'Institutul Teologic Protestant din Cluj-Napoca': 'Cluj',
  'Universitatea de Medicina si Farmacie Victor Babes din Timisoara': 'Timis',
  'Universitatea de Vest din Timisoara': 'Timis',
  'Universitatea Politehnica Timisoara': 'Timis',
  'Universitatea din Oradea': 'Bihor',
  'Universitatea Emanuel din Oradea': 'Bihor',
  'Universitatea Agora din Municipiul Oradea': 'Bihor',
  'Universitatea Crestina Partium': 'Bihor',
  'Universitatea din Pitesti': 'Arges',
  'Universitatea din Craiova': 'Dolj',
  'Universitatea Petrol-Gaze din Ploiești': 'Prahova',
  'Universitatea 1 Decembrie 1918 din Alba Iulia': 'Alba',
  'Universitatea Eftimie Murgu din Resita': 'Caras-Severin',
  'Universitatea Adventus din Cernica': 'Ilfov',
  'Universitatea Bioterra din București': 'Bucuresti',
  'Universitatea Constantin Brancoveanu': 'Bucuresti',
  'Universitatea Spiru Haret': 'Bucuresti',
  'Universitatea Romano-Americana': 'Bucuresti',
  'Universitatea Nationala de Aparare Carol I': 'Bucuresti',
  'Universitatea Nationala de Arta Teatrala si Cinematografica I.L.Caragiale': 'Bucuresti',
  'Universitatea de Arhitectura si Urbanism Ion Mincu': 'Bucuresti',
  'Academia Nationala de Muzica Gheorghe Dima': 'Cluj',
  'Academia Navala Mircea cel Batran': 'Constanta',
  'Academia Fortelor Aeriene Henri Coanda': 'Brasov',
  'Academia Tehnica Militara Ferdinand I': 'Bucuresti',
  'Academia Nationala de Informatii Mihai Viteazul': 'Bucuresti',
  'Academia de Politie Alexandru Ioan Cuza': 'Bucuresti',
  'Institutul de Administrare a Afacerilor din municipiul București': 'Bucuresti',
  'Institutul Teologic Romano-Catolic Franciscan': 'Bucuresti',
  'Fundatia pentru Cultura si Invatamant Ioan Slavici-Universitatea Ioan Slavici': 'Timis',
  'Scoala Nationala de Studii Politice și Administrative': 'Bucuresti',
  'Administratia Rezervatiei Biosferei Delta Dunarii': 'Tulcea',
  'Inspectoratul General al Politiei de Frontiera - I.T.P.F. Timisoara': 'Timis',
  'Inspectoratul General al Politiei de Frontiera - I.T.P.F. Sighetu Marmatiei': 'Maramures',
  'Inspectoratul General al Politiei de Frontiera - I.T.P.F. Oradea': 'Bihor',
  'Inspectoratul General al Politiei de Frontiera - Garda de Coasta': 'Constanta',
  'Ministerul Apărării Naţionale -Spitalul Miltar de Urgentă Dr. Alexandru Popescu - Focşani': 'Vrancea',
  'Ministerul Apărării Naționale - Spitalul Militar de Urgență Dr. Alexandru Gafencu, Constanța': 'Constanta',
  'Ministerul Apararii Nationale - Spitalul Clinic Militar de Urgenta, dr. Victor Popescu, Timisoara': 'Timis',
  'Ministerul Apararii Nationale - Spitalul Clinic de Urgenta Militar Dr. Stefan Odobleja Craiova': 'Dolj',
  'Ministerul Apararii Nationale - Spitalul Militar de Urgenta Dr. Ion Jianu  Pitesti': 'Arges',
}

function diacriticless(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

const LOCALITY_KEYS = Object.keys(LOCALITY_TO_COUNTY)
  .sort((a, b) => b.length - a.length)
  .map((key) => ({ key, needle: diacriticless(key) }))

const ORG_OVERRIDE_NORMALIZED = new Map(
  Object.entries(ORG_OVERRIDES).map(([k, v]) => [diacriticless(k), v]),
)

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function deriveCountyFromOrg(institution, providedCity) {
  if (!institution) return undefined

  // 1. Explicit override wins (diacritic-insensitive).
  const normInst = diacriticless(institution)
  if (ORG_OVERRIDE_NORMALIZED.has(normInst)) return ORG_OVERRIDE_NORMALIZED.get(normInst)

  // 2. Bucharest sectors are easy.
  if (SECTOR_PATTERN.test(institution)) return 'Bucuresti'

  // 3. Use the providedCity from index.json when we have a mapping for it.
  if (providedCity) {
    const direct = LOCALITY_TO_COUNTY[providedCity]
    if (direct) return direct
    // try diacriticless lookup
    const cityDia = diacriticless(providedCity)
    for (const { key, needle } of LOCALITY_KEYS) {
      if (needle === cityDia) return LOCALITY_TO_COUNTY[key]
    }
  }

  // 4. National-institution patterns → Bucuresti.
  for (const re of NATIONAL_PATTERNS) {
    if (re.test(institution)) return 'Bucuresti'
  }

  // 5. Look for any locality token in the institution name.
  const hay = diacriticless(institution)
  for (const { key, needle } of LOCALITY_KEYS) {
    const re = new RegExp(`\\b${escapeRegex(needle)}\\b`)
    if (re.test(hay)) return LOCALITY_TO_COUNTY[key]
  }

  return undefined
}
