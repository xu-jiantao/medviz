import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { RadarChartConfig } from './types'
import { buildRadarOption } from './buildOption'
import { withExcelToolbox } from '../excelToolbox'

interface Props {
  config: RadarChartConfig
  height?: number
  onExportExcel?: () => void
}

export default function RadarChart({ config, height = 460, onExportExcel }: Props) {
  const option = useMemo(() => withExcelToolbox(buildRadarOption(config), onExportExcel), [config, onExportExcel])
  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      notMerge
      opts={{ renderer: 'canvas' }}
    />
  )
}
