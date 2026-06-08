import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { HeatmapConfig } from './types'
import { buildHeatmapOption } from './buildOption'

interface Props {
  config: HeatmapConfig
  height?: number
}

export default function Heatmap({ config, height = 480 }: Props) {
  const option = useMemo(() => buildHeatmapOption(config), [config])
  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      notMerge
      opts={{ renderer: 'canvas' }}
    />
  )
}
