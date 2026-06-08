import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { TrendChartConfig } from './types'
import { buildTrendOption } from './buildOption'

interface Props {
  config: TrendChartConfig
  height?: number
}

export default function TrendChart({ config, height = 460 }: Props) {
  const option = useMemo(() => buildTrendOption(config), [config])
  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      notMerge
      opts={{ renderer: 'canvas' }}
    />
  )
}
