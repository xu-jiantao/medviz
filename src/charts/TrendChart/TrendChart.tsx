import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { TrendChartConfig } from './types'
import { buildTrendOption } from './buildOption'
import { withExcelToolbox } from '../excelToolbox'

interface Props {
  config: TrendChartConfig
  height?: number
  onExportExcel?: () => void
}

export default function TrendChart({ config, height = 460, onExportExcel }: Props) {
  const option = useMemo(() => withExcelToolbox(buildTrendOption(config), onExportExcel), [config, onExportExcel])
  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      notMerge
      opts={{ renderer: 'canvas' }}
    />
  )
}
