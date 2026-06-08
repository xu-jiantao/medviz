import { create } from 'zustand'
import type { NomogramConfig, NomogramSelection } from '@/charts/Nomogram/types'
import { nsclc } from '@/charts/Nomogram/samples'

interface NomogramState {
  config: NomogramConfig
  selection: NomogramSelection
  setConfig: (c: NomogramConfig) => void
  patch: (p: Partial<NomogramConfig>) => void
  /** 通用深层编辑：传入产生新 config 的函数 */
  mutate: (fn: (c: NomogramConfig) => NomogramConfig) => void
  setSel: (varId: string, value: number | null) => void
  resetSel: () => void
}

const clone = (c: NomogramConfig): NomogramConfig => JSON.parse(JSON.stringify(c))

export const useNomogramStore = create<NomogramState>((set) => ({
  config: clone(nsclc),
  selection: {},
  setConfig: (c) => set({ config: c, selection: {} }),
  patch: (p) => set((s) => ({ config: { ...s.config, ...p } })),
  mutate: (fn) => set((s) => ({ config: fn(clone(s.config)) })),
  setSel: (varId, value) =>
    set((s) => {
      const selection = { ...s.selection }
      if (value == null) delete selection[varId]
      else selection[varId] = value
      return { selection }
    }),
  resetSel: () => set({ selection: {} }),
}))
