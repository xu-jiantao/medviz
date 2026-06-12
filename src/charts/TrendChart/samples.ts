import type { TrendChartConfig } from './types'

// 内置临床示例，对应需求文档里的场景，可一键加载体验

/** 示例1：高血压患者3年血压控制趋势（单指标纵向 + 用药节点 + 目标区间） */
export const bpTrend: TrendChartConfig = {
  title: '高血压患者3年血压控制趋势',
  xAxisName: '随访时间',
  xAxisType: 'category',
  yAxes: [{ id: 'y', name: '血压 (mmHg)', min: 0, max: 50 }],
  series: [
    {
      id: 'sbp',
      name: '收缩压',
      unit: 'mmHg',
      color: '#d4380d',
      data: [
        { x: '基线', y: 168 },
        { x: '3月', y: 158 },
        { x: '6月', y: 142 },
        { x: '9月', y: 150 },
        { x: '12月', y: 138 },
        { x: '18月', y: 134 },
        { x: '24月', y: 130 },
        { x: '36月', y: 128 },
      ],
    },
    {
      id: 'dbp',
      name: '舒张压',
      unit: 'mmHg',
      color: '#1677ff',
      data: [
        { x: '基线', y: 102 },
        { x: '3月', y: 96 },
        { x: '6月', y: 88 },
        { x: '9月', y: 92 },
        { x: '12月', y: 85 },
        { x: '18月', y: 82 },
        { x: '24月', y: 80 },
        { x: '36月', y: 78 },
      ],
    },
  ],
  referenceLines: [
    { id: 'sbp-goal', label: '收缩压目标 140', value: 140, color: '#fa8c16', lineStyle: 'dashed' },
  ],
  referenceBands: [
    { id: 'normal', label: '理想血压区', from: 70, to: 130, color: 'rgba(82,196,26,0.10)' },
  ],
  eventMarkers: [
    { id: 'e1', x: '6月', label: '加用钙拮抗剂' },
    { id: 'e2', x: '9月', label: '药效逃逸?' },
    { id: 'e3', x: '12月', label: '换用ARB' },
  ],
  smooth: true,
}

/** 示例2：心脏术后每日 BNP 变化（参考线 = 心衰阈值 400） */
export const bnpTrend: TrendChartConfig = {
  title: '心脏术后每日 BNP 变化',
  xAxisName: '术后天数',
  xAxisType: 'category',
  yAxes: [{ id: 'y', name: 'BNP (pg/mL)', min: 0, max: 900 }],
  series: [
    {
      id: 'bnp',
      name: 'BNP',
      unit: 'pg/mL',
      color: '#722ed1',
      data: [
        { x: 'POD0', y: 120 },
        { x: 'POD1', y: 280 },
        { x: 'POD2', y: 350 },
        { x: 'POD3', y: 620 },
        { x: 'POD4', y: 540 },
        { x: 'POD5', y: 410 },
        { x: 'POD6', y: 300 },
        { x: 'POD7', y: 220 },
      ],
    },
  ],
  referenceLines: [
    { id: 'hf', label: '心衰阈值 400', value: 400, color: '#cf1322', lineStyle: 'dashed' },
  ],
  referenceBands: [],
  eventMarkers: [{ id: 'e1', x: 'POD3', label: 'BNP反跳↑容量负荷过重?' }],
  smooth: true,
}

/** 示例3：脓毒症多指标联合趋势（多指标叠加 + 归一化） */
export const sepsisTrend: TrendChartConfig = {
  title: '脓毒症患者 WBC / PCT / CRP / 乳酸 联合趋势',
  xAxisName: '住院天数',
  xAxisType: 'category',
  yAxes: [{ id: 'y', name: '归一化数值 (0~1)', min: 0, max: 1 }],
  series: [
    {
      id: 'wbc', name: 'WBC', unit: '10⁹/L', color: '#1677ff', normalize: true,
      data: [{ x: 'D1', y: 18 }, { x: 'D2', y: 16 }, { x: 'D3', y: 13 }, { x: 'D4', y: 11 }, { x: 'D5', y: 9 }],
    },
    {
      id: 'pct', name: 'PCT', unit: 'ng/mL', color: '#cf1322', normalize: true,
      data: [{ x: 'D1', y: 4 }, { x: 'D2', y: 6 }, { x: 'D3', y: 8 }, { x: 'D4', y: 9 }, { x: 'D5', y: 11 }],
    },
    {
      id: 'crp', name: 'CRP', unit: 'mg/L', color: '#fa8c16', normalize: true,
      data: [{ x: 'D1', y: 120 }, { x: 'D2', y: 150 }, { x: 'D3', y: 110 }, { x: 'D4', y: 90 }, { x: 'D5', y: 70 }],
    },
    {
      id: 'lac', name: '乳酸', unit: 'mmol/L', color: '#52c41a', normalize: true,
      data: [{ x: 'D1', y: 3.2 }, { x: 'D2', y: 2.8 }, { x: 'D3', y: 2.1 }, { x: 'D4', y: 1.6 }, { x: 'D5', y: 1.2 }],
    },
  ],
  referenceLines: [],
  referenceBands: [],
  eventMarkers: [{ id: 'e1', x: 'D3', label: 'WBC↓但PCT↑ 警惕真菌/非细菌感染' }],
  smooth: true,
}

export const trendSamples: Record<string, TrendChartConfig> = {
  '高血压3年血压趋势': bpTrend,
  '心脏术后BNP': bnpTrend,
  '脓毒症多指标(归一化)': sepsisTrend,
}
