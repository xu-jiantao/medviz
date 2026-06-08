import type { RadarChartConfig } from './types'

// 内置临床示例，对应需求文档的雷达图场景

/** 示例1：SOFA 评分（6 轴，每轴 0~4 分），单组 */
export const sofa: RadarChartConfig = {
  title: 'SOFA 器官功能评分',
  shape: 'polygon',
  fill: true,
  dimensions: [
    { id: 'resp', name: '呼吸(PaO₂/FiO₂)', max: 4 },
    { id: 'coag', name: '凝血(血小板)', max: 4 },
    { id: 'liver', name: '肝脏(胆红素)', max: 4 },
    { id: 'cardio', name: '循环(血压/血管活性药)', max: 4 },
    { id: 'cns', name: '神经(GCS)', max: 4 },
    { id: 'renal', name: '肾脏(肌酐/尿量)', max: 4 },
  ],
  series: [
    {
      id: 'today',
      name: '今日',
      color: '#cf1322',
      values: { resp: 2, coag: 1, liver: 1, cardio: 4, cns: 2, renal: 4 },
    },
  ],
}

/** 示例2：APACHE II 主要生理项（8 轴） */
export const apache: RadarChartConfig = {
  title: 'APACHE II 生理评分',
  shape: 'polygon',
  fill: true,
  dimensions: [
    { id: 'age', name: '年龄评分', max: 6 },
    { id: 'temp', name: '体温', max: 4 },
    { id: 'map', name: '平均动脉压', max: 4 },
    { id: 'hr', name: '心率', max: 4 },
    { id: 'rr', name: '呼吸频率', max: 4 },
    { id: 'oxy', name: '氧合指数', max: 4 },
    { id: 'ph', name: '动脉血pH', max: 4 },
    { id: 'gcs', name: 'GCS评分', max: 12 },
  ],
  series: [
    {
      id: 'pt',
      name: '入院时',
      color: '#1677ff',
      values: { age: 3, temp: 1, map: 2, hr: 2, rr: 1, oxy: 4, ph: 1, gcs: 9 },
    },
  ],
}

/** 示例3：脑卒中康复 入院 vs 出院（动态对比，两组叠加） */
export const rehab: RadarChartConfig = {
  title: '脑卒中康复 入院 vs 出院',
  shape: 'polygon',
  fill: true,
  dimensions: [
    { id: 'power', name: '肌力', max: 5 },
    { id: 'speech', name: '言语', max: 5 },
    { id: 'swallow', name: '吞咽', max: 5 },
    { id: 'cog', name: '认知', max: 5 },
    { id: 'balance', name: '平衡', max: 5 },
    { id: 'adl', name: '日常生活能力', max: 5 },
  ],
  series: [
    {
      id: 'in',
      name: '入院时',
      color: '#1677ff',
      values: { power: 2, speech: 1, swallow: 1, cog: 3, balance: 2, adl: 2 },
    },
    {
      id: 'out',
      name: '出院时',
      color: '#cf1322',
      values: { power: 4, speech: 2, swallow: 2, cog: 4, balance: 4, adl: 4 },
    },
  ],
}

export const radarSamples: Record<string, RadarChartConfig> = {
  'SOFA器官功能评分': sofa,
  'APACHE II生理评分': apache,
  '脑卒中康复(入院vs出院)': rehab,
}
