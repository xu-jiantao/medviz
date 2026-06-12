import type { EChartsOption } from 'echarts'
import type { RadarChartConfig } from './types'

export function buildRadarOption(config: RadarChartConfig): EChartsOption {
  const indicator = config.dimensions.map((d) => ({ name: d.name, max: d.max }))

  const data = config.series.map((s) => {
    const totalScore = config.dimensions.reduce((sum, d) => sum + (s.values[d.id] ?? 0), 0)
    return {
      name: `${s.name} (${totalScore}分)`,
      value: config.dimensions.map((d) => s.values[d.id] ?? 0),
      itemStyle: { color: s.color },
      lineStyle: { color: s.color, width: 2 },
      areaStyle: config.fill ? { color: s.color, opacity: 0.15 } : undefined,
    }
  })

  return {
    title: { text: config.title, left: 'center', textStyle: { fontSize: 16 } },
    tooltip: { trigger: 'item' },
    legend: { top: 28, type: 'scroll' },
    toolbox: {
      right: 12,
      feature: {
        saveAsImage: { title: '导出PNG', name: config.title },
        restore: { title: '复位' },
      },
    },
    radar: {
      shape: config.shape,
      center: ['50%', '56%'],
      radius: '62%',
      indicator,
      axisName: { fontSize: 11, color: '#595959' },
      splitArea: { areaStyle: { color: ['#fff', '#fafafa'] } },
    },
    series: [
      {
        type: 'radar',
        symbolSize: 5,
        data,
      },
    ],
  }
}
