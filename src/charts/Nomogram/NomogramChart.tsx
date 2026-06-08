import { useMemo } from 'react'
import { scaleLinear } from 'd3-scale'
import type { NomogramConfig, NomogramSelection } from './types'
import {
  variablePoints, totalPoints, outcomeProbability, pointsDomain, totalDomain, continuousPoints,
} from './calc'

interface Props {
  config: NomogramConfig
  selection: NomogramSelection
  showReading: boolean
}

const W = 920
const LABEL_W = 130
const AX0 = LABEL_W
const AX1 = W - 30
const TOP = 28
const ROW = 58

function Axis({ y, x0, x1 }: { y: number; x0: number; x1: number }) {
  return <line x1={x0} y1={y} x2={x1} y2={y} stroke="#595959" strokeWidth={1} />
}
function Tick({ x, y, label, below = true }: { x: number; y: number; label: string; below?: boolean }) {
  return (
    <g>
      <line x1={x} y1={y - 4} x2={x} y2={y + 4} stroke="#595959" strokeWidth={1} />
      <text x={x} y={below ? y + 16 : y - 8} fontSize={10} textAnchor="middle" fill="#595959">
        {label}
      </text>
    </g>
  )
}

export default function NomogramChart({ config, selection, showReading }: Props) {
  const layout = useMemo(() => {
    const pScale = scaleLinear().domain(pointsDomain(config)).range([AX0, AX1])
    const tScale = scaleLinear().domain(totalDomain(config)).range([AX0, AX1])
    const total = totalPoints(config, selection)
    const rowsCount = 1 + config.variables.length + 1 + config.outcomes.length
    const height = TOP * 2 + ROW * rowsCount
    return { pScale, tScale, total, height }
  }, [config, selection])

  const { pScale, tScale, total, height } = layout

  let row = 0
  const yOf = (i: number) => TOP + ROW * i + 18
  const readX = tScale(total)

  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" style={{ maxHeight: '70vh' }}>
      {/* 1. Points 轴 */}
      {(() => {
        const y = yOf(row++)
        return (
          <g key="points">
            <text x={LABEL_W - 8} y={y + 4} fontSize={12} textAnchor="end" fontWeight={600}>分值 Points</text>
            <Axis y={y} x0={AX0} x1={AX1} />
            {pScale.ticks(10).map((t) => (
              <Tick key={t} x={pScale(t)} y={y} label={String(t)} />
            ))}
          </g>
        )
      })()}

      {/* 2. 各变量轴 */}
      {config.variables.map((v) => {
        const y = yOf(row++)
        const selPts = variablePoints(v, selection[v.id])
        return (
          <g key={v.id}>
            <text x={LABEL_W - 8} y={y + 4} fontSize={12} textAnchor="end">{v.name}</text>
            <Axis y={y} x0={pScale(0)} x1={AX1} />
            {v.type === 'categorical'
              ? (v.levels ?? []).map((lv, i) => (
                  <Tick key={i} x={pScale(lv.points)} y={y} label={lv.label} below={i % 2 === 0} />
                ))
              : (() => {
                  const anchors = [...(v.valueAnchors ?? [])].sort((a, b) => a.value - b.value)
                  if (anchors.length < 2) return null
                  const vScale = scaleLinear().domain([anchors[0].value, anchors[anchors.length - 1].value])
                  return vScale.ticks(5).map((val) => (
                    <Tick key={val} x={pScale(continuousPoints(v, val))} y={y} label={`${val}${v.unit ?? ''}`} />
                  ))
                })()}
            {showReading && selection[v.id] != null && (
              <circle cx={pScale(selPts)} cy={y} r={4} fill="#fa541c" />
            )}
          </g>
        )
      })}

      {/* 3. Total Points 轴 */}
      {(() => {
        const y = yOf(row++)
        return (
          <g key="total">
            <text x={LABEL_W - 8} y={y + 4} fontSize={12} textAnchor="end" fontWeight={600}>总分 Total</text>
            <Axis y={y} x0={AX0} x1={AX1} />
            {tScale.ticks(10).map((t) => (
              <Tick key={t} x={tScale(t)} y={y} label={String(Math.round(t))} />
            ))}
            {showReading && <circle cx={readX} cy={y} r={4} fill="#cf1322" />}
          </g>
        )
      })()}

      {/* 4. 各结局概率轴 */}
      {config.outcomes.map((o) => {
        const y = yOf(row++)
        const prob = outcomeProbability(o, total)
        return (
          <g key={o.id}>
            <text x={LABEL_W - 8} y={y + 4} fontSize={12} textAnchor="end" fill={o.color}>{o.name}</text>
            <Axis y={y} x0={AX0} x1={AX1} />
            {[...o.anchors].sort((a, b) => a.totalPoints - b.totalPoints).map((a, i) => (
              <Tick key={i} x={tScale(a.totalPoints)} y={y} label={`${Math.round(a.prob * 100)}%`} below={i % 2 === 0} />
            ))}
            {showReading && (
              <>
                <circle cx={readX} cy={y} r={4} fill={o.color ?? '#cf1322'} />
                <text x={readX + 8} y={y - 6} fontSize={12} fontWeight={700} fill={o.color ?? '#cf1322'}>
                  {(prob * 100).toFixed(0)}%
                </text>
              </>
            )}
          </g>
        )
      })}

      {/* 读数竖线：从总分轴贯穿到底部结局轴 */}
      {showReading && (
        <line
          x1={readX} y1={yOf(1 + config.variables.length) - 4}
          x2={readX} y2={yOf(1 + config.variables.length + config.outcomes.length) + 4}
          stroke="#cf1322" strokeWidth={1.5} strokeDasharray="4 3"
        />
      )}
    </svg>
  )
}
