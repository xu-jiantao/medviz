import type { EChartsOption } from 'echarts'
import type { TrendChartConfig, TrendSeries } from './types'

/** 把一条 series 的 y 值按需归一化到 0~1 */
function seriesValues(s: TrendSeries): Array<number | null> {
  const ys = s.data.map((d) => d.y)
  if (!s.normalize) return ys
  const nums = ys.filter((v): v is number => v != null)
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  const span = max - min || 1
  return ys.map((v) => (v == null ? null : (v - min) / span))
}

/** 收集横轴类目（取所有 series 的并集，保持首次出现顺序） */
function collectCategories(config: TrendChartConfig): Array<string | number> {
  const seen = new Set<string | number>()
  const out: Array<string | number> = []
  for (const s of config.series) {
    for (const d of s.data) {
      if (!seen.has(d.x)) {
        seen.add(d.x)
        out.push(d.x)
      }
    }
  }
  return out
}

export function buildTrendOption(config: TrendChartConfig): EChartsOption {
  const categories = collectCategories(config)

  const allYValues = config.series.flatMap((s) => s.data.map((d) => d.y).filter((v): v is number => v != null))
  const dataMin = allYValues.length > 0 ? Math.min(...allYValues) : null
  const dataMax = allYValues.length > 0 ? Math.max(...allYValues) : null

  const yAxis = config.yAxes.map((y, i) => {
    let finalMin = y.min
    let finalMax = y.max

    if (finalMin != null && dataMin != null && dataMin < finalMin) {
      finalMin = undefined
    }
    if (finalMax != null && dataMax != null && dataMax > finalMax) {
      finalMax = undefined
    }

    return {
      type: 'value' as const,
      name: y.name,
      min: finalMin,
      max: finalMax,
      scale: true,
      position: y.position ?? (i === 0 ? 'left' : 'right'),
      nameTextStyle: { fontSize: 11 },
      splitLine: { show: i === 0 },
    }
  })

  const series: NonNullable<EChartsOption['series']> = config.series.map((s) => {
    const vals = seriesValues(s)
    return {
      name: s.name,
      type: 'line' as const,
      yAxisIndex: s.yAxisIndex ?? 0,
      smooth: config.smooth ?? false,
      connectNulls: true,
      showSymbol: true,
      symbolSize: 6,
      itemStyle: { color: s.color },
      lineStyle: { color: s.color, width: 2 },
      data: categories.map((c) => {
        const idx = s.data.findIndex((d) => d.x === c)
        if (idx >= 0) {
          return {
            value: vals[idx] ?? null,
            rawValue: s.data[idx].y ?? null,
            unit: s.unit || '',
          }
        }
        return null
      }),
    }
  })

  // 参考线 + 事件标注线 都挂到第一条 series 的 markLine 上
  const markLineData: any[] = []
  for (const r of config.referenceLines) {
    markLineData.push({
      yAxis: r.value,
      label: { formatter: r.label, position: 'insideEndTop', fontSize: 10 },
      lineStyle: {
        color: r.color ?? '#cf1322',
        type: r.lineStyle ?? 'dashed',
      },
    })
  }
  for (const e of config.eventMarkers) {
    markLineData.push({
      xAxis: e.x,
      label: { formatter: e.label, fontSize: 10, color: e.color ?? '#595959', rotate: 0 },
      lineStyle: { color: e.color ?? '#8c8c8c', type: 'dotted' },
    })
  }

  // 参考区间 -> markArea（水平阴影带）
  const markAreaData = config.referenceBands.map((b) => [
    { yAxis: b.from, itemStyle: { color: b.color ?? 'rgba(82,196,26,0.10)' }, name: b.label },
    { yAxis: b.to },
  ])

  if (series.length > 0) {
    ;(series[0] as any).markLine = {
      symbol: 'none',
      data: markLineData,
    }
    ;(series[0] as any).markArea = {
      silent: true,
      data: markAreaData,
    }
  }

  return {
    title: { text: config.title, left: 'center', textStyle: { fontSize: 16 } },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let html = `${params[0].name}<br/>`
        params.forEach((p: any) => {
          if (p.value == null) return
          const item = p.data
          const rawVal = item && typeof item === 'object' && 'rawValue' in item ? item.rawValue : p.value
          const unit = item && typeof item === 'object' && 'unit' in item ? item.unit : ''
          const unitStr = unit ? ` ${unit}` : ''
          html += `${p.marker}${p.seriesName}: <b>${rawVal}</b>${unitStr}<br/>`
        })
        return html
      }
    },
    legend: { top: 28, type: 'scroll' },
    grid: { top: 64, left: 56, right: 56, bottom: 48 },
    toolbox: {
      right: 12,
      feature: {
        saveAsImage: { title: '导出PNG', name: config.title },
        dataZoom: { title: { zoom: '缩放', back: '还原' } },
        restore: { title: '复位' },
      },
    },
    xAxis: {
      type: 'category',
      name: config.xAxisName,
      data: categories as string[],
      boundaryGap: false,
      nameLocation: 'middle',
      nameGap: 28,
    },
    yAxis,
    series,
  }
}
