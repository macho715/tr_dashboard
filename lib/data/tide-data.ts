/**
 * Tide Data Loader
 *
 * data/schedule/tide.json -> getTideForVoyage(voyageNum)
 */

import tideDataRaw from "../../data/schedule/tide.json"

export interface TideRow {
  time: string
  height: number
}

interface TideVoyage {
  voyage: number
  dataStart: string
  dataEnd: string
  top3: TideRow[]
}

interface TideData {
  voyages: TideVoyage[]
}

const tideData = tideDataRaw as TideData

export function getTideForVoyage(voyageNum: number): TideRow[] {
  const v = tideData.voyages?.find((x) => x.voyage === voyageNum)
  return v?.top3 ?? []
}

export const tideVoyages = tideData.voyages ?? []
