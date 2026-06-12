// 热图配置模型 —— 行/列/颜色可自定义，支持「连续数值」和「分类色块」两种模式

export type HeatmapMode = 'continuous' | 'categorical'

export interface HeatAxisItem {
  id: string
  name: string
}

/** 分类模式下的一类（如 点突变=红、扩增=蓝、融合=黄、野生型=灰） */
export interface HeatCategory {
  key: string
  label: string
  color: string
}

/** 列标记线（如抗生素给药时刻的竖线） */
export interface HeatColMarker {
  id: string
  colId: string
  label: string
  color?: string
}

/** 行标记线 */
export interface HeatRowMarker {
  id: string
  rowId: string
  label: string
  color?: string
}

export interface HeatmapConfig {
  title: string
  mode: HeatmapMode
  rows: HeatAxisItem[]
  cols: HeatAxisItem[]
  /** cells[rowId][colId] = 数值(连续) 或 分类 key(分类)；空值用 null */
  cells: Record<string, Record<string, number | string | null>>

  // 连续模式：
  colorRange: { min?: number; max?: number; colors: string[] }
  // 分类模式：
  categories: HeatCategory[]

  colMarkers: HeatColMarker[]
  rowMarkers?: HeatRowMarker[]
  showValueLabel?: boolean
  showClustering?: boolean
}

/** 内置连续配色方案 */
export const COLOR_PRESETS: Record<string, string[]> = {
  '白→红（异常程度）': ['#ffffff', '#ffccc7', '#cf1322'],
  '绿→红（敏感→耐药）': ['#52c41a', '#fffbe6', '#cf1322'],
  '蓝→白→红（双向）': ['#1677ff', '#ffffff', '#cf1322'],
  '白→蓝': ['#ffffff', '#bae0ff', '#0958d9'],
}
