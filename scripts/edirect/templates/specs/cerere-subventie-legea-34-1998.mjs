/**
 * Cerere de solicitare a subvenției în temeiul Legii nr. 34/1998 — asociații,
 * fundații și culte acreditate ca furnizori de servicii sociale.
 *
 * National model, authored from the DASM Cluj-Napoca copy
 * (`Cerere-de-solicitare-a-subventiei-in-temeiul-Legii-nr.34-1998-si-anexe-la-
 * cerere.pdf`). Reproduced here: the cerere itself — Cap. I date despre
 * furnizor, Cap. II experiența, Cap. III subvenția solicitată cu grila pe
 * unități de asistență socială — and the declaration on propria răspundere
 * that closes it.
 *
 * NOT reproduced: „Anexa A — Fișa tehnică privind unitatea de asistență
 * socială" and „Anexa B — Bugetul de venituri și cheltuieli". Both are
 * multi-page narrative annexes (Anexa A alone asks for up to three pages of
 * free description per unit, plus staffing and premises data that differ by
 * service type), filled once per unit rather than once per application. They
 * stay download-only, and the description below says so, rather than being
 * flattened into a field list that would not match what the evaluator expects.
 *
 * Left generic (no `organization`): the subsidy is applied for at every county
 * and local authority. It reaches DASM Cluj's procedure page through the joins.
 */

const I = 'I. Date despre asociație/fundație/cult'
const P = 'I. Președintele și responsabilul financiar'
const II = 'II. Experiența în domeniul serviciilor de asistență socială'
const III = 'III. Subvenția solicitată'
const D = 'Declarația persoanei împuternicite'

/** @type {import('../lib/author.mjs').ArchetypeSpec} */
export const spec = {
  id: 'cerere-subventie-legea-34-1998',
  name: 'Cerere de solicitare a subvenției în temeiul Legii nr. 34/1998',
  title: 'CERERE de solicitare a subvenției în temeiul Legii nr. 34/1998',
  description:
    'Cererea prin care o asociație, fundație sau un cult recunoscut în România, acreditat ca ' +
    'furnizor de servicii sociale, solicită subvenția de la bugetul de stat sau local în temeiul ' +
    'Legii nr. 34/1998. Anexele A (fișa tehnică a unității de asistență socială) și B (bugetul de ' +
    'venituri și cheltuieli) se completează separat, pe formularele descărcate de la instituție.',
  category: 'Cereri',

  body(ctx, p) {
    p.paragraph(ctx, 'I. Date despre asociație/fundație/cult recunoscut în România, acreditat ca furnizor de servicii sociale potrivit legii', { size: 10.5, gap: 6 })
    p.labeledField(ctx, { label: '1. Denumirea', name: 'denumire', required: true, group: I })
    p.labeledField(ctx, { label: 'Cu sediul în (localitatea, strada, sector/județ)', name: 'sediu', required: true, group: I })
    p.twoColFields(
      ctx,
      { label: 'Telefon', name: 'telefon', required: true, group: I },
      { label: 'Cod fiscal nr.', name: 'cod_fiscal', required: true, maxLength: 12, group: I },
    )
    p.twoColFields(
      ctx,
      { label: 'Codul fiscal emis de', name: 'cod_fiscal_emis_de', group: I },
      { label: 'Din data de', name: 'cod_fiscal_data', group: I },
    )
    p.paragraph(ctx, '2. Dobândirea personalității juridice:', { size: 10, gap: 4 })
    p.twoColFields(
      ctx,
      { label: 'Hotărârea nr.', name: 'hotarare_nr', required: true, group: I },
      { label: 'Din data de', name: 'hotarare_data', group: I },
    )
    p.labeledField(ctx, { label: 'Pronunțată de', name: 'hotarare_pronuntata_de', group: I })
    p.labeledField(ctx, {
      label: 'Certificat de înscriere în Registrul asociațiilor, fundațiilor și cultelor acreditate ca furnizori de servicii sociale',
      name: 'certificat_registru',
      required: true,
      group: I,
    })
    p.paragraph(ctx, '4. Contul bancar:', { size: 10, gap: 4 })
    p.labeledField(ctx, { label: 'Nr. contului bancar (IBAN)', name: 'iban', required: true, group: I })
    p.twoColFields(
      ctx,
      { label: 'Deschis la banca', name: 'banca', required: true, group: I },
      { label: 'Cu sediul în', name: 'banca_sediu', group: I },
    )

    p.paragraph(ctx, '5. Date personale ale președintelui:', { size: 10, gap: 4 })
    p.twoColFields(
      ctx,
      { label: 'Numele', name: 'presedinte_nume', required: true, group: P },
      { label: 'Prenumele', name: 'presedinte_prenume', required: true, group: P },
    )
    p.labeledField(ctx, { label: 'Domiciliul (localitatea, strada, sector/județ)', name: 'presedinte_domiciliu', group: P })
    p.labeledField(ctx, { label: 'Telefon', name: 'presedinte_telefon', group: P })

    p.paragraph(ctx, '6. Date personale ale responsabilului financiar:', { size: 10, gap: 4 })
    p.twoColFields(
      ctx,
      { label: 'Numele', name: 'financiar_nume', required: true, group: P },
      { label: 'Prenumele', name: 'financiar_prenume', required: true, group: P },
    )
    p.labeledField(ctx, { label: 'Domiciliul (localitatea, strada, sector/județ)', name: 'financiar_domiciliu', group: P })
    p.labeledField(ctx, { label: 'Telefon', name: 'financiar_telefon', group: P })

    p.paragraph(
      ctx,
      'II. Experiența în domeniul serviciilor de asistență socială',
      { size: 10.5, gap: 6 },
    )
    p.paragraph(ctx, '1. Proiecte derulate în ultimele 12 luni:', { size: 10, gap: 4 })
    p.twoColFields(
      ctx,
      { label: 'Titlul proiectului', name: 'proiect_titlu', group: II },
      { label: 'Anul', name: 'proiect_an', maxLength: 4, group: II },
    )
    p.labeledField(ctx, { label: 'Parteneri în proiect', name: 'proiect_parteneri', group: II })
    p.labeledField(ctx, { label: 'Natura parteneriatului', name: 'proiect_natura_parteneriat', group: II })
    p.multilineField(
      ctx,
      { label: 'Descrierea pe scurt a proiectului', name: 'proiect_descriere', group: II },
      { lines: 4 },
    )
    p.twoColFields(
      ctx,
      { label: '2. Venituri totale din ultimele 12 luni (lei)', name: 'venituri_12_luni', group: II },
      { label: '3. Cheltuieli cu serviciile de asistență socială din ultimele 12 luni (lei)', name: 'cheltuieli_asistenta_12_luni', group: II },
    )
    p.labeledField(ctx, { label: '3^1. Cheltuieli totale în ultimele 12 luni (lei)', name: 'cheltuieli_totale_12_luni', group: II })
    p.labeledField(ctx, { label: '4. Servicii de asistență socială desfășurate la nivel local (precizați localitatea)', name: 'servicii_nivel_local', group: II })
    p.labeledField(ctx, { label: 'La nivel de județ/județe (precizați județul/județele)', name: 'servicii_nivel_judet', group: II })

    p.paragraph(
      ctx,
      'III. Subvenția solicitată de la bugetul de stat, respectiv de la bugetul local, conform ' +
        'anexelor A și B la prezenta cerere:',
      { size: 10.5, gap: 6 },
    )
    p.twoColFields(
      ctx,
      { label: 'Anul pentru care se solicită subvenția', name: 'an_subventie', required: true, maxLength: 4, group: III },
      { label: 'Subvenția solicitată (lei)', name: 'subventie_total', required: true, group: III },
    )
    p.labeledField(ctx, {
      label: 'Număr mediu lunar de persoane asistate', name: 'numar_mediu_persoane', required: true, group: III,
    })
    p.table(ctx, {
      name: 'unitate',
      rows: 6,
      group: 'III. Unitățile de asistență socială',
      columns: [
        { header: 'Denumirea unității de asistență socială', key: 'denumire' },
        { header: 'Județul în care are sediul unitatea', key: 'judet', width: 76 },
        { header: 'Nr. mediu lunar al persoanelor asistate', key: 'persoane', width: 86 },
        { header: 'Subvenția solicitată (lei)', key: 'subventie', width: 76 },
      ],
    })

    p.paragraph(ctx, 'Declarația persoanei împuternicite de consiliul director:', { size: 10.5, gap: 4 })
    p.labeledField(ctx, { label: 'Subsemnata/Subsemnatul', name: 'imputernicit_nume', required: true, group: D })
    p.twoColFields(
      ctx,
      { label: 'Buletin/carte de identitate seria și nr.', name: 'imputernicit_act_identitate', required: true, group: D },
      { label: 'Eliberat la data de', name: 'imputernicit_act_data', group: D },
    )
    p.labeledField(ctx, { label: 'De către', name: 'imputernicit_act_emitent', group: D })
    p.twoColFields(
      ctx,
      { label: 'Împuternicit prin Hotărârea consiliului director nr.', name: 'imputernicire_hotarare_nr', required: true, group: D },
      { label: 'Din data de', name: 'imputernicire_hotarare_data', group: D },
    )
    p.paragraph(
      ctx,
      'cunoscând prevederile art. 292 din Codul penal cu privire la falsul în declarații, declar pe ' +
        'propria răspundere că datele, informațiile și documentele prezentate corespund realității ' +
        'și că asociația/fundația/cultul nu are sume neachitate la scadență către persoane fizice ' +
        'sau juridice ori bunuri urmărite în vederea executării silite.',
      { size: 9.5, gap: 6 },
    )
    p.labeledField(ctx, {
      label: 'Mă angajez ca suma de (lei)',
      name: 'suma_angajata',
      required: true,
      hint: 'Suma se utilizează în scopul acordării serviciilor sociale, conform anexelor A și B.',
      group: D,
    })
    p.checkbox(ctx, {
      label:
        'Prin completarea prezentei cereri îmi exprim acordul expres și neechivoc privind ' +
        'utilizarea și prelucrarea datelor cu caracter personal de către Direcția de Asistență ' +
        'Socială și Medicală, în conformitate cu Regulamentul (UE) 2016/679.',
      name: 'acord_prelucrare_date',
      required: true,
      group: D,
    })

    p.signatureFooter(ctx, { signatureLabel: 'Persoana împuternicită (semnătura și ștampila)' })
    p.signatureFooter(ctx, { dateLabel: 'Data', signatureLabel: 'Responsabil financiar (semnătura și ștampila)' })
  },
}

export default spec
