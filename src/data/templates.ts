import * as XLSX from 'xlsx'

export type Cell = string | number
export type Aoa = Cell[][]

/** 用二维数组生成 .xlsx 并触发浏览器下载 */
export function downloadSheet(filename: string, aoa: Aoa, sheetName = 'Sheet1') {
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([out], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** 多 sheet 工作簿下载 */
export function downloadWorkbook(filename: string, sheets: { name: string; aoa: Aoa }[]) {
  const wb = XLSX.utils.book_new()
  for (const sh of sheets) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sh.aoa), sh.name.slice(0, 31))
  }
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([out], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** 趋势图：首列时间点，其余每列一个指标 */
export const downloadTrendTemplate = () =>
  downloadSheet('趋势图导入模板.xlsx', [
    ['随访时间', '收缩压', '舒张压'],
    ['基线', 168, 102],
    ['3月', 158, 96],
    ['6月', 142, 88],
    ['12月', 138, 85],
  ])

/** 雷达图：首列维度，可选「满分」列，其余每列一组 */
export const downloadRadarTemplate = () =>
  downloadSheet('雷达图导入模板.xlsx', [
    ['维度', '满分', '入院时', '出院时'],
    ['肌力', 5, 2, 4],
    ['言语', 5, 1, 2],
    ['吞咽', 5, 1, 2],
    ['认知', 5, 3, 4],
    ['平衡', 5, 2, 4],
  ])

/** 热图（连续）：首列行名，表头其余为列名，单元格为数值 */
export const downloadHeatmapTemplate = () =>
  downloadSheet('热图导入模板.xlsx', [
    ['日期', '00-04', '04-08', '08-12', '12-16'],
    ['Day1', 38.5, 38.8, 39.2, 39.5],
    ['Day2', 38.6, 39.0, 39.4, 39.6],
    ['Day3', 38.2, 38.5, 38.9, 39.0],
  ])

/** 列线图 · Logistic：预测变量列 + 一列结局(0/1) */
export const downloadLogisticTemplate = () =>
  downloadSheet('列线图_Logistic导入模板.xlsx', [
    ['age', 'stage', 'nodes', 'malignant'],
    [68, 'II', '1~3个', 1],
    [55, 'I', '0个', 0],
    [72, 'III', '≥4个', 1],
    [60, 'I', '0个', 0],
  ])

/** 列线图 · Cox：预测变量列 + 生存时间列 + 事件列(0/1) */
export const downloadCoxTemplate = () =>
  downloadSheet('列线图_Cox导入模板.xlsx', [
    ['age', 'stage', 'lvi', 'months', 'death'],
    [62, 'IB', '无', 40.2, 1],
    [58, 'IA', '无', 60.0, 0],
    [70, 'III', '有', 12.5, 1],
    [65, 'II', '无', 36.0, 0],
  ])
