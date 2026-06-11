import { create } from 'zustand'
import { CLINICAL, type ClinicalNote } from '@/clinical'

interface ClinicalState {
  // 登录用户对各示例临床判断的自定义覆盖（sample 名 -> 覆盖内容）
  overrides: Record<string, ClinicalNote>
  setOverrides: (o: Record<string, ClinicalNote>) => void
  saveNote: (sample: string, note: ClinicalNote) => void
  resetNote: (sample: string) => void
}

export const useClinicalStore = create<ClinicalState>((set) => ({
  overrides: {},
  setOverrides: (overrides) => set({ overrides }),
  saveNote: (sample, note) =>
    set((s) => ({ overrides: { ...s.overrides, [sample]: note } })),
  resetNote: (sample) =>
    set((s) => {
      const o = { ...s.overrides }
      delete o[sample]
      return { overrides: o }
    }),
}))

/** 取某示例当前生效的临床判断：用户覆盖优先，否则用内置默认 */
export function getNote(overrides: Record<string, ClinicalNote>, sample: string): ClinicalNote | undefined {
  return overrides[sample] ?? CLINICAL[sample]
}
