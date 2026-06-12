import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { HeatmapConfig } from './types'
import { buildHeatmapOption } from './buildOption'
import { withExcelToolbox } from '../excelToolbox'

interface Props {
  config: HeatmapConfig
  height?: number
  onExportExcel?: () => void
}

export default function Heatmap({ config, height = 480, onExportExcel }: Props) {
  const option = useMemo(() => withExcelToolbox(buildHeatmapOption(config), onExportExcel), [config, onExportExcel])
  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      notMerge
      opts={{ renderer: 'canvas' }}
    />
  )
}
