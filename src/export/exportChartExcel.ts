import { downloadSheet, downloadWorkbook, type Aoa } from '@/data/templates'
import { useTrendStore } from '@/store/trendStore'
import { useRadarStore } from '@/store/radarStore'
import { useHeatmapStore } from '@/store/heatmapStore'
import { useNomogramStore } from '@/store/nomogramStore'
import { usePatientStore } from '@/store/patientStore'
import type { ViewKey, Scenario } from '@/nav'
import { totalPoints, outcomeProbability } from '@/charts/Nomogram/calc'
import type { TrendChartConfig } from '@/charts/TrendChart/types'
import type { RadarChartConfig } from '@/charts/RadarChart/types'
import type { HeatmapConfig } from '@/charts/Heatmap/types'
import type { NomogramConfig, NomogramSelection } from '@/charts/Nomogram/types'
import { trendSamples } from '@/charts/TrendChart/samples'
import { radarSamples } from '@/charts/RadarChart/samples'
import { heatmapSamples } from '@/charts/Heatmap/samples'
import { nomogramSamples } from '@/charts/Nomogram/samples'
import { message } from 'antd'

// ---- 各图：config → 数据表（纯函数，可作用于任意 config，供导出/模板/汇总复用）----

function getDownloadsPath(filename: string): string {
  const isMac = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('mac')
  if (isMac) {
    return `~/Downloads/${filename}`
  } else {
    return `Downloads\\${filename} (或 C:\\Users\\<用户名>\\Downloads\\${filename})`
  }
}

export function trendAoa(c: TrendChartConfig): { title: string; aoa: Aoa } {
  const cats: (string | number)[] = []
  const seen = new Set<string | number>()
  for (const s of c.series) for (const d of s.data) if (!seen.has(d.x)) { seen.add(d.x); cats.push(d.x) }
  const header = [c.xAxisName || '横轴', ...c.series.map((s) => (s.unit ? `${s.name}(${s.unit})` : s.name))]
  const rows: Aoa = cats.map((x) => [
    x,
    ...c.series.map((s) => {
      const hit = s.data.find((d) => d.x === x)
      return hit && hit.y != null ? hit.y : ''
    }),
  ])
  return { title: c.title, aoa: [header, ...rows] }
}

export function radarAoa(c: RadarChartConfig): { title: string; aoa: Aoa } {
  const header = ['维度', '满分', ...c.series.map((s) => s.name)]
  const rows: Aoa = c.dimensions.map((d) => [d.name, d.max, ...c.series.map((s) => s.values[d.id] ?? 0)])
  return { title: c.title, aoa: [header, ...rows] }
}

export function heatmapAoa(c: HeatmapConfig): { title: string; aoa: Aoa } {
  const catLabel = new Map(c.categories.map((x) => [x.key, x.label]))
  const header = ['行 \\ 列', ...c.cols.map((col) => col.name)]
  const rows: Aoa = c.rows.map((row) => [
    row.name,
    ...c.cols.map((col) => {
      const v = c.cells[row.id]?.[col.id]
      if (v == null || v === '') return ''
      return c.mode === 'categorical' ? (catLabel.get(String(v)) ?? String(v)) : (v as number)
    }),
  ])
  return { title: c.title, aoa: [header, ...rows] }
}

export function nomogramAoa(c: NomogramConfig, sel: NomogramSelection = {}): { title: string; aoa: Aoa } {
  const aoa: Aoa = [['变量', '档位 / 取值', '分值', '患者当前选择 (分类变量填X，连续变量在首行填数值)']]
  for (const v of c.variables) {
    const activeVal = sel[v.id]
    if (v.type === 'categorical') {
      (v.levels ?? []).forEach((lv, idx) => {
        const isSelected = activeVal === idx ? 'X' : ''
        aoa.push([v.name, lv.label, lv.points, isSelected])
      })
    } else {
      (v.valueAnchors ?? []).forEach((a, idx) => {
        const valStr = idx === 0 && activeVal != null ? String(activeVal) : ''
        aoa.push([v.name, `${a.value}${v.unit ?? ''}`, a.points, valStr])
      })
    }
  }
  const total = totalPoints(c, sel)
  aoa.push([], ['当前总分', total.toFixed(0), '', ''], ['结局', '当前概率', '总分→概率锚点', ''])
  for (const o of c.outcomes) {
    aoa.push([o.name, `${(outcomeProbability(o, total) * 100).toFixed(0)}%`,
      o.anchors.map((a) => `${a.totalPoints}:${Math.round(a.prob * 100)}%`).join('  '), ''])
  }
  return { title: c.title, aoa }
}

/** 从一份工作区里取某图的数据表（汇总导出用） */
export function chartAoaFromWorkspace(view: ViewKey, w: Record<string, unknown>): { title: string; aoa: Aoa } | null {
  try {
    if (view === 'trend' && w.trend) return trendAoa(w.trend as TrendChartConfig)
    if (view === 'radar' && w.radar) return radarAoa(w.radar as RadarChartConfig)
    if (view === 'heatmap' && w.heatmap) return heatmapAoa(w.heatmap as HeatmapConfig)
    if (view === 'nomogram' && w.nomogram)
      return nomogramAoa(w.nomogram as NomogramConfig, (w.nomogramSelection as NomogramSelection) ?? {})
  } catch { /* 跳过坏数据 */ }
  return null
}

/** 从一份工作区或者默认示例里获取指定临床场景的数据表（汇总导出用） */
export function chartAoaForScenario(s: Scenario, w: Record<string, unknown>): { title: string; aoa: Aoa } | null {
  try {
    // 1. 如果该工作区当前激活的场景正是我们要导出的这个场景，则直接使用工作区中被编辑过的数据
    if (w.scenarioKey === s.key) {
      if (s.view === 'trend' && w.trend) return trendAoa(w.trend as TrendChartConfig)
      if (s.view === 'radar' && w.radar) return radarAoa(w.radar as RadarChartConfig)
      if (s.view === 'heatmap' && w.heatmap) return heatmapAoa(w.heatmap as HeatmapConfig)
      if (s.view === 'nomogram' && w.nomogram) {
        return nomogramAoa(w.nomogram as NomogramConfig, (w.nomogramSelection as NomogramSelection) ?? {})
      }
    }

    // 2. 否则，使用该场景的默认内置数据来进行导出
    let config: any = null
    if (s.view === 'trend') config = trendSamples[s.sample]
    else if (s.view === 'radar') config = radarSamples[s.sample]
    else if (s.view === 'heatmap') config = heatmapSamples[s.sample]
    else if (s.view === 'nomogram') config = nomogramSamples[s.sample]

    if (!config) return null

    if (s.view === 'trend') return trendAoa(config as TrendChartConfig)
    if (s.view === 'radar') return radarAoa(config as RadarChartConfig)
    if (s.view === 'heatmap') return heatmapAoa(config as HeatmapConfig)
    if (s.view === 'nomogram') return nomogramAoa(config as NomogramConfig, {})
  } catch {
    // 忽略异常数据
  }
  return null
}

/** 当前界面对应的数据表（读各自 store 的当前 config） */
function currentChartAoa(view: ViewKey): { title: string; aoa: Aoa } {
  if (view === 'trend') return trendAoa(useTrendStore.getState().config)
  if (view === 'radar') return radarAoa(useRadarStore.getState().config)
  if (view === 'heatmap') return heatmapAoa(useHeatmapStore.getState().config)
  return nomogramAoa(useNomogramStore.getState().config, useNomogramStore.getState().selection)
}

/** 导出当前图表数据为 Excel（含患者信息抬头） */
export function exportCurrentChartExcel(view: ViewKey) {
  const { title, aoa } = currentChartAoa(view)
  const p = usePatientStore.getState().patient
  const header: Aoa = [
    [`患者：${p.name}`, `${p.gender} ${p.age}岁`, p.bed, p.mrn],
    [`诊断：${p.diagnosis}`],
    [`图表：${title}`, `导出：${new Date().toLocaleString('zh-CN')}`],
    [],
  ]
  const formatCompactDate = (date: Date): string => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `${y}${m}${d}${hh}${mm}`
  }
  const filename = `${p.name}_${title}_${formatCompactDate(new Date())}.xlsx`

  if (view === 'heatmap') {
    const config = useHeatmapStore.getState().config
    const mainAoa = [...header, ...aoa]
    const markerAoa: Aoa = [
      ['类型', '目标名称 (行名或列名)', '标记标签'],
    ]
    config.colMarkers.forEach((m) => {
      const col = config.cols.find((c) => c.id === m.colId)
      if (col) markerAoa.push(['列标记线', col.name, m.label])
    })
    const rowMarkers = config.rowMarkers ?? []
    rowMarkers.forEach((m) => {
      const row = config.rows.find((r) => r.id === m.rowId)
      if (row) markerAoa.push(['行标记线', row.name, m.label])
    })
    downloadWorkbook(filename, [
      { name: '数据', aoa: mainAoa },
      { name: '标记线配置', aoa: markerAoa },
    ])
  } else {
    downloadSheet(filename, [...header, ...aoa])
  }
  
  const path = getDownloadsPath(filename)
  message.success({
    content: `导出成功！已保存至：${path}`,
    duration: 5,
  })
}

/** 下载与当前图界面结构对应的模板（表头取自当前 config，可清空示例数值） */
export function downloadCurrentTemplate(view: ViewKey) {
  const { title, aoa } = currentChartAoa(view)
  const tip: Aoa = [['填表说明：第一行为表头，请按表头格式填入你的数据（可清空示例数值）'], []]
  const filename = `${title}_导入模板.xlsx`

  if (view === 'heatmap') {
    const config = useHeatmapStore.getState().config
    const mainAoa = [...tip, ...aoa]
    const markerAoa: Aoa = [
      ['类型', '目标名称 (行名或列名)', '标记标签'],
      ['列标记线', config.cols[0]?.name ?? '示例列', '示例列标记文字'],
      ['行标记线', config.rows[0]?.name ?? '示例行', '示例行标记文字'],
    ]
    downloadWorkbook(filename, [
      { name: '数据', aoa: mainAoa },
      { name: '标记线配置', aoa: markerAoa },
    ])
  } else {
    downloadSheet(filename, [...tip, ...aoa])
  }

  const path = getDownloadsPath(filename)
  message.success({
    content: `下载成功！已保存至：${path}`,
    duration: 5,
  })
}
