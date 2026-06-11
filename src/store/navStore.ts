import { create } from 'zustand'
import { SCENARIOS, DEFAULT_SCENARIO, type ViewKey } from '@/nav'
import { useTrendStore } from './trendStore'
import { useRadarStore } from './radarStore'
import { useHeatmapStore } from './heatmapStore'
import { useNomogramStore } from './nomogramStore'
import { trendSamples } from '@/charts/TrendChart/samples'
import { radarSamples } from '@/charts/RadarChart/samples'
import { heatmapSamples } from '@/charts/Heatmap/samples'
import { nomogramSamples } from '@/charts/Nomogram/samples'

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))

/** 把场景对应的内置示例加载进相应图表 store（用户点击场景时调用） */
function loadSample(view: ViewKey, sample: string) {
  if (view === 'trend' && trendSamples[sample]) useTrendStore.getState().setConfig(clone(trendSamples[sample]))
  else if (view === 'radar' && radarSamples[sample]) useRadarStore.getState().setConfig(clone(radarSamples[sample]))
  else if (view === 'heatmap' && heatmapSamples[sample]) useHeatmapStore.getState().setConfig(clone(heatmapSamples[sample]))
  else if (view === 'nomogram' && nomogramSamples[sample]) useNomogramStore.getState().setConfig(clone(nomogramSamples[sample]))
}

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
    loadSample(sc.view, sc.sample)
  },
  restore: (scenarioKey) => {
    const sc = SCENARIOS[scenarioKey]
    if (!sc) return
    set({ scenarioKey, view: sc.view, sample: sc.sample })
  },
}))
