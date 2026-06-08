// 趋势图配置模型 —— 所有可定制项都在这里，配置面板 schema 驱动渲染

/** 单条曲线（一个指标） */
export interface TrendSeries {
  id: string
  name: string // 指标名，如 "收缩压"
  unit?: string // 单位，如 "mmHg"
  color?: string
  /** 绑定到哪一个 Y 轴（多指标叠加时用），默认 0 */
  yAxisIndex?: number
  /** 是否对该指标做 0~1 归一化（多指标量纲差异大时用） */
  normalize?: boolean
  data: Array<{ x: string | number; y: number | null }>
}

/** Y 轴定义，可有多个（双 Y 轴 / 多 Y 轴叠加） */
export interface TrendYAxis {
  id: string
  name: string
  min?: number
  max?: number
  position?: 'left' | 'right'
}

/** 参考线（如心衰阈值 400 pg/mL、目标血糖上下限） */
export interface ReferenceLine {
  id: string
  label: string
  value: number
  yAxisIndex?: number
  color?: string
  lineStyle?: 'solid' | 'dashed' | 'dotted'
}

/** 参考区间 / 阴影区域（如目标血糖 4.4~7.0、参考区间） */
export interface ReferenceBand {
  id: string
  label: string
  from: number
  to: number
  yAxisIndex?: number
  color?: string // 半透明色
}

/** 事件标注（用药调整节点、化疗给药日、抗生素更换等） —— 垂直标注线 */
export interface EventMarker {
  id: string
  x: string | number // 落在横轴的哪个位置
  label: string
  color?: string
}

export interface TrendChartConfig {
  title: string
  xAxisName: string
  xAxisType: 'category' | 'time'
  yAxes: TrendYAxis[]
  series: TrendSeries[]
  referenceLines: ReferenceLine[]
  referenceBands: ReferenceBand[]
  eventMarkers: EventMarker[]
  /** 是否平滑曲线 */
  smooth?: boolean
}
