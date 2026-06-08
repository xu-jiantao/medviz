// 雷达图配置模型 —— 维度数量与规则可自定义，支持多组叠加对比

/** 一个维度（雷达图的一根轴），如 "氧合"、"GCS评分" */
export interface RadarDimension {
  id: string
  name: string
  max: number // 该轴满分 / 量程上限
}

/** 一组评估数据（如 "入院时" / "出院时"，或 患者A / 患者B） */
export interface RadarSeries {
  id: string
  name: string
  color?: string
  /** 维度 id -> 数值。用 id 关联，维度增删/换序都不会错位 */
  values: Record<string, number>
}

export interface RadarChartConfig {
  title: string
  dimensions: RadarDimension[]
  series: RadarSeries[]
  shape: 'polygon' | 'circle'
  /** 区域是否填充半透明色 */
  fill?: boolean
}
