import * as XLSX from 'xlsx'
import type { TrendSeries } from '@/charts/TrendChart/types'
import type { RadarDimension, RadarSeries } from '@/charts/RadarChart/types'
import type { HeatAxisItem, HeatmapConfig } from '@/charts/Heatmap/types'

const PALETTE = ['#d4380d', '#1677ff', '#fa8c16', '#52c41a', '#722ed1', '#13c2c2', '#eb2f96']

function readFirstSheet(buf: ArrayBuffer): Record<string, unknown>[] {
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null })
}

/** 通用：把 CSV/Excel 解析成列名 + 记录数组（用于列线图自动拟合） */
export async function parseRecords(file: File): Promise<{
  columns: string[]
  records: Record<string, unknown>[]
}> {
  const buf = await file.arrayBuffer()
  const records = readFirstSheet(buf)
  const columns = records.length ? Object.keys(records[0]) : []
  return { columns, records }
}

/**
 * 解析趋势图数据表。约定：
 *   第一列 = 横轴（时间点 / 天数），表头任意
 *   其余每一列 = 一个指标，列表头 = 指标名
 * 返回可直接塞进 TrendChartConfig.series 的结构。
 */
export async function importTrendExcel(file: File): Promise<{
  xAxisName: string
  series: TrendSeries[]
}> {
  const buf = await file.arrayBuffer()
  const rows = readFirstSheet(buf)
  if (rows.length === 0) throw new Error('表格为空')

  const headers = Object.keys(rows[0])
  if (headers.length < 2) throw new Error('至少需要两列：第一列时间点 + 一列指标')

  const [xKey, ...metricKeys] = headers
  const series: TrendSeries[] = metricKeys.map((key, i) => ({
    id: `s_${i}_${key}`,
    name: String(key),
    color: PALETTE[i % PALETTE.length],
    data: rows.map((r) => ({
      x: String(r[xKey] ?? ''),
      y: r[key] == null || r[key] === '' ? null : Number(r[key]),
    })),
  }))

  return { xAxisName: String(xKey), series }
}

const MAX_HEADERS = ['满分', 'max', 'Max', '量程', '上限']

/**
 * 解析雷达图数据表。约定：
 *   第一列 = 维度名
 *   名为「满分/max/量程/上限」的列（可选）= 该维度量程上限；缺省则取各组最大值的 1.2 倍
 *   其余每一列 = 一组数据，列表头 = 组名（如 入院时 / 出院时）
 */
export async function importRadarExcel(file: File): Promise<{
  dimensions: RadarDimension[]
  series: RadarSeries[]
}> {
  const buf = await file.arrayBuffer()
  const rows = readFirstSheet(buf)
  if (rows.length === 0) throw new Error('表格为空')

  const headers = Object.keys(rows[0])
  if (headers.length < 2) throw new Error('至少需要两列：第一列维度 + 一列数据')

  const dimKey = headers[0]
  const maxKey = headers.find((h) => MAX_HEADERS.includes(h))
  const seriesKeys = headers.slice(1).filter((h) => h !== maxKey)

  const dimensions: RadarDimension[] = rows.map((r, i) => {
    const explicitMax = maxKey ? Number(r[maxKey]) : NaN
    const autoMax = Math.max(...seriesKeys.map((k) => Number(r[k]) || 0)) * 1.2 || 1
    return {
      id: `d_${i}`,
      name: String(r[dimKey] ?? `维度${i + 1}`),
      max: Number.isFinite(explicitMax) && explicitMax > 0 ? explicitMax : Math.ceil(autoMax),
    }
  })

  const series: RadarSeries[] = seriesKeys.map((key, si) => ({
    id: `rs_${si}`,
    name: String(key),
    color: PALETTE[si % PALETTE.length],
    values: Object.fromEntries(
      rows.map((r, i) => [`d_${i}`, r[key] == null ? 0 : Number(r[key])]),
    ),
  }))

  return { dimensions, series }
}

/**
 * 解析热图数据表。约定：
 *   第一列 = 行名（如患者/样本/日期）
 *   表头其余列 = 列名（如基因/药物/时段）
 *   单元格 = 数值（连续模式）或分类文本（分类模式，需与分类 key/label 对应）
 */
export async function importHeatmapExcel(file: File): Promise<{
  rows: HeatAxisItem[]
  cols: HeatAxisItem[]
  cells: HeatmapConfig['cells']
}> {
  const buf = await file.arrayBuffer()
  const raw = readFirstSheet(buf)
  if (raw.length === 0) throw new Error('表格为空')

  const headers = Object.keys(raw[0])
  if (headers.length < 2) throw new Error('至少需要两列：第一列行名 + 一列数据')

  const rowKey = headers[0]
  const colNames = headers.slice(1)
  const rows: HeatAxisItem[] = raw.map((r, i) => ({ id: `r${i}`, name: String(r[rowKey] ?? `行${i + 1}`) }))
  const cols: HeatAxisItem[] = colNames.map((n, i) => ({ id: `c${i}`, name: String(n) }))

  const cells: HeatmapConfig['cells'] = {}
  raw.forEach((r, ri) => {
    cells[`r${ri}`] = {}
    colNames.forEach((cn, ci) => {
      const v = r[cn]
      // 数字串转数字，其余保留为分类文本
      const num = v == null || v === '' ? null : Number(v)
      cells[`r${ri}`][`c${ci}`] = num != null && !Number.isNaN(num) ? num : (v == null ? null : String(v))
    })
  })

  return { rows, cols, cells }
}
