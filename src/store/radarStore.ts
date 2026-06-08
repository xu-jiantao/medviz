import { create } from 'zustand'
import type { RadarChartConfig, RadarDimension, RadarSeries } from '@/charts/RadarChart/types'
import { sofa } from '@/charts/RadarChart/samples'

interface RadarState {
  config: RadarChartConfig
  setConfig: (c: RadarChartConfig) => void
  patch: (p: Partial<RadarChartConfig>) => void
  addDimension: (d: RadarDimension) => void
  removeDimension: (id: string) => void
  updateDimension: (id: string, p: Partial<RadarDimension>) => void
  addSeries: (s: RadarSeries) => void
  removeSeries: (id: string) => void
  updateSeries: (id: string, p: Partial<Omit<RadarSeries, 'values'>>) => void
  setValue: (seriesId: string, dimId: string, value: number) => void
}

const init = (): RadarChartConfig => JSON.parse(JSON.stringify(sofa))

export const useRadarStore = create<RadarState>((set) => ({
  config: init(),
  setConfig: (c) => set({ config: c }),
  patch: (p) => set((s) => ({ config: { ...s.config, ...p } })),

  addDimension: (d) =>
    set((s) => ({ config: { ...s.config, dimensions: [...s.config.dimensions, d] } })),
  removeDimension: (id) =>
    set((s) => ({
      config: { ...s.config, dimensions: s.config.dimensions.filter((x) => x.id !== id) },
    })),
  updateDimension: (id, p) =>
    set((s) => ({
      config: {
        ...s.config,
        dimensions: s.config.dimensions.map((x) => (x.id === id ? { ...x, ...p } : x)),
      },
    })),

  addSeries: (ser) => set((s) => ({ config: { ...s.config, series: [...s.config.series, ser] } })),
  removeSeries: (id) =>
    set((s) => ({ config: { ...s.config, series: s.config.series.filter((x) => x.id !== id) } })),
  updateSeries: (id, p) =>
    set((s) => ({
      config: {
        ...s.config,
        series: s.config.series.map((x) => (x.id === id ? { ...x, ...p } : x)),
      },
    })),

  setValue: (seriesId, dimId, value) =>
    set((s) => ({
      config: {
        ...s.config,
        series: s.config.series.map((x) =>
          x.id === seriesId ? { ...x, values: { ...x.values, [dimId]: value } } : x,
        ),
      },
    })),
}))
