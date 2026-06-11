// 左侧二级导航：一级=图形类别（应用域），二级=临床应用场景
// 每个场景绑定一个内置示例（sample 名与各 charts/*/samples.ts 的 key 对应）

export type ViewKey = 'trend' | 'radar' | 'heatmap' | 'nomogram'

export interface Scenario {
  key: string
  label: string
  view: ViewKey
  sample: string
}

export interface NavCategory {
  key: ViewKey
  label: string
  icon: 'trend' | 'radar' | 'heatmap' | 'nomogram'
  children: Scenario[]
}

export const NAV: NavCategory[] = [
  {
    key: 'trend', label: '趋势分析', icon: 'trend',
    children: [
      { key: 'trend-single', label: '单指标纵向趋势', view: 'trend', sample: '高血压3年血压趋势' },
      { key: 'trend-multi', label: '多指标叠加趋势', view: 'trend', sample: '脓毒症多指标(归一化)' },
      { key: 'trend-compare', label: '治疗/方案对比趋势', view: 'trend', sample: '心脏术后BNP' },
    ],
  },
  {
    key: 'radar', label: '综合评估', icon: 'radar',
    children: [
      { key: 'radar-physio', label: '生理评分 (APACHE/SOFA)', view: 'radar', sample: 'SOFA器官功能评分' },
      { key: 'radar-special', label: '专科评估 (心功能/肿瘤/术前)', view: 'radar', sample: 'APACHE II生理评分' },
      { key: 'radar-dynamic', label: '动态对比 (康复进程)', view: 'radar', sample: '脑卒中康复(入院vs出院)' },
    ],
  },
  {
    key: 'heatmap', label: '矩阵热图', icon: 'heatmap',
    children: [
      { key: 'heat-vital', label: '检验/生命体征矩阵', view: 'heatmap', sample: '体温时序(带给药竖线)' },
      { key: 'heat-event', label: '时间-事件追踪', view: 'heatmap', sample: '体温时序(带给药竖线)' },
      { key: 'heat-omics', label: '影像/病理组学', view: 'heatmap', sample: '基因突变(分类色块)' },
      { key: 'heat-precision', label: '基因/药敏精准医疗', view: 'heatmap', sample: '药敏IC50(连续)' },
    ],
  },
  {
    key: 'nomogram', label: '风险预测模型', icon: 'nomogram',
    children: [
      { key: 'nomo-survival', label: '生存/预后预测', view: 'nomogram', sample: '非小细胞肺癌术后生存' },
      { key: 'nomo-complication', label: '并发症/不良事件预测', view: 'nomogram', sample: '甲状腺结节恶性概率' },
      { key: 'nomo-diagnosis', label: '诊断概率评估', view: 'nomogram', sample: '肺栓塞确诊概率' },
    ],
  },
]

/** 所有场景平铺，便于按 key 查找 */
export const SCENARIOS: Record<string, Scenario> = Object.fromEntries(
  NAV.flatMap((c) => c.children).map((s) => [s.key, s]),
)

export const DEFAULT_SCENARIO = 'trend-single'
