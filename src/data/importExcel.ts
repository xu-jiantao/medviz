import * as XLSX from 'xlsx'
import type { TrendSeries } from '@/charts/TrendChart/types'
import type { RadarDimension, RadarSeries } from '@/charts/RadarChart/types'
import type { HeatAxisItem, HeatmapConfig, HeatColMarker, HeatRowMarker } from '@/charts/Heatmap/types'

const PALETTE = ['#d4380d', '#1677ff', '#fa8c16', '#52c41a', '#722ed1', '#13c2c2', '#eb2f96']


/**
 * 智能解析 Excel 工作表，自动跳过空行、填表说明提示行、以及导出的患者信息抬头等非数据行。
 * 返回清洗后的表头行和数据行数组。
 */
function parseSheetToAoaWithoutHeaders(ws: XLSX.WorkSheet): { headers: string[]; dataRows: any[][] } {
  const rawAoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' })
  
  let headerIndex = -1
  for (let i = 0; i < rawAoa.length; i++) {
    const row = rawAoa[i]
    if (!row || row.length === 0) continue
    const firstCell = String(row[0] ?? '').trim()
    if (
      firstCell === '' ||
      firstCell.startsWith('填表说明') ||
      firstCell.startsWith('患者：') ||
      firstCell.startsWith('诊断：') ||
      firstCell.startsWith('图表：') ||
      firstCell.startsWith('说明：')
    ) {
      continue
    }
    headerIndex = i
    break
  }
  
  if (headerIndex === -1) {
    throw new Error('未找到有效的表头行')
  }
  
  const headers = rawAoa[headerIndex].map(x => String(x ?? '').trim()).filter(Boolean)
  const dataRows: any[][] = []
  
  for (let i = headerIndex + 1; i < rawAoa.length; i++) {
    const row = rawAoa[i]
    if (!row || row.length === 0) continue
    // 如果整行都是空的，则跳过
    if (row.every(cell => String(cell ?? '').trim() === '')) continue
    // 遇到新的说明或抬头行，跳过
    const firstCell = String(row[0] ?? '').trim()
    if (
      firstCell.startsWith('填表说明') ||
      firstCell.startsWith('患者：') ||
      firstCell.startsWith('诊断：') ||
      firstCell.startsWith('图表：') ||
      firstCell.startsWith('说明：')
    ) {
      continue
    }
    dataRows.push(row)
  }
  
  return { headers, dataRows }
}

/** 通用：把 CSV/Excel 解析成列名 + 记录数组（用于列线图自动拟合） */
export async function parseRecords(file: File): Promise<{
  columns: string[]
  records: Record<string, unknown>[]
}> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  
  const { headers, dataRows } = parseSheetToAoaWithoutHeaders(ws)
  
  const records = dataRows.map((row) => {
    const rec: Record<string, unknown> = {}
    headers.forEach((h, idx) => {
      rec[h] = row[idx] === '' ? null : row[idx]
    })
    return rec
  })
  
  return { columns: headers, records }
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
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  
  const { headers, dataRows } = parseSheetToAoaWithoutHeaders(ws)
  if (headers.length < 2) throw new Error('至少需要两列：第一列时间点 + 一列指标')

  const [xKey, ...metricKeys] = headers
  const series: TrendSeries[] = metricKeys.map((key, i) => {
    const colIdx = headers.indexOf(key)
    return {
      id: `s_${i}_${key}`,
      name: String(key),
      color: PALETTE[i % PALETTE.length],
      data: dataRows.map((row) => ({
        x: String(row[0] ?? ''),
        y: row[colIdx] == null || String(row[colIdx]).trim() === '' ? null : Number(row[colIdx]),
      })),
    }
  })

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
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  
  const { headers, dataRows } = parseSheetToAoaWithoutHeaders(ws)
  if (headers.length < 2) throw new Error('至少需要两列：第一列维度 + 一列数据')

  const maxKey = headers.find((h) => MAX_HEADERS.includes(h))
  const seriesKeys = headers.slice(1).filter((h) => h !== maxKey)
  
  const maxColIdx = maxKey ? headers.indexOf(maxKey) : -1

  const dimensions: RadarDimension[] = dataRows.map((row, i) => {
    const explicitMax = maxColIdx !== -1 ? Number(row[maxColIdx]) : NaN
    
    // 从其他数据列计算自动上限
    const seriesValList = seriesKeys.map(k => {
      const idx = headers.indexOf(k)
      return Number(row[idx]) || 0
    })
    const autoMax = Math.max(...seriesValList) * 1.2 || 1
    
    return {
      id: `d_${i}`,
      name: String(row[0] ?? `维度${i + 1}`),
      max: Number.isFinite(explicitMax) && explicitMax > 0 ? explicitMax : Math.ceil(autoMax),
    }
  })

  const series: RadarSeries[] = seriesKeys.map((key, si) => {
    const colIdx = headers.indexOf(key)
    return {
      id: `rs_${si}`,
      name: String(key),
      color: PALETTE[si % PALETTE.length],
      values: Object.fromEntries(
        dataRows.map((row, i) => [`d_${i}`, row[colIdx] == null || String(row[colIdx]).trim() === '' ? 0 : Number(row[colIdx])]),
      ),
    }
  })

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
  colMarkers?: HeatColMarker[]
  rowMarkers?: HeatRowMarker[]
}> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  
  const { headers, dataRows } = parseSheetToAoaWithoutHeaders(ws)
  if (headers.length < 2) throw new Error('至少需要两列：第一列行名 + 一列数据')

  const colNames = headers.slice(1)
  const rows: HeatAxisItem[] = dataRows.map((row, i) => ({ id: `r${i}`, name: String(row[0] ?? `行${i + 1}`) }))
  const cols: HeatAxisItem[] = colNames.map((n, i) => ({ id: `c${i}`, name: String(n) }))

  const cells: HeatmapConfig['cells'] = {}
  dataRows.forEach((row, ri) => {
    const rowId = `r${ri}`
    cells[rowId] = {}
    colNames.forEach((cn, ci) => {
      const colIdx = headers.indexOf(cn)
      const v = row[colIdx]
      // 数字串转数字，其余保留为分类文本
      const num = v == null || String(v).trim() === '' ? null : Number(v)
      cells[rowId][`c${ci}`] = num != null && !Number.isNaN(num) ? num : (v == null || String(v).trim() === '' ? null : String(v))
    })
  })

  // 读取第二张 Sheet (标记线配置) 还原标记线
  const colMarkers: HeatColMarker[] = []
  const rowMarkers: HeatRowMarker[] = []
  
  const markerSheetName = wb.SheetNames.find(n => n.includes('标记线'))
  if (markerSheetName) {
    const markerWs = wb.Sheets[markerSheetName]
    const markerRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(markerWs, { defval: null })
    
    markerRows.forEach((r, idx) => {
      const keys = Object.keys(r)
      if (keys.length < 3) return
      
      const typeKey = keys.find(k => k.includes('类型')) ?? keys[0]
      const targetKey = keys.find(k => k.includes('目标') || k.includes('名称')) ?? keys[1]
      const labelKey = keys.find(k => k.includes('标签')) ?? keys[2]
      
      const typeVal = String(r[typeKey] ?? '').trim()
      const targetVal = String(r[targetKey] ?? '').trim()
      const labelVal = String(r[labelKey] ?? '').trim()
      
      if (typeVal && targetVal && labelVal) {
        if (typeVal.includes('列')) {
          const col = cols.find(c => c.name === targetVal)
          if (col) {
            colMarkers.push({
              id: `m_col_${idx}`,
              colId: col.id,
              label: labelVal,
              color: '#000'
            })
          }
        } else if (typeVal.includes('行')) {
          const row = rows.find(r => r.name === targetVal)
          if (row) {
            rowMarkers.push({
              id: `m_row_${idx}`,
              rowId: row.id,
              label: labelVal,
              color: '#000'
            })
          }
        }
      }
    })
  }

  return { rows, cols, cells, colMarkers, rowMarkers }
}
