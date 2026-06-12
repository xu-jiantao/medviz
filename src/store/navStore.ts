import { create } from 'zustand'
import { SCENARIOS, DEFAULT_SCENARIO, type ViewKey } from '@/nav'
import { usePatientStore, loadPatientData } from './patientStore'

interface NavState {
  scenarioKey: string
  view: ViewKey
  sample: string
  /** 用户点击场景：切换并加载该场景示例 */
  setScenario: (scenarioKey: string) => void
  /** 仅切换视图/导航（不加载示例）—— 工作区恢复时用 */
  restore: (scenarioKey: string) => void
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
    
    // 加载当前病人在该场景下的配置数据（若无则自动 fallback 至默认示例）
    const activePatientId = usePatientStore.getState().activePatientId
    loadPatientData(activePatientId, scenarioKey)
  },
  restore: (scenarioKey) => {
    const sc = SCENARIOS[scenarioKey]
    if (!sc) return
    set({ scenarioKey, view: sc.view, sample: sc.sample })
  },
}))
