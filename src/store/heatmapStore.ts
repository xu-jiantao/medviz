import { create } from 'zustand'
import type { HeatmapConfig, HeatCategory, HeatColMarker, HeatRowMarker } from '@/charts/Heatmap/types'
import { geneMutation } from '@/charts/Heatmap/samples'

interface HeatmapState {
  config: HeatmapConfig
  setConfig: (c: HeatmapConfig) => void
  patch: (p: Partial<HeatmapConfig>) => void
  setCell: (rowId: string, colId: string, value: number | string | null) => void
  addRow: (name: string) => void
  removeRow: (id: string) => void
  renameRow: (id: string, name: string) => void
  addCol: (name: string) => void
  removeCol: (id: string) => void
  renameCol: (id: string, name: string) => void
  addCategory: (c: HeatCategory) => void
  removeCategory: (key: string) => void
  updateCategory: (key: string, p: Partial<HeatCategory>) => void
  addColMarker: (m: HeatColMarker) => void
  removeColMarker: (id: string) => void
  addRowMarker: (m: HeatRowMarker) => void
  removeRowMarker: (id: string) => void
}

const init = (): HeatmapConfig => JSON.parse(JSON.stringify(geneMutation))
const uid = () => Math.random().toString(36).slice(2, 9)

export const useHeatmapStore = create<HeatmapState>((set) => ({
  config: init(),
  setConfig: (c) => set({ config: c }),
  patch: (p) => set((s) => ({ config: { ...s.config, ...p } })),

  setCell: (rowId, colId, value) =>
    set((s) => ({
      config: {
        ...s.config,
        cells: {
          ...s.config.cells,
          [rowId]: { ...s.config.cells[rowId], [colId]: value },
        },
      },
    })),

  addRow: (name) =>
    set((s) => {
      const id = `r_${uid()}`
      return {
        config: {
          ...s.config,
          rows: [...s.config.rows, { id, name }],
          cells: { ...s.config.cells, [id]: {} },
        },
      }
    }),
  removeRow: (id) =>
    set((s) => {
      const cells = { ...s.config.cells }
      delete cells[id]
      return { config: { ...s.config, rows: s.config.rows.filter((r) => r.id !== id), cells } }
    }),
  renameRow: (id, name) =>
    set((s) => ({
      config: { ...s.config, rows: s.config.rows.map((r) => (r.id === id ? { ...r, name } : r)) },
    })),

  addCol: (name) =>
    set((s) => ({
      config: { ...s.config, cols: [...s.config.cols, { id: `c_${uid()}`, name }] },
    })),
  removeCol: (id) =>
    set((s) => {
      const cells = { ...s.config.cells }
      for (const rid of Object.keys(cells)) {
        const row = { ...cells[rid] }
        delete row[id]
        cells[rid] = row
      }
      return { config: { ...s.config, cols: s.config.cols.filter((c) => c.id !== id), cells } }
    }),
  renameCol: (id, name) =>
    set((s) => ({
      config: { ...s.config, cols: s.config.cols.map((c) => (c.id === id ? { ...c, name } : c)) },
    })),

  addCategory: (c) =>
    set((s) => ({ config: { ...s.config, categories: [...s.config.categories, c] } })),
  removeCategory: (key) =>
    set((s) => ({
      config: { ...s.config, categories: s.config.categories.filter((c) => c.key !== key) },
    })),
  updateCategory: (key, p) =>
    set((s) => ({
      config: {
        ...s.config,
        categories: s.config.categories.map((c) => (c.key === key ? { ...c, ...p } : c)),
      },
    })),

  addColMarker: (m) =>
    set((s) => ({ config: { ...s.config, colMarkers: [...s.config.colMarkers, m] } })),
  removeColMarker: (id) =>
    set((s) => ({
      config: { ...s.config, colMarkers: s.config.colMarkers.filter((m) => m.id !== id) },
    })),
  addRowMarker: (m) =>
    set((s) => ({ config: { ...s.config, rowMarkers: [...(s.config.rowMarkers ?? []), m] } })),
  removeRowMarker: (id) =>
    set((s) => ({
      config: { ...s.config, rowMarkers: (s.config.rowMarkers ?? []).filter((m) => m.id !== id) },
    })),
}))
