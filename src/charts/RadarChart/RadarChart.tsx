import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { RadarChartConfig } from './types'
import { buildRadarOption } from './buildOption'

interface Props {
  config: RadarChartConfig
  height?: number
}

export default function RadarChart({ config, height = 460 }: Props) {
  const option = useMemo(() => buildRadarOption(config), [config])
  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      notMerge
      opts={{ renderer: 'canvas' }}
    />
  )
}
