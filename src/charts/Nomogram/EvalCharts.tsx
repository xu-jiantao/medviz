import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { Row, Col, Empty } from 'antd'
import type { EvalData } from '@/data/fitClient'

function rocOption(data: EvalData): EChartsOption {
  return {
    title: { text: `ROC 曲线 (AUC = ${data.auc.toFixed(3)})`, left: 'center', textStyle: { fontSize: 13 } },
    grid: { top: 40, left: 48, right: 20, bottom: 40 },
    xAxis: { type: 'value', name: '假阳性率 (1-特异度)', min: 0, max: 1, nameLocation: 'middle', nameGap: 24 },
    yAxis: { type: 'value', name: '真阳性率 (灵敏度)', min: 0, max: 1 },
    series: [
      {
        type: 'line', smooth: false, showSymbol: false,
        data: data.roc.map((p) => [p.fpr, p.tpr]),
        lineStyle: { color: '#cf1322', width: 2 },
        areaStyle: { color: 'rgba(207,19,34,0.08)' },
      },
      {
        type: 'line', showSymbol: false, silent: true,
        data: [[0, 0], [1, 1]],
        lineStyle: { color: '#bfbfbf', type: 'dashed' },
      },
    ],
  }
}

function calibrationOption(data: EvalData): EChartsOption {
  return {
    title: { text: '校准曲线', left: 'center', textStyle: { fontSize: 13 } },
    grid: { top: 40, left: 48, right: 20, bottom: 40 },
    tooltip: {
      trigger: 'item',
      formatter: (p: any) =>
        `预测 ${(p.data[0] * 100).toFixed(0)}% · 实测 ${(p.data[1] * 100).toFixed(0)}% (n=${p.data[2]})`,
    },
    xAxis: { type: 'value', name: '预测概率', min: 0, max: 1, nameLocation: 'middle', nameGap: 24 },
    yAxis: { type: 'value', name: '实测概率', min: 0, max: 1 },
    series: [
      {
        type: 'line', smooth: true, symbolSize: 7,
        data: data.calibration.map((c) => [c.predicted, c.observed, c.n]),
        lineStyle: { color: '#1677ff', width: 2 },
        itemStyle: { color: '#1677ff' },
      },
      {
        type: 'line', showSymbol: false, silent: true,
        data: [[0, 0], [1, 1]],
        lineStyle: { color: '#bfbfbf', type: 'dashed' },
      },
    ],
  }
}

export default function EvalCharts({ data }: { data?: EvalData }) {
  if (!data) return <Empty description="拟合 Logistic 模型后显示 ROC / 校准曲线" />
  return (
    <Row gutter={16}>
      <Col span={12}>
        <ReactECharts option={rocOption(data)} style={{ height: 300 }} notMerge />
      </Col>
      <Col span={12}>
        <ReactECharts option={calibrationOption(data)} style={{ height: 300 }} notMerge />
      </Col>
    </Row>
  )
}
