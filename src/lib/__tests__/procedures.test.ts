import { describe, it, expect } from 'vitest'
import { NATIONAL_COUNTY, buildTemplateIndex, procedureCounty, templateDocIds } from '../procedures'
import type { Procedure, SlimTemplate } from '@/types/template'

function makeProcedure(partial: Partial<Procedure>): Procedure {
  return {
    procedureId: 'p1',
    title: null,
    informational: false,
    informationalNotice: null,
    fields: {},
    documents: [],
    outputDocuments: [],
    laws: [],
    ...partial,
  }
}

describe('procedureCounty', () => {
  it('canonicalizes diacritic county strings', () => {
    expect(procedureCounty(makeProcedure({ county: 'București' }))).toBe('Bucuresti')
    expect(procedureCounty(makeProcedure({ county: 'CLUJ' }))).toBe('Cluj')
  })

  it('routes primării from non-county-named towns to their county via the locality lookup', () => {
    expect(
      procedureCounty(
        makeProcedure({ institution: 'Primaria Municipiului Lugoj', city: 'Lugoj' }),
      ),
    ).toBe('Timis')
    expect(procedureCounty(makeProcedure({ institution: 'Primaria Onesti' }))).toBe('Bacau')
    expect(procedureCounty(makeProcedure({ institution: 'Primaria Pitesti' }))).toBe('Arges')
  })

  it('keeps ministries and other national bodies in the Național bucket', () => {
    expect(
      procedureCounty(
        makeProcedure({ institution: 'Ministerul Agriculturii si Dezvoltării Rurale' }),
      ),
    ).toBe(NATIONAL_COUNTY)
    expect(
      procedureCounty(
        makeProcedure({ institution: 'Agentia Nationala de Administrare Fiscala' }),
      ),
    ).toBe(NATIONAL_COUNTY)
  })

  it('promotes national-scope institutions to Național even when the address field names Bucharest', () => {
    // Real shape from procedures.json: the scrape writes "Județ BUCURESTI"
    // into institutiaResponsabila for every ministry HQ'd in Bucharest. The
    // national-pattern check must win over that text-derivation fallback.
    expect(
      procedureCounty(
        makeProcedure({
          institution: 'Ministerul Justitiei',
          fields: { institutiaResponsabila: 'Ministerul Justitiei,Județ BUCURESTI' },
        }),
      ),
    ).toBe(NATIONAL_COUNTY)
    expect(
      procedureCounty(
        makeProcedure({
          institution: 'Inspectoratul de Stat in Constructii - I.S.C',
          fields: { institutiaResponsabila: 'ISC,Județ BUCURESTI' },
        }),
      ),
    ).toBe(NATIONAL_COUNTY)
  })

  it('respects explicit non-Național county on local branches of national bodies', () => {
    // "Ministerul Apararii — Spitalul Militar Constanta" has county="Constanta"
    // in the scrape. A local branch stays local even though the parent
    // institution name matches a national pattern.
    expect(
      procedureCounty(
        makeProcedure({
          institution: 'Ministerul Apararii Nationale - Spitalul Militar Constanta',
          county: 'Constanta',
        }),
      ),
    ).toBe('Constanta')
  })

  it('honors explicit county="Național" tagging', () => {
    expect(
      procedureCounty(
        makeProcedure({
          county: 'Național',
          institution: 'Colegiul Farmaciștilor din România',
        }),
      ),
    ).toBe(NATIONAL_COUNTY)
  })

  it('falls back to Național when the institution carries no county signal', () => {
    expect(procedureCounty(makeProcedure({ institution: 'Some unknown entity' }))).toBe(
      NATIONAL_COUNTY,
    )
  })
})

function makeTemplate(partial: Partial<SlimTemplate>): SlimTemplate {
  return {
    id: 't1',
    name: 'Formular',
    version: 1,
    visibleFieldCount: 3,
    driveFileId: 'drive1',
    ...partial,
  }
}

describe('buildTemplateIndex — shared archetypes', () => {
  it('resolves every doc id a shared archetype serves', () => {
    const arch = makeTemplate({
      id: 'arch',
      archetype: 'cerere-tip',
      eDirectDocIds: ['100', '200', '300'],
    })
    const { byDocId } = buildTemplateIndex([arch])
    expect(byDocId.get('100')?.id).toBe('arch')
    expect(byDocId.get('200')?.id).toBe('arch')
    expect(byDocId.get('300')?.id).toBe('arch')
  })

  it('prefers a purpose-built template over a shared archetype, whatever the order', () => {
    // The archetype covers doc 100 too, but a template built for exactly that
    // document is the better answer and must win regardless of array order.
    const specific = makeTemplate({ id: 'specific', eDirectDocId: '100' })
    const arch = makeTemplate({ id: 'arch', archetype: 'cerere-tip', eDirectDocIds: ['100', '200'] })

    expect(buildTemplateIndex([arch, specific]).byDocId.get('100')?.id).toBe('specific')
    expect(buildTemplateIndex([specific, arch]).byDocId.get('100')?.id).toBe('specific')
  })

  it('still serves the archetype to documents the specific template does not cover', () => {
    const specific = makeTemplate({ id: 'specific', eDirectDocId: '100' })
    const arch = makeTemplate({ id: 'arch', archetype: 'cerere-tip', eDirectDocIds: ['100', '200'] })
    expect(buildTemplateIndex([specific, arch]).byDocId.get('200')?.id).toBe('arch')
  })

  it('ignores archived templates entirely', () => {
    const arch = makeTemplate({ id: 'arch', archived: true, eDirectDocIds: ['100'] })
    expect(buildTemplateIndex([arch]).byDocId.size).toBe(0)
  })
})

describe('templateDocIds', () => {
  it('merges the primary id with the shared list without duplicating it', () => {
    expect(templateDocIds({ eDirectDocId: '100', eDirectDocIds: ['100', '200'] })).toEqual(['100', '200'])
  })

  it('returns an empty list when a template carries no doc ids', () => {
    expect(templateDocIds({})).toEqual([])
  })
})
