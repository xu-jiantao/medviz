import type { EChartsOption } from 'echarts'
import type { HeatmapConfig } from './types'
import { clusterItems } from './cluster'

export function buildHeatmapOption(config: HeatmapConfig): EChartsOption {
  const isCat = config.mode === 'categorical'
  const catIndex = new Map(config.categories.map((c, i) => [c.key, i]))

  let activeRows = config.rows
  let activeCols = config.cols
  let rowTreeLines: Array<[number, number] | null> = []
  let colTreeLines: Array<[number, number] | null> = []
  let rowMaxHeight = 0
  let colMaxHeight = 0

  const hasClustering = !!(config.showClustering && config.rows.length >= 2 && config.cols.length >= 2)

  if (hasClustering) {
    // 层次聚类 - 行
    const rowClustered = clusterItems(
      config.rows,
      (rowId) => config.cols.map((col) => config.cells[rowId]?.[col.id] ?? null),
      isCat
    )
    // 层次聚类 - 列
    const colClustered = clusterItems(
      config.cols,
      (colId) => config.rows.map((row) => config.cells[row.id]?.[colId] ?? null),
      isCat
    )

    activeRows = rowClustered.orderedIds.map((id) => config.rows.find((r) => r.id === id)!)
    activeCols = colClustered.orderedIds.map((id) => config.cols.find((c) => c.id === id)!)
    rowTreeLines = rowClustered.treeLines
    colTreeLines = colClustered.treeLines.map((pt) => pt ? [pt[1], pt[0]] : null)
    rowMaxHeight = rowClustered.maxHeight
    colMaxHeight = colClustered.maxHeight
  }

  const colNames = activeCols.map((c) => c.name)
  const rowNames = activeRows.map((r) => r.name)

  // data: [colIndex, rowIndex, value]；分类模式 value=分类序号
  const data: Array<[number, number, number | null]> = []
  activeRows.forEach((row, ri) => {
    activeCols.forEach((col, ci) => {
      const raw = config.cells[row.id]?.[col.id]
      if (raw == null || raw === '') {
        data.push([ci, ri, null])
        return
      }
      const v = isCat ? catIndex.get(String(raw)) ?? null : Number(raw)
      data.push([ci, ri, v as number | null])
    })
  })

  // 连续模式 min/max
  const nums = data.map((d) => d[2]).filter((v): v is number => v != null)
  const dataMin = nums.length ? Math.min(...nums) : 0
  const dataMax = nums.length ? Math.max(...nums) : 1

  const visualMap: EChartsOption['visualMap'] = isCat
    ? {
        type: 'piecewise',
        orient: hasClustering ? 'vertical' : 'horizontal',
        left: hasClustering ? undefined : 'center',
        right: hasClustering ? 10 : undefined,
        top: hasClustering ? 100 : undefined,
        bottom: hasClustering ? undefined : 0,
        pieces: config.categories.map((c, i) => ({ value: i, label: c.label, color: c.color })),
        showLabel: true,
      }
    : {
        type: 'continuous',
        min: config.colorRange.min ?? dataMin,
        max: config.colorRange.max ?? dataMax,
        calculable: true,
        orient: hasClustering ? 'vertical' : 'horizontal',
        left: hasClustering ? undefined : 'center',
        right: hasClustering ? 10 : undefined,
        top: hasClustering ? 100 : undefined,
        bottom: hasClustering ? undefined : 0,
        inRange: { color: config.colorRange.colors },
      }

  // 列标记线（竖线）
  const markLineData = config.colMarkers
    .map((m) => {
      const idx = activeCols.findIndex((c) => c.id === m.colId)
      if (idx < 0) return null
      return {
        xAxis: idx,
        label: { formatter: m.label, fontSize: 10, color: m.color ?? '#000' },
        lineStyle: { color: m.color ?? '#000', width: 2, type: 'solid' as const },
      }
    })
    .filter(Boolean)

  // 行标记线（横线）
  const rowMarkLineData = (config.rowMarkers ?? [])
    .map((m) => {
      const idx = activeRows.findIndex((r) => r.id === m.rowId)
      if (idx < 0) return null
      return {
        yAxis: idx,
        label: { formatter: m.label, position: 'insideStartTop', fontSize: 10, color: m.color ?? '#000' },
        lineStyle: { color: m.color ?? '#000', width: 2, type: 'solid' as const },
      }
    })
    .filter(Boolean)

  // Grid / Axes 定义
  let grid: EChartsOption['grid']
  let xAxis: EChartsOption['xAxis']
  let yAxis: EChartsOption['yAxis']

  if (hasClustering) {
    grid = [
      { left: 125, right: 140, top: 100, bottom: 80 }, // 0: Heatmap
      { left: 30, width: 80, top: 100, bottom: 80 },   // 1: Row Tree
      { left: 125, right: 140, top: 20, height: 60 }   // 2: Col Tree
    ]

    xAxis = [
      {
        gridIndex: 0,
        type: 'category',
        data: colNames,
        splitArea: { show: true },
        axisLabel: { interval: 0, rotate: colNames.length > 8 ? 45 : 0, fontSize: 11 },
      },
      {
        gridIndex: 1,
        type: 'value',
        inverse: true,
        min: 0,
        max: rowMaxHeight,
        show: false,
      },
      {
        gridIndex: 2,
        type: 'value',
        min: -0.5,
        max: activeCols.length - 0.5,
        show: false,
      }
    ]

    yAxis = [
      {
        gridIndex: 0,
        type: 'category',
        data: rowNames,
        position: 'right', // Put labels on the right side of the heatmap
        splitArea: { show: true },
        axisLabel: { fontSize: 11 },
      },
      {
        gridIndex: 1,
        type: 'value',
        min: -0.5,
        max: activeRows.length - 0.5,
        show: false,
      },
      {
        gridIndex: 2,
        type: 'value',
        min: 0,
        max: colMaxHeight,
        show: false,
      }
    ]
  } else {
    grid = { top: 48, left: 110, right: 24, bottom: 64, containLabel: true }
    xAxis = {
      type: 'category',
      data: colNames,
      splitArea: { show: true },
      axisLabel: { interval: 0, rotate: colNames.length > 8 ? 45 : 0, fontSize: 11 },
    }
    yAxis = {
      type: 'category',
      data: rowNames,
      splitArea: { show: true },
      axisLabel: { fontSize: 11 },
    }
  }

  const series: EChartsOption['series'] = [
    {
      type: 'heatmap',
      xAxisIndex: 0,
      yAxisIndex: 0,
      data,
      label: {
        show: config.showValueLabel ?? false,
        fontSize: 10,
        formatter: (p: any) =>
          isCat ? config.categories[p.data[2]]?.label ?? '' : (p.data[2] ?? ''),
      },
      emphasis: { itemStyle: { borderColor: '#333', borderWidth: 1 } },
      markLine: (markLineData.length || rowMarkLineData.length)
        ? { symbol: 'none', data: [...markLineData, ...rowMarkLineData] as any }
        : undefined,
    }
  ]

  if (hasClustering) {
    series.push(
      {
        name: 'rowTree',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        connectNulls: false,
        data: rowTreeLines as any,
        symbol: 'none',
        lineStyle: { color: '#8c8c8c', width: 1.5 },
        emphasis: { disabled: true },
        silent: true,
      },
      {
        name: 'colTree',
        type: 'line',
        xAxisIndex: 2,
        yAxisIndex: 2,
        connectNulls: false,
        data: colTreeLines as any,
        symbol: 'none',
        lineStyle: { color: '#8c8c8c', width: 1.5 },
        emphasis: { disabled: true },
        silent: true,
      }
    )
  }

  return {
    title: { text: config.title, left: 'center', textStyle: { fontSize: 16 } },
    tooltip: {
      position: 'top',
      formatter: (p: any) => {
        if (p.seriesType !== 'heatmap') return ''
        const [ci, ri, v] = p.data
        const label = isCat ? config.categories[v]?.label ?? '—' : v
        return `${rowNames[ri]} · ${colNames[ci]}<br/><b>${label ?? '无数据'}</b>`
      },
    },
    toolbox: {
      right: 12,
      feature: { saveAsImage: { title: '导出PNG', name: config.title } },
    },
    grid,
    xAxis,
    yAxis,
    visualMap,
    series,
  }
}
