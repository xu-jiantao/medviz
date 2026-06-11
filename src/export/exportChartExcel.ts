import { downloadSheet, type Aoa } from '@/data/templates'
import { useTrendStore } from '@/store/trendStore'
import { useRadarStore } from '@/store/radarStore'
import { useHeatmapStore } from '@/store/heatmapStore'
import { useNomogramStore } from '@/store/nomogramStore'
import { usePatientStore } from '@/store/patientStore'
import type { ViewKey } from '@/nav'
import { totalPoints, outcomeProbability, variablePoints } from '@/charts/Nomogram/calc'

function trendAoa(): { title: string; aoa: Aoa } {
  const c = useTrendStore.getState().config
  const cats: (string | number)[] = []
  const seen = new Set<string | number>()
  for (const s of c.series) for (const d of s.data) if (!seen.has(d.x)) { seen.add(d.x); cats.push(d.x) }
  const header = [c.xAxisName || '横轴', ...c.series.map((s) => s.unit ? `${s.name}(${s.unit})` : s.name)]
  const rows: Aoa = cats.map((x) => [
    x,
    ...c.series.map((s) => {
      const hit = s.data.find((d) => d.x === x)
      return hit && hit.y != null ? hit.y : ''
    }),
  ])
  return { title: c.title, aoa: [header, ...rows] }
}

function radarAoa(): { title: string; aoa: Aoa } {
  const c = useRadarStore.getState().config
  const header = ['维度', '满分', ...c.series.map((s) => s.name)]
  const rows: Aoa = c.dimensions.map((d) => [
    d.name, d.max, ...c.series.map((s) => s.values[d.id] ?? 0),
  ])
  return { title: c.title, aoa: [header, ...rows] }
}

function heatmapAoa(): { title: string; aoa: Aoa } {
  const c = useHeatmapStore.getState().config
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

function nomogramAoa(): { title: string; aoa: Aoa } {
  const c = useNomogramStore.getState().config
  const sel = useNomogramStore.getState().selection
  const aoa: Aoa = [['变量', '档位 / 取值', '分值']]
  for (const v of c.variables) {
    if (v.type === 'categorical') {
      for (const lv of v.levels ?? []) aoa.push([v.name, lv.label, lv.points])
    } else {
      for (const a of v.valueAnchors ?? []) aoa.push([v.name, `${a.value}${v.unit ?? ''}`, a.points])
    }
  }
  aoa.push([])
  const total = totalPoints(c, sel)
  aoa.push(['当前总分', total.toFixed(0), ''])
  aoa.push(['当前各变量得分', '', ''])
  for (const v of c.variables) {
    if (sel[v.id] != null) aoa.push([v.name, '', variablePoints(v, sel[v.id]).toFixed(0)])
  }
  aoa.push([])
  aoa.push(['结局', '当前概率', '总分→概率锚点'])
  for (const o of c.outcomes) {
    aoa.push([o.name, `${(outcomeProbability(o, total) * 100).toFixed(0)}%`,
      o.anchors.map((a) => `${a.totalPoints}:${Math.round(a.prob * 100)}%`).join('  ')])
  }
  return { title: c.title, aoa }
}

const BUILDERS: Record<ViewKey, () => { title: string; aoa: Aoa }> = {
  trend: trendAoa,
  radar: radarAoa,
  heatmap: heatmapAoa,
  nomogram: nomogramAoa,
}

/** 导出当前图表数据为 Excel（含患者信息抬头） */
export function exportCurrentChartExcel(view: ViewKey) {
  const { title, aoa } = BUILDERS[view]()
  const p = usePatientStore.getState().patient
  const header: Aoa = [
    [`患者：${p.name}`, `${p.gender} ${p.age}岁`, p.bed, p.mrn],
    [`诊断：${p.diagnosis}`],
    [`图表：${title}`, `导出：${new Date().toLocaleString('zh-CN')}`],
    [],
  ]
  downloadSheet(`${title}.xlsx`, [...header, ...aoa])
}
