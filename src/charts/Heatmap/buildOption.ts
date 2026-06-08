import type { EChartsOption } from 'echarts'
import type { HeatmapConfig } from './types'

export function buildHeatmapOption(config: HeatmapConfig): EChartsOption {
  const colNames = config.cols.map((c) => c.name)
  const rowNames = config.rows.map((r) => r.name)

  const isCat = config.mode === 'categorical'
  const catIndex = new Map(config.categories.map((c, i) => [c.key, i]))

  // data: [colIndex, rowIndex, value]；分类模式 value=分类序号
  const data: Array<[number, number, number | null]> = []
  config.rows.forEach((row, ri) => {
    config.cols.forEach((col, ci) => {
      const raw = config.cells[row.id]?.[col.id]
      if (raw == null || raw === '') {
        data.push([ci, ri, null])
        return
      }
      const v = isCat ? catIndex.get(String(raw)) ?? null : Number(raw)
      data.push([ci, ri, v as number | null])
    })
  })

  // 连续模式 min/max（缺省自动取数据范围）
  const nums = data.map((d) => d[2]).filter((v): v is number => v != null)
  const dataMin = nums.length ? Math.min(...nums) : 0
  const dataMax = nums.length ? Math.max(...nums) : 1

  const visualMap: EChartsOption['visualMap'] = isCat
    ? {
        type: 'piecewise',
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        pieces: config.categories.map((c, i) => ({ value: i, label: c.label, color: c.color })),
        showLabel: true,
      }
    : {
        type: 'continuous',
        min: config.colorRange.min ?? dataMin,
        max: config.colorRange.max ?? dataMax,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        inRange: { color: config.colorRange.colors },
      }

  // 列标记线（竖线）
  const markLineData = config.colMarkers
    .map((m) => {
      const idx = config.cols.findIndex((c) => c.id === m.colId)
      if (idx < 0) return null
      return {
        xAxis: idx,
        label: { formatter: m.label, fontSize: 10, color: m.color ?? '#000' },
        lineStyle: { color: m.color ?? '#000', width: 2, type: 'solid' as const },
      }
    })
    .filter(Boolean)

  return {
    title: { text: config.title, left: 'center', textStyle: { fontSize: 16 } },
    tooltip: {
      position: 'top',
      formatter: (p: any) => {
        const [ci, ri, v] = p.data
        const label = isCat ? config.categories[v]?.label ?? '—' : v
        return `${rowNames[ri]} · ${colNames[ci]}<br/><b>${label ?? '无数据'}</b>`
      },
    },
    toolbox: {
      right: 12,
      feature: { saveAsImage: { title: '导出PNG', name: config.title } },
    },
    grid: { top: 48, left: 110, right: 24, bottom: 64, containLabel: true },
    xAxis: {
      type: 'category',
      data: colNames,
      splitArea: { show: true },
      axisLabel: { interval: 0, rotate: colNames.length > 8 ? 45 : 0, fontSize: 11 },
    },
    yAxis: {
      type: 'category',
      data: rowNames,
      splitArea: { show: true },
      axisLabel: { fontSize: 11 },
    },
    visualMap,
    series: [
      {
        type: 'heatmap',
        data,
        label: {
          show: config.showValueLabel ?? false,
          fontSize: 10,
          formatter: (p: any) =>
            isCat ? config.categories[p.data[2]]?.label ?? '' : (p.data[2] ?? ''),
        },
        emphasis: { itemStyle: { borderColor: '#333', borderWidth: 1 } },
        markLine: markLineData.length
          ? { symbol: 'none', data: markLineData as any }
          : undefined,
      },
    ],
  }
}
