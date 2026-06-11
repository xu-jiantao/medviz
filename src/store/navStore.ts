import { create } from 'zustand'
import { SCENARIOS, DEFAULT_SCENARIO, type ViewKey } from '@/nav'

interface NavState {
  scenarioKey: string
  view: ViewKey
  sample: string
  /** 每个视图最近一次激活的场景 key（用于跨视图记忆） */
  setScenario: (scenarioKey: string) => void
}

const s0 = SCENARIOS[DEFAULT_SCENARIO]

export const useNavStore = create<NavState>((set) => ({
  scenarioKey: DEFAULT_SCENARIO,
  view: s0.view,
  sample: s0.sample,
  setScenario: (scenarioKey) => {
    const sc = SCENARIOS[scenarioKey]
    if (!sc) return
    set({ scenarioKey, view: sc.view, sample: sc.sample })
  },
}))
