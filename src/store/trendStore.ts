import { create } from 'zustand'
import type {
  TrendChartConfig,
  ReferenceLine,
  ReferenceBand,
  EventMarker,
} from '@/charts/TrendChart/types'
import { bpTrend } from '@/charts/TrendChart/samples'

interface TrendState {
  config: TrendChartConfig
  setConfig: (c: TrendChartConfig) => void
  patch: (p: Partial<TrendChartConfig>) => void
  addReferenceLine: (r: ReferenceLine) => void
  removeReferenceLine: (id: string) => void
  addReferenceBand: (b: ReferenceBand) => void
  removeReferenceBand: (id: string) => void
  addEventMarker: (e: EventMarker) => void
  removeEventMarker: (id: string) => void
}

// 深拷贝一份示例做初始值，避免直接改到模块常量
const init = (): TrendChartConfig => JSON.parse(JSON.stringify(bpTrend))

export const useTrendStore = create<TrendState>((set) => ({
  config: init(),
  setConfig: (c) => set({ config: c }),
  patch: (p) => set((s) => ({ config: { ...s.config, ...p } })),
  addReferenceLine: (r) =>
    set((s) => ({ config: { ...s.config, referenceLines: [...s.config.referenceLines, r] } })),
  removeReferenceLine: (id) =>
    set((s) => ({
      config: { ...s.config, referenceLines: s.config.referenceLines.filter((x) => x.id !== id) },
    })),
  addReferenceBand: (b) =>
    set((s) => ({ config: { ...s.config, referenceBands: [...s.config.referenceBands, b] } })),
  removeReferenceBand: (id) =>
    set((s) => ({
      config: { ...s.config, referenceBands: s.config.referenceBands.filter((x) => x.id !== id) },
    })),
  addEventMarker: (e) =>
    set((s) => ({ config: { ...s.config, eventMarkers: [...s.config.eventMarkers, e] } })),
  removeEventMarker: (id) =>
    set((s) => ({
      config: { ...s.config, eventMarkers: s.config.eventMarkers.filter((x) => x.id !== id) },
    })),
}))
