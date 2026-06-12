import type { HeatmapConfig, HeatAxisItem } from './types'

// 用二维数组 + 行列名快速构造，避免手写嵌套对象
function build(
  rowNames: string[],
  colNames: string[],
  matrix: Array<Array<number | string | null>>,
): { rows: HeatAxisItem[]; cols: HeatAxisItem[]; cells: HeatmapConfig['cells'] } {
  const rows = rowNames.map((n, i) => ({ id: `r${i}`, name: n }))
  const cols = colNames.map((n, i) => ({ id: `c${i}`, name: n }))
  const cells: HeatmapConfig['cells'] = {}
  rows.forEach((r, ri) => {
    cells[r.id] = {}
    cols.forEach((c, ci) => {
      cells[r.id][c.id] = matrix[ri]?.[ci] ?? null
    })
  })
  return { rows, cols, cells }
}

/** 示例1：肿瘤驱动基因突变热图（分类色块） */
const mut = build(
  ['患者A', '患者B', '患者C', '患者D', '患者E', '患者F'],
  ['EGFR', 'ALK', 'ROS1', 'KRAS', 'BRAF', 'TP53'],
  [
    ['point', 'wild', 'wild', 'wild', 'wild', 'point'],
    ['wild', 'fusion', 'wild', 'wild', 'wild', 'wild'],
    ['wild', 'wild', 'fusion', 'wild', 'wild', 'point'],
    ['wild', 'wild', 'wild', 'point', 'wild', 'point'],
    ['amp', 'wild', 'wild', 'wild', 'point', 'wild'],
    ['wild', 'wild', 'wild', 'point', 'wild', 'point'],
  ],
)
export const geneMutation: HeatmapConfig = {
  title: '肿瘤驱动基因突变热图',
  mode: 'categorical',
  ...mut,
  colorRange: { colors: ['#fff', '#cf1322'] },
  categories: [
    { key: 'point', label: '点突变', color: '#cf1322' },
    { key: 'amp', label: '扩增', color: '#1677ff' },
    { key: 'fusion', label: '融合', color: '#fadb14' },
    { key: 'wild', label: '野生型', color: '#d9d9d9' },
  ],
  colMarkers: [],
  rowMarkers: [],
  showValueLabel: false,
}

/** 示例2：类器官药物敏感性 IC50 热图（连续，绿=敏感 红=耐药） */
const ic50 = build(
  ['类器官O1', '类器官O2', '类器官O3', '类器官O4'],
  ['顺铂', '卡铂', '紫杉醇', '吉西他滨', '奥沙利铂'],
  [
    [0.8, 1.2, 9.5, 2.1, 1.0],
    [2.4, 2.0, 8.8, 3.0, 2.2],
    [6.5, 7.0, 1.5, 5.5, 6.8],
    [1.1, 0.9, 7.2, 1.8, 1.3],
  ],
)
export const drugSensitivity: HeatmapConfig = {
  title: '类器官药物敏感性 IC50 热图（μM）',
  mode: 'continuous',
  ...ic50,
  colorRange: { min: 0, max: 10, colors: ['#52c41a', '#fffbe6', '#cf1322'] },
  categories: [],
  colMarkers: [],
  rowMarkers: [],
  showValueLabel: true,
}

/** 示例3：体温时序热图（连续 + 抗生素给药竖线） */
const temp = build(
  ['Day1', 'Day2', 'Day3', 'Day4', 'Day5', 'Day6', 'Day7'],
  ['00-04', '04-08', '08-12', '12-16', '16-20', '20-24'],
  [
    [38.5, 38.8, 39.2, 39.5, 39.1, 38.9],
    [38.6, 39.0, 39.4, 39.6, 39.3, 39.0],
    [38.2, 38.5, 38.9, 39.0, 38.7, 38.4],
    [37.8, 38.0, 38.3, 38.5, 38.2, 37.9],
    [37.5, 37.6, 37.9, 38.0, 37.8, 37.5],
    [37.1, 37.2, 37.4, 37.5, 37.3, 37.1],
    [36.8, 36.9, 37.0, 37.1, 36.9, 36.8],
  ],
)
export const tempTimeline: HeatmapConfig = {
  title: '体温时序热图（抗生素给药后退热）',
  mode: 'continuous',
  ...temp,
  colorRange: { min: 36.5, max: 40, colors: ['#ffffff', '#ffccc7', '#cf1322'] },
  categories: [],
  colMarkers: [{ id: 'm1', colId: 'c2', label: '换用碳青霉烯', color: '#000' }],
  rowMarkers: [],
  showValueLabel: true,
}

export const heatmapSamples: Record<string, HeatmapConfig> = {
  '基因突变(分类色块)': geneMutation,
  '药敏IC50(连续)': drugSensitivity,
  '体温时序(带给药竖线)': tempTimeline,
}
