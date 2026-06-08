import type {
  NomogramConfig,
  NomogramVariable,
  NomogramOutcome,
  NomogramSelection,
} from './types'

/** 线性插值（clamp 到端点之间） */
function lerp(x: number, x0: number, y0: number, x1: number, y1: number): number {
  if (x1 === x0) return y0
  const t = (x - x0) / (x1 - x0)
  return y0 + t * (y1 - y0)
}

/** 连续变量：数值 → 分值（按锚点分段线性，超出范围 clamp） */
export function continuousPoints(v: NomogramVariable, value: number): number {
  const anchors = [...(v.valueAnchors ?? [])].sort((a, b) => a.value - b.value)
  if (anchors.length === 0) return 0
  if (value <= anchors[0].value) return anchors[0].points
  if (value >= anchors[anchors.length - 1].value) return anchors[anchors.length - 1].points
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i]
    const b = anchors[i + 1]
    if (value >= a.value && value <= b.value) {
      return lerp(value, a.value, a.points, b.value, b.points)
    }
  }
  return anchors[anchors.length - 1].points
}

/** 某变量在当前选择下的分值 */
export function variablePoints(v: NomogramVariable, sel: number | undefined): number {
  if (sel == null) return 0
  if (v.type === 'categorical') {
    return v.levels?.[sel]?.points ?? 0
  }
  return continuousPoints(v, sel)
}

/** 总分 */
export function totalPoints(config: NomogramConfig, selection: NomogramSelection): number {
  return config.variables.reduce((sum, v) => sum + variablePoints(v, selection[v.id]), 0)
}

/** 结局：总分 → 概率（锚点按总分排序后分段线性，clamp） */
export function outcomeProbability(outcome: NomogramOutcome, total: number): number {
  const anchors = [...outcome.anchors].sort((a, b) => a.totalPoints - b.totalPoints)
  if (anchors.length === 0) return 0
  if (total <= anchors[0].totalPoints) return anchors[0].prob
  if (total >= anchors[anchors.length - 1].totalPoints) return anchors[anchors.length - 1].prob
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i]
    const b = anchors[i + 1]
    if (total >= a.totalPoints && total <= b.totalPoints) {
      return lerp(total, a.totalPoints, a.prob, b.totalPoints, b.prob)
    }
  }
  return anchors[anchors.length - 1].prob
}

/** 单变量分值轴的域（含负分则下探） */
export function pointsDomain(config: NomogramConfig): [number, number] {
  let min = 0
  for (const v of config.variables) {
    const pts =
      v.type === 'categorical'
        ? (v.levels ?? []).map((l) => l.points)
        : (v.valueAnchors ?? []).map((a) => a.points)
    for (const p of pts) min = Math.min(min, p)
  }
  return [min, config.pointsMax]
}

/** 总分轴的域：各变量分值范围求和 */
export function totalDomain(config: NomogramConfig): [number, number] {
  let min = 0
  let max = 0
  for (const v of config.variables) {
    const pts =
      v.type === 'categorical'
        ? (v.levels ?? []).map((l) => l.points)
        : (v.valueAnchors ?? []).map((a) => a.points)
    if (pts.length === 0) continue
    min += Math.min(...pts)
    max += Math.max(...pts)
  }
  return [min, max || 1]
}
