import { useState } from 'react'
import {
  Card, Switch, Input, Button, Space, Table, Upload, App as AntApp, Divider, Typography, InputNumber, Row, Col,
} from 'antd'
import { DeleteOutlined, PlusOutlined, UploadOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import TrendChart from '@/charts/TrendChart/TrendChart'
import { useTrendStore } from '@/store/trendStore'
import { useNavStore } from '@/store/navStore'
import ClinicalCard from '@/components/ClinicalCard'
import { importTrendExcel } from '@/data/importExcel'
import { downloadCurrentTemplate, exportCurrentChartExcel } from '@/export/exportChartExcel'
import { trendSamples } from '@/charts/TrendChart/samples'

const { Text } = Typography
const uid = () => Math.random().toString(36).slice(2, 9)

export default function TrendPage() {
  const { message } = AntApp.useApp()
  const { config, setConfig, patch, addReferenceLine, removeReferenceLine, addEventMarker, removeEventMarker } =
    useTrendStore()
  const sample = useNavStore((s) => s.sample)

  const onReset = () => {
    const defaults = trendSamples[sample]
    if (defaults) {
      setConfig(JSON.parse(JSON.stringify(defaults)))
      message.success('已还原为该场景默认数据')
    }
  }

  const uploadProps: UploadProps = {
    accept: '.xlsx,.xls,.csv',
    showUploadList: false,
    beforeUpload: async (file) => {
      try {
        const { xAxisName, series } = await importTrendExcel(file as File)
        
        // 判断是否导入了自定义指标以决定是否重置 Y 轴配置实现刻度自适应
        const importedNames = series.map((s) => s.name)
        const defaultNames = (config.series || []).map((s) => s.name)
        const isCustom =
          importedNames.length !== defaultNames.length ||
          importedNames.some((name) => !defaultNames.includes(name))

        let yAxes = config.yAxes
        if (isCustom) {
          const uniqueUnits = Array.from(new Set(series.map((s) => s.unit).filter(Boolean)))
          let yAxisName = '数值'
          if (series.length === 1) {
            const s = series[0]
            yAxisName = s.unit ? `${s.name} (${s.unit})` : s.name
          } else if (uniqueUnits.length === 1) {
            const names = series.map((s) => s.name).join('/')
            yAxisName = `${names} (${uniqueUnits[0]})`
          } else if (uniqueUnits.length > 1) {
            yAxisName = `数值 (${uniqueUnits.join('/')})`
          } else {
            yAxisName = series.map((s) => s.name).join('/')
          }
          yAxes = [{ id: 'y', name: yAxisName }] // min 和 max 不指定（即为 undefined），以启用 ECharts 自适应刻度
        }

        patch({
          xAxisName,
          series,
          yAxes,
          eventMarkers: [],
          referenceLines: [],
          referenceBands: [],
        })
        message.success(`已导入 ${series.length} 个指标`)
      } catch (e) {
        message.error((e as Error).message)
      }
      return false // 阻止真实上传
    },
  }

  return (
    <Row gutter={16} wrap={false}>
      <Col flex="auto" style={{ minWidth: 0 }}>
        <div className="medviz-chart-card">
          <TrendChart config={config} onExportExcel={() => exportCurrentChartExcel('trend')} />
        </div>
      </Col>

      <Col flex="360px">
        <ClinicalCard sample={sample} />
        <Card size="small" title="参数微调" styles={{ body: { maxHeight: '64vh', overflow: 'auto' } }}>
          <Row gutter={8} style={{ marginTop: 10 }}>
            <Col span={12}>
              <Upload {...uploadProps} style={{ width: '100%' }}>
                <Button icon={<UploadOutlined />} block>
                  导入 Excel / CSV
                </Button>
              </Upload>
            </Col>
            <Col span={12}>
              <Button icon={<ReloadOutlined />} block onClick={onReset}>
                还原默认数据
              </Button>
            </Col>
          </Row>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>格式：首列时间点，其余每列一个指标</Text>
            <Button type="link" size="small" icon={<DownloadOutlined />} style={{ padding: 0 }} onClick={() => downloadCurrentTemplate('trend')}>
              下载模板
            </Button>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          <Space style={{ width: '100%' }} direction="vertical" size="small">
            <div>
              <Text>标题</Text>
              <Input value={config.title} onChange={(e) => patch({ title: e.target.value })} />
            </div>
            <div>
              <Text>横轴名称</Text>
              <Input value={config.xAxisName} onChange={(e) => patch({ xAxisName: e.target.value })} />
            </div>
            <div>
              <Text>Y轴范围 (当前主要指标)</Text>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <InputNumber
                  placeholder="自动下限"
                  value={config.yAxes[0]?.min}
                  onChange={(val) => {
                    const newYAxes = [...config.yAxes]
                    if (newYAxes[0]) {
                      newYAxes[0] = { ...newYAxes[0], min: val === null ? undefined : val }
                      patch({ yAxes: newYAxes })
                    }
                  }}
                  style={{ width: '100%' }}
                />
                <Text type="secondary">至</Text>
                <InputNumber
                  placeholder="自动上限"
                  value={config.yAxes[0]?.max}
                  onChange={(val) => {
                    const newYAxes = [...config.yAxes]
                    if (newYAxes[0]) {
                      newYAxes[0] = { ...newYAxes[0], max: val === null ? undefined : val }
                      patch({ yAxes: newYAxes })
                    }
                  }}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <Space>
              <Switch checked={config.smooth} onChange={(v) => patch({ smooth: v })} />
              <Text>平滑曲线</Text>
            </Space>
            <Space>
              <Switch
                checked={config.series.length > 0 && config.series.every((s) => s.normalize)}
                onChange={(checked) => {
                  const newSeries = config.series.map(s => ({ ...s, normalize: checked }))
                  
                  let yAxes = [...config.yAxes]
                  if (checked) {
                    yAxes = [{ id: 'y', name: '归一化数值 (0~1)', min: 0, max: 1 }]
                  } else {
                    const uniqueUnits = Array.from(new Set(newSeries.map(s => s.unit).filter(Boolean)))
                    let yAxisName = '数值'
                    if (newSeries.length === 1) {
                      yAxisName = newSeries[0].unit ? `${newSeries[0].name} (${newSeries[0].unit})` : newSeries[0].name
                    } else if (uniqueUnits.length === 1) {
                      const names = newSeries.map(s => s.name).join('/')
                      yAxisName = `${names} (${uniqueUnits[0]})`
                    } else if (uniqueUnits.length > 1) {
                      yAxisName = `数值 (${uniqueUnits.join('/')})`
                    } else {
                      yAxisName = newSeries.map(s => s.name).join('/')
                    }
                    yAxes = [{ id: 'y', name: yAxisName, min: undefined, max: undefined }]
                  }
                  
                  patch({ series: newSeries, yAxes })
                }}
              />
              <Text>一键数值归一化 (0~1)</Text>
            </Space>
          </Space>

          <Divider style={{ margin: '12px 0' }} orientation="left">参考线</Divider>
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={config.referenceLines}
            columns={[
              { title: '标签', dataIndex: 'label' },
              { title: '数值', dataIndex: 'value', width: 70 },
              {
                title: '', width: 36,
                render: (_, r) => (
                  <DeleteOutlined onClick={() => removeReferenceLine(r.id)} style={{ color: '#cf1322' }} />
                ),
              },
            ]}
          />
          <RefLineAdder onAdd={(label, value) => addReferenceLine({ id: uid(), label, value, lineStyle: 'dashed', color: '#cf1322' })} />

          <Divider style={{ margin: '12px 0' }} orientation="left">事件标注</Divider>
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={config.eventMarkers}
            columns={[
              { title: '横轴位置', dataIndex: 'x', width: 80 },
              { title: '标签', dataIndex: 'label' },
              {
                title: '', width: 36,
                render: (_, r) => (
                  <DeleteOutlined onClick={() => removeEventMarker(r.id)} style={{ color: '#cf1322' }} />
                ),
              },
            ]}
          />
          <EventAdder onAdd={(x, label) => addEventMarker({ id: uid(), x, label })} />
        </Card>
      </Col>
    </Row>
  )
}

function RefLineAdder({ onAdd }: { onAdd: (label: string, value: number) => void }) {
  const [label, setLabel] = useState('')
  const [value, setValue] = useState<number | null>(null)
  return (
    <Space.Compact style={{ width: '100%', marginTop: 8 }}>
      <Input placeholder="标签" value={label} onChange={(e) => setLabel(e.target.value)} />
      <InputNumber placeholder="数值" value={value} onChange={(v) => setValue(v)} style={{ width: 90 }} />
      <Button
        icon={<PlusOutlined />}
        onClick={() => {
          if (label && value != null) {
            onAdd(label, value)
            setLabel('')
            setValue(null)
          }
        }}
      />
    </Space.Compact>
  )
}

function EventAdder({ onAdd }: { onAdd: (x: string, label: string) => void }) {
  const [x, setX] = useState('')
  const [label, setLabel] = useState('')
  return (
    <Space.Compact style={{ width: '100%', marginTop: 8 }}>
      <Input placeholder="横轴位置" value={x} onChange={(e) => setX(e.target.value)} style={{ width: 110 }} />
      <Input placeholder="标签" value={label} onChange={(e) => setLabel(e.target.value)} />
      <Button
        icon={<PlusOutlined />}
        onClick={() => {
          if (x && label) {
            onAdd(x, label)
            setX('')
            setLabel('')
          }
        }}
      />
    </Space.Compact>
  )
}
