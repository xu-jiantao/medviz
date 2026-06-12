import * as XLSX from 'xlsx'
import { message } from 'antd'
import { usePatientStore, type Patient, loadPatientData, saveActivePatientConfig } from '@/store/patientStore'
import { useNavStore } from '@/store/navStore'
import { useClinicalStore } from '@/store/clinicalStore'
import { CLINICAL } from '@/clinical'
import { trendSamples } from '@/charts/TrendChart/samples'
import { radarSamples } from '@/charts/RadarChart/samples'
import { heatmapSamples } from '@/charts/Heatmap/samples'
import { nomogramSamples } from '@/charts/Nomogram/samples'
import { NAV, SCENARIOS } from '@/nav'
import type { HeatmapConfig } from '@/charts/Heatmap/types'
import { trendAoa, radarAoa, heatmapAoa, nomogramAoa } from './exportChartExcel'
import { totalPoints, outcomeProbability } from '@/charts/Nomogram/calc'

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))
const PALETTE = ['#d4380d', '#1677ff', '#fa8c16', '#52c41a', '#722ed1', '#13c2c2', '#eb2f96']

function getDownloadsPath(filename: string): string {
  const isMac = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('mac')
  if (isMac) {
    return `~/Downloads/${filename}`
  } else {
    return `Downloads\\${filename} (或 C:\\Users\\<用户名>\\Downloads\\${filename})`
  }
}

/** 触发浏览器下载多工作表 Workbook */
function sanitizeSheetName(name: string): string {
  return name.replace(/[:\\/\?\*\[\]]/g, ' ').slice(0, 31).trim()
}

/** 触发浏览器下载多工作表 Workbook */
export function downloadWorkbook(filename: string, sheets: { name: string; aoa: any[][] }[]) {
  const wb = XLSX.utils.book_new()
  for (const sh of sheets) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sh.aoa), sanitizeSheetName(sh.name))
  }
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([out], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** 导出指定病人的所有13种图的数据汇总为一个 Excel 工作簿 */
export function exportPatientMasterExcel(patientId: string) {
  const patientStore = usePatientStore.getState()
  
  // 如果导出的是当前正在查看/编辑的患者，先同步保存其当前的床旁计算与微调状态
  if (patientId === patientStore.activePatientId) {
    saveActivePatientConfig()
  }

  const p = patientStore.patients.find(x => x.mrn === patientId) ?? patientStore.patient
  const clinicalOverrides = useClinicalStore.getState().overrides
  const LEVEL_LABEL: Record<string, string> = { warning: '预警', info: '提示', success: '良好' }
  
  const sheets: { name: string; aoa: any[][] }[] = []
  
  // 1. 患者信息主 Sheet
  const patientInfoAoa: any[][] = [
    ['说明：修改下方信息以新增或覆盖病人，导入后系统会自动读取并更新图表指标', ''],
    ['基本信息', '数值 / 取值'],
    ['姓名', p.name],
    ['性别', p.gender],
    ['年龄', p.age],
    ['科室床号', p.bed],
    ['住院号(MRN)', p.mrn],
    ['诊断', p.diagnosis],
  ]

  // 同步追加该病人的风险/预后评估预测（Nomogram）床旁计算结果摘要
  const nomoScenarios = NAV.find(cat => cat.key === 'nomogram')?.children ?? []
  if (nomoScenarios.length > 0) {
    patientInfoAoa.push(
      [],
      ['风险/预后评估预测（床旁计算结果同步）', ''],
      ['应用场景', '当前评估总分', '结局预测概率']
    )
    for (const s of nomoScenarios) {
      let config = patientStore.patientConfigs[patientId]?.[s.key]
      if (!config) {
        const sampleConfig = nomogramSamples[s.sample]
        config = clone(sampleConfig)
      }
      if (config) {
        const sel = config._selection ?? {}
        const total = totalPoints(config, sel)
        const outcomesStr = config.outcomes.map((o: any) => {
          const prob = outcomeProbability(o, total)
          return `${o.name}: ${(prob * 100).toFixed(0)}%`
        }).join('; ')
        
        patientInfoAoa.push([
          s.label,
          `${total.toFixed(0)}分`,
          outcomesStr || '无'
        ])
      }
    }
  }

  sheets.push({
    name: '患者信息',
    aoa: patientInfoAoa
  })


  // 2. 依次生成13个场景的 Sheet
  NAV.forEach((cat) => {
    cat.children.forEach((s) => {
      let config = patientStore.patientConfigs[patientId]?.[s.key]
      if (!config) {
        let sampleConfig: any = null
        if (s.view === 'trend') sampleConfig = trendSamples[s.sample]
        else if (s.view === 'radar') sampleConfig = radarSamples[s.sample]
        else if (s.view === 'heatmap') sampleConfig = heatmapSamples[s.sample]
        else if (s.view === 'nomogram') sampleConfig = nomogramSamples[s.sample]
        config = clone(sampleConfig)
      }
      
      if (config) {
        let aoaData: any[][] = []
        if (s.view === 'trend') aoaData = trendAoa(config).aoa
        else if (s.view === 'radar') aoaData = radarAoa(config).aoa
        else if (s.view === 'heatmap') aoaData = heatmapAoa(config).aoa
        else if (s.view === 'nomogram') aoaData = nomogramAoa(config, config._selection ?? {}).aoa
        
        // 热图的话，在数据底部追加标记线配置，方便单表内闭环导入
        if (s.view === 'heatmap') {
          const heatmapCfg = config as HeatmapConfig
          const markerRows: any[][] = [
            [],
            ['__标记线配置__', '', ''],
            ['类型', '目标名称 (行名或列名)', '标记标签'],
          ]
          let hasMarkers = false
          heatmapCfg.colMarkers.forEach((m) => {
            const col = heatmapCfg.cols.find((c) => c.id === m.colId)
            if (col) { markerRows.push(['列标记线', col.name, m.label]); hasMarkers = true }
          })
          const rowMarkers = heatmapCfg.rowMarkers ?? []
          rowMarkers.forEach((m) => {
            const row = heatmapCfg.rows.find((r) => r.id === m.rowId)
            if (row) { markerRows.push(['行标记线', row.name, m.label]); hasMarkers = true }
          })
          if (hasMarkers) {
            aoaData = [...aoaData, ...markerRows]
          } else {
            // 提供默认占位符示例，保持与下载总导入模板格式一致
            markerRows.push(['列标记线', heatmapCfg.cols[0]?.name ?? '示例列', '示例列标记文字'])
            markerRows.push(['行标记线', heatmapCfg.rows[0]?.name ?? '示例行', '示例行标记文字'])
            aoaData = [...aoaData, ...markerRows]
          }
        }

        // 获取临床判断
        const note = clinicalOverrides[s.sample] ?? CLINICAL[s.sample]
        const levelStr = note ? (LEVEL_LABEL[note.level] ?? note.level) : '提示'
        const headerInfo = [
          ['图表标题', config.title ?? s.label],
          ['临床判断', note?.conclusion ?? '无'],
          ['预警级别', levelStr],
          ['应对建议', note?.advice ?? '无'],
          [] // 空行分隔
        ]
        
        sheets.push({
          name: s.label.slice(0, 31),
          aoa: [...headerInfo, ...aoaData]
        })
      }
    })
  })
  
  const formatCompactDate = (date: Date): string => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `${y}${m}${d}${hh}${mm}`
  }
  const filename = `${p.name}_数据汇总_${formatCompactDate(new Date())}.xlsx`
  downloadWorkbook(filename, sheets)
  
  const downloadsPath = getDownloadsPath(filename)
  message.success({
    content: `导出成功！已保存至：${downloadsPath}`,
    duration: 5,
  })
}

// ---------------- 解析 AOA 为图表配置结构 ----------------

/**
 * 清除 AOA 数据顶部的临床判断与建议、图表标题等元数据行，返回只包含表头和数据行的 AOA 数组。
 */
function getCleanDataAoa(rawAoa: any[][]): any[][] {
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
      firstCell.startsWith('说明：') ||
      firstCell.startsWith('临床判断') ||
      firstCell.startsWith('预警级别') ||
      firstCell.startsWith('应对建议') ||
      firstCell.startsWith('图表标题') ||
      firstCell.startsWith('【') ||
      firstCell.includes('用户名：') ||
      firstCell.includes('数据汇总')
    ) {
      continue
    }
    headerIndex = i
    break
  }
  if (headerIndex === -1) return []
  return rawAoa.slice(headerIndex)
}

function parseTrendAoa(aoa: any[][], defaultSample: any, title: string): any {
  if (aoa.length < 2) return defaultSample
  const headers = aoa[0].map(x => String(x ?? '').trim())
  const [xKey, ...metricKeys] = headers
  
  const series = metricKeys.map((key, i) => {
    const colIdx = headers.indexOf(key)
    const keyStr = String(key)
    const match = keyStr.match(/^([^(（\[]+)[(（\[]([^)）\]]+)[)）\]]$/)
    let name = keyStr
    let unit: string | undefined = undefined
    if (match) {
      name = match[1].trim()
      unit = match[2].trim()
    }
    const data = aoa.slice(1).map(row => ({
      x: String(row[0] ?? ''),
      y: row[colIdx] == null || String(row[colIdx]).trim() === '' ? null : Number(row[colIdx])
    })).filter(d => d.x !== '')
    
    const defaultSer = defaultSample?.series?.find((s: any) => s.name === name || s.name === keyStr)
    return {
      id: `s_${i}_${key}`,
      name,
      color: defaultSer?.color ?? PALETTE[i % PALETTE.length],
      unit: unit ?? defaultSer?.unit ?? '',
      data
    }
  })
  
  // 判断是否导入了自定义指标以决定是否重置 Y 轴配置实现刻度自适应
  const importedNames = series.map((s) => s.name)
  const defaultNames = (defaultSample?.series || []).map((s: any) => s.name)
  const isCustom =
    importedNames.length !== defaultNames.length ||
    importedNames.some((name) => !defaultNames.includes(name))

  let yAxes = defaultSample.yAxes
  if (isCustom) {
    const uniqueUnits = Array.from(new Set(series.map((s) => s.unit).filter(Boolean)))
    let yAxisName = '数值'
    if (series.length === 1) {
      const s = series[0]
      yAxisName = s.unit ? `${s.name} (${s.unit})` : s.name
    } else if (uniqueUnits.length === 1) {
      const names = series.map((s) => s.name).join('/')
      yAxisName = `${names} (${uniqueUnits[0]})`
    } else if (uniqueUnits.length > 1) {
      yAxisName = `数值 (${uniqueUnits.join('/')})`
    } else {
      yAxisName = series.map((s) => s.name).join('/')
    }
    yAxes = [{ id: 'y', name: yAxisName }] // min 和 max 不指定（即为 undefined），以启用 ECharts 自适应刻度
  }
  
  return {
    ...defaultSample,
    title,
    xAxisName: xKey,
    series,
    yAxes
  }
}

function parseRadarAoa(aoa: any[][], defaultSample: any, title: string): any {
  if (aoa.length < 2) return defaultSample
  const headers = aoa[0].map(x => String(x ?? '').trim())
  const seriesKeys = headers.slice(2)
  
  const dimensions = aoa.slice(1).map((row, i) => {
    const name = String(row[0] ?? `维度${i + 1}`).trim()
    const max = Number(row[1]) || 10
    return {
      id: `d_${i}`,
      name,
      max
    }
  }).filter(d => d.name !== '')
  
  const series = seriesKeys.map((key, si) => {
    const colIdx = headers.indexOf(key)
    const values: Record<string, number> = {}
    dimensions.forEach((d, i) => {
      const row = aoa[i + 1]
      values[d.id] = row ? (Number(row[colIdx]) || 0) : 0
    })
    
    const defaultSer = defaultSample?.series?.find((s: any) => s.name === key)
    return {
      id: `rs_${si}`,
      name: key,
      color: defaultSer?.color ?? PALETTE[si % PALETTE.length],
      values
    }
  })
  
  return {
    ...defaultSample,
    title,
    dimensions,
    series
  }
}

function parseHeatmapAoa(aoa: any[][], defaultSample: any, title: string): any {
  if (aoa.length < 2) return defaultSample
  
  let dataAoa = aoa
  let markerAoa: any[][] = []
  
  const markerSepIdx = aoa.findIndex(row => row && String(row[0] ?? '').includes('__标记线配置__'))
  if (markerSepIdx !== -1) {
    dataAoa = aoa.slice(0, markerSepIdx)
    markerAoa = aoa.slice(markerSepIdx + 2)
  }
  
  const headers = dataAoa[0].map(x => String(x ?? '').trim())
  const colNames = headers.slice(1)
  const cols = colNames.map((n, i) => ({ id: `c${i}`, name: n }))
  
  const rows = dataAoa.slice(1).map((row, i) => ({
    id: `r${i}`,
    name: String(row[0] ?? `行${i + 1}`).trim()
  })).filter(r => r.name !== '')
  
  const cells: Record<string, Record<string, any>> = {}
  rows.forEach((row, ri) => {
    cells[row.id] = {}
    cols.forEach((col, ci) => {
      const rowData = dataAoa[ri + 1]
      if (rowData) {
        const v = rowData[ci + 1]
        const num = v == null || String(v).trim() === '' ? null : Number(v)
        cells[row.id][col.id] = num != null && !Number.isNaN(num) ? num : (v == null || String(v).trim() === '' ? null : String(v))
      } else {
        cells[row.id][col.id] = null
      }
    })
  })
  
  const colMarkers: any[] = []
  const rowMarkers: any[] = []
  
  markerAoa.forEach((r, idx) => {
    if (!r || r.length < 3) return
    const typeVal = String(r[0] ?? '').trim()
    const targetVal = String(r[1] ?? '').trim()
    const labelVal = String(r[2] ?? '').trim()
    
    if (typeVal && targetVal && labelVal) {
      if (typeVal.includes('列')) {
        const col = cols.find(c => c.name === targetVal)
        if (col) {
          colMarkers.push({ id: `m_col_${idx}`, colId: col.id, label: labelVal, color: '#000' })
        }
      } else if (typeVal.includes('行')) {
        const row = rows.find(r => r.name === targetVal)
        if (row) {
          rowMarkers.push({ id: `m_row_${idx}`, rowId: row.id, label: labelVal, color: '#000' })
        }
      }
    }
  })
  
  return {
    ...defaultSample,
    title,
    rows,
    cols,
    cells,
    colMarkers,
    rowMarkers
  }
}

function parseNomogramAoa(aoa: any[][], defaultSample: any, title: string): any {
  if (aoa.length < 2) return defaultSample
  
  const selection: Record<string, any> = {}
  const config = JSON.parse(JSON.stringify(defaultSample))
  
  const rows = aoa.slice(1)
  config.variables.forEach((v: any) => {
    const varRows = rows.filter(r => String(r[0] ?? '').trim() === v.name)
    if (varRows.length === 0) return
    
    if (v.type === 'categorical') {
      const selectedRowIdx = varRows.findIndex(r => {
        const val = String(r[3] ?? '').trim().toLowerCase()
        return val === 'x' || val === '1' || val === '√' || val === '是'
      })
      if (selectedRowIdx !== -1) {
        selection[v.id] = selectedRowIdx
      }
    } else {
      const val = parseFloat(varRows[0]?.[3])
      if (!Number.isNaN(val)) {
        selection[v.id] = val
      }
    }
  })
  
  return {
    ...config,
    title,
    _selection: selection
  }
}


/** 从 Excel 工作簿中解析并自动匹配 13 种临床场景的图表数据，以及导入/选择这个患者 */
export async function importPatientMasterExcel(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  
  // 1. 查找患者信息 Sheet
  const infoSheetName = wb.SheetNames.find(n => n.includes('患者') || n.includes('病人'))
  if (!infoSheetName) throw new Error('Excel 文件中未找到「患者信息」工作表')
  
  const infoWs = wb.Sheets[infoSheetName]
  const infoAoa = XLSX.utils.sheet_to_json<any[]>(infoWs, { header: 1, defval: '' })
  
  const p: Partial<Patient> = {}
  infoAoa.forEach((row) => {
    if (!row || row.length < 2) return
    const key = String(row[0] ?? '').trim()
    const val = String(row[1] ?? '').trim()
    
    if (key === '姓名') p.name = val
    else if (key === '性别') p.gender = val
    else if (key === '年龄') p.age = Number(val) || 0
    else if (key === '科室床号') p.bed = val
    else if (key === '住院号(MRN)') p.mrn = val
    else if (key === '诊断') p.diagnosis = val
  })
  
  if (!p.name || !p.mrn) {
    throw new Error('患者「姓名」和「住院号(MRN)」为必填项')
  }
  
  const patientObj: Patient = {
    name: p.name,
    gender: p.gender ?? '男',
    age: p.age ?? 30,
    bed: p.bed ?? '',
    mrn: p.mrn,
    diagnosis: p.diagnosis ?? ''
  }
  
  // 2. 写入 store 存储患者列表
  const patientStore = usePatientStore.getState()
  patientStore.addPatient(patientObj)
  patientStore.setActivePatientId(patientObj.mrn)

  // 2.5 写入 store 存储临床判断与建议
  const clinicalSheetName = wb.SheetNames.find(n => n.includes('临床判断') || n.includes('建议'))
  if (clinicalSheetName) {
    const ws = wb.Sheets[clinicalSheetName]
    const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' })
    const LEVEL_MAP: Record<string, 'warning' | 'info' | 'success'> = {
      '预警': 'warning',
      '提示': 'info',
      '良好': 'success'
    }
    const clinicalStore = useClinicalStore.getState()
    const headers = aoa[0]?.map(x => String(x ?? '').trim()) ?? []
    
    const sceneIdx = headers.indexOf('应用场景')
    const lvlIdx = headers.indexOf('预警级别')
    const conclusionIdx = headers.indexOf('临床判断结论')
    const adviceIdx = headers.indexOf('应对建议')
    
    if (sceneIdx !== -1 && lvlIdx !== -1 && conclusionIdx !== -1 && adviceIdx !== -1) {
      aoa.slice(1).forEach((row) => {
        if (!row || row.length === 0) return
        const sceneLabel = String(row[sceneIdx] ?? '').trim()
        const lvlStr = String(row[lvlIdx] ?? '').trim()
        const conclusion = String(row[conclusionIdx] ?? '').trim()
        const advice = String(row[adviceIdx] ?? '').trim()
        
        if (sceneLabel) {
          const scenario = Object.values(SCENARIOS).find(s => s.label === sceneLabel)
          if (scenario) {
            const level = LEVEL_MAP[lvlStr] ?? 'info'
            clinicalStore.saveNote(scenario.sample, {
              level,
              conclusion,
              advice: advice === '无' ? '' : advice
            })
          }
        }
      })
    }
  }
  
  // 3. 逐个识别并导入其他的场景 Sheet
  let importCount = 0
  wb.SheetNames.forEach((sheetName) => {
    if (sheetName.includes('患者') || sheetName.includes('说明') || sheetName.includes('临床判断') || sheetName.includes('建议')) return
    
    // 根据 Sheet 名模糊匹配 Scenario
    const scenario = Object.values(SCENARIOS).find(s => sanitizeSheetName(s.label) === sheetName.trim())
    if (!scenario) return
    
    const ws = wb.Sheets[sheetName]
    const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' })
    
    // 从工作表顶部读取并保存临床判断结论、预警级别和应对建议
    let parsedConclusion = ''
    let parsedLevel: 'warning' | 'info' | 'success' = 'info'
    let parsedAdvice = ''
    
    aoa.forEach((row) => {
      if (!row || row.length < 2) return
      const cell0 = String(row[0] ?? '').trim()
      const cell1 = String(row[1] ?? '').trim()
      
      if (cell0 === '临床判断') parsedConclusion = cell1
      else if (cell0 === '预警级别') {
        if (cell1 === '预警') parsedLevel = 'warning'
        else if (cell1 === '良好') parsedLevel = 'success'
        else parsedLevel = 'info'
      }
      else if (cell0 === '应对建议') parsedAdvice = cell1 === '无' ? '' : cell1
    })
    
    if (parsedConclusion) {
      useClinicalStore.getState().saveNote(scenario.sample, {
        level: parsedLevel,
        conclusion: parsedConclusion,
        advice: parsedAdvice
      })
    }
    
    // 获取默认模板作为样式、参数的基础 fallback
    let defaultSample: any = null
    if (scenario.view === 'trend') defaultSample = trendSamples[scenario.sample]
    else if (scenario.view === 'radar') defaultSample = radarSamples[scenario.sample]
    else if (scenario.view === 'heatmap') defaultSample = heatmapSamples[scenario.sample]
    else if (scenario.view === 'nomogram') defaultSample = nomogramSamples[scenario.sample]
    
    if (!defaultSample) return
    
    const cleanDataAoa = getCleanDataAoa(aoa)
    let parsedConfig: any = null
    if (scenario.view === 'trend') parsedConfig = parseTrendAoa(cleanDataAoa, defaultSample, sheetName)
    else if (scenario.view === 'radar') parsedConfig = parseRadarAoa(cleanDataAoa, defaultSample, sheetName)
    else if (scenario.view === 'heatmap') parsedConfig = parseHeatmapAoa(cleanDataAoa, defaultSample, sheetName)
    else if (scenario.view === 'nomogram') parsedConfig = parseNomogramAoa(cleanDataAoa, defaultSample, sheetName)
    
    if (parsedConfig) {
      patientStore.updatePatientConfig(patientObj.mrn, scenario.key, parsedConfig)
      importCount++
    }
  })
  
  // 4. 重载当前活动场景图表展示为该新患者的对应数据
  const currentScenarioKey = useNavStore.getState().scenarioKey
  loadPatientData(patientObj.mrn, currentScenarioKey)
  
  return `成功导入并激活患者「${patientObj.name}」的 Excel 数据档案（成功自动匹配 ${importCount} 张图表指标）！`
}

/** 生成一键导入的 Excel 主模板 */
export function downloadMasterTemplate() {
  const LEVEL_LABEL: Record<string, string> = { warning: '预警', info: '提示', success: '良好' }
  const sheets: { name: string; aoa: any[][] }[] = []
  
  // 1. 患者信息主 Sheet
  sheets.push({
    name: '患者信息',
    aoa: [
      ['说明：修改下方信息以新增或覆盖病人，导入后系统会自动读取并更新图表指标', ''],
      ['基本信息', '数值 / 取值'],
      ['姓名', '张伟'],
      ['性别', '男'],
      ['年龄', 45],
      ['科室床号', '神经内科 05-2'],
      ['住院号(MRN)', 'MRN 0087612'],
      ['诊断', '急性脑梗死'],
      [],
      ['风险/预后评估预测（床旁计算结果同步）', ''],
      ['应用场景', '当前评估总分', '结局预测概率'],
      ['生存/预后预测', '145分', '3年生存率: 85%; 5年生存率: 62%'],
      ['并发症/不良事件预测', '110分', '甲状腺结节恶性概率: 75%'],
      ['诊断概率评估', '85分', '肺栓塞确诊概率: 90%'],
    ]
  })
  

  // 2. 依次生成13个场景的模板示例数据
  NAV.forEach((cat) => {
    cat.children.forEach((s) => {
      let config: any = null
      if (s.view === 'trend') config = trendSamples[s.sample]
      else if (s.view === 'radar') config = radarSamples[s.sample]
      else if (s.view === 'heatmap') config = heatmapSamples[s.sample]
      else if (s.view === 'nomogram') config = nomogramSamples[s.sample]
      
      if (config) {
        let aoaData: any[][] = []
        if (s.view === 'trend') aoaData = trendAoa(config).aoa
        else if (s.view === 'radar') aoaData = radarAoa(config).aoa
        else if (s.view === 'heatmap') aoaData = heatmapAoa(config).aoa
        else if (s.view === 'nomogram') aoaData = nomogramAoa(config).aoa
        
        // 热图追加标记线配置示例
        if (s.view === 'heatmap') {
          const heatmapCfg = config as HeatmapConfig
          const markerRows: any[][] = [
            [],
            ['__标记线配置__', '', ''],
            ['类型', '目标名称 (行名或列名)', '标记标签'],
          ]
          let hasMarkers = false
          heatmapCfg.colMarkers.forEach((m) => {
            const col = heatmapCfg.cols.find((c) => c.id === m.colId)
            if (col) { markerRows.push(['列标记线', col.name, m.label]); hasMarkers = true }
          })
          const rowMarkers = heatmapCfg.rowMarkers ?? []
          rowMarkers.forEach((m) => {
            const row = heatmapCfg.rows.find((r) => r.id === m.rowId)
            if (row) { markerRows.push(['行标记线', row.name, m.label]); hasMarkers = true }
          })
          if (hasMarkers) {
            aoaData = [...aoaData, ...markerRows]
          } else {
            // 提供默认占位符示例
            markerRows.push(['列标记线', heatmapCfg.cols[0]?.name ?? '示例列', '示例列标记文字'])
            markerRows.push(['行标记线', heatmapCfg.rows[0]?.name ?? '示例行', '示例行标记文字'])
            aoaData = [...aoaData, ...markerRows]
          }
        }

        // 获取临床判断
        const note = CLINICAL[s.sample]
        const levelStr = note ? (LEVEL_LABEL[note.level] ?? note.level) : '提示'
        const headerInfo = [
          ['图表标题', config.title ?? s.label],
          ['临床判断', note?.conclusion ?? '无'],
          ['预警级别', levelStr],
          ['应对建议', note?.advice ?? '无'],
          [] // 空行分隔
        ]
        
        sheets.push({
          name: s.label.slice(0, 31),
          aoa: [...headerInfo, ...aoaData]
        })
      }
    })
  })
  
  const filename = `MedViz_13种图数据整合包导入模板.xlsx`
  downloadWorkbook(filename, sheets)
  
  const downloadsPath = getDownloadsPath(filename)
  message.success({
    content: `总模板下载成功！已保存至：${downloadsPath}`,
    duration: 5,
  })
}
