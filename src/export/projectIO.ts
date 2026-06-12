import { useTrendStore } from '@/store/trendStore'
import { useRadarStore } from '@/store/radarStore'
import { useHeatmapStore } from '@/store/heatmapStore'
import { useNomogramStore } from '@/store/nomogramStore'
import type { TrendChartConfig } from '@/charts/TrendChart/types'
import type { RadarChartConfig } from '@/charts/RadarChart/types'
import type { HeatmapConfig } from '@/charts/Heatmap/types'
import type { NomogramConfig } from '@/charts/Nomogram/types'
import { message } from 'antd'

const FORMAT = 'medviz-project'
const VERSION = 1

export interface MedvizProject {
  format: typeof FORMAT
  version: number
  savedAt: string
  trend: TrendChartConfig
  radar: RadarChartConfig
  heatmap: HeatmapConfig
  nomogram: NomogramConfig
}

/** 收集四种图当前配置为一个项目对象 */
export function gatherProject(): MedvizProject {
  return {
    format: FORMAT,
    version: VERSION,
    savedAt: new Date().toISOString(),
    trend: useTrendStore.getState().config,
    radar: useRadarStore.getState().config,
    heatmap: useHeatmapStore.getState().config,
    nomogram: useNomogramStore.getState().config,
  }
}

/** 把项目对象写回四个 store */
export function applyProject(p: MedvizProject) {
  if (p.format !== FORMAT) throw new Error('不是有效的 MedViz 项目文件')
  if (p.trend) useTrendStore.getState().setConfig(p.trend)
  if (p.radar) useRadarStore.getState().setConfig(p.radar)
  if (p.heatmap) useHeatmapStore.getState().setConfig(p.heatmap)
  if (p.nomogram) useNomogramStore.getState().setConfig(p.nomogram)
}

/** 触发浏览器下载 JSON 项目文件 */
export function saveProjectFile() {
  const data = JSON.stringify(gatherProject(), null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  const filename = `medviz-项目-${stamp}.json`
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)

  const isMac = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('mac')
  const path = isMac ? `~/Downloads/${filename}` : `Downloads\\${filename}`
  message.success({
    content: `保存项目文件成功！已保存至：${path}`,
    duration: 5,
  })
}

/** 读取并应用一个项目文件 */
export async function loadProjectFile(file: File) {
  const text = await file.text()
  const p = JSON.parse(text) as MedvizProject
  applyProject(p)
}
