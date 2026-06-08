// 列线图配置模型 —— 把统计模型（Logistic/Cox）转成可视化计算尺
// 设计为「手动建模」：用户定义变量、各档位分值、总分→概率映射；
// 二期可由 Python 后端从原始数据拟合后自动写入这套结构。

/** 分类变量的一个档位（如 病理分期 IB = 10分） */
export interface NomogramLevel {
  label: string
  points: number
}

/** 连续变量的锚点（value→points 线性映射，至少 2 个） */
export interface ValueAnchor {
  value: number
  points: number
}

export interface NomogramVariable {
  id: string
  name: string
  type: 'categorical' | 'continuous'
  unit?: string
  levels?: NomogramLevel[] // 分类
  valueAnchors?: ValueAnchor[] // 连续
}

/** 结局轴：把「总分」映射到「概率」的锚点（总分→概率，非线性刻度） */
export interface OutcomeAnchor {
  prob: number // 0~1
  totalPoints: number
}

export interface NomogramOutcome {
  id: string
  name: string // 如 "5年生存率" / "确诊PE概率"
  color?: string
  anchors: OutcomeAnchor[]
}

export interface NomogramConfig {
  title: string
  pointsMax: number // 单变量分值轴上限，通常 100
  variables: NomogramVariable[]
  outcomes: NomogramOutcome[]
}

/** 床旁读数：每个变量当前选择 —— 分类存档位 index，连续存数值 */
export type NomogramSelection = Record<string, number>
