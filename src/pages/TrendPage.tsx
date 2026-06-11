import { useState } from 'react'
import {
  Card, Switch, Input, Button, Space, Table, Upload, App as AntApp, Divider, Typography, InputNumber, Row, Col,
} from 'antd'
import { DeleteOutlined, PlusOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import TrendChart from '@/charts/TrendChart/TrendChart'
import { trendSamples } from '@/charts/TrendChart/samples'
import { useTrendStore } from '@/store/trendStore'
import { useNavStore } from '@/store/navStore'
import { useScenarioSample } from '@/hooks/useScenarioSample'
import ClinicalCard from '@/components/ClinicalCard'
import { importTrendExcel } from '@/data/importExcel'
import { downloadTrendTemplate } from '@/data/templates'

const { Text } = Typography
const uid = () => Math.random().toString(36).slice(2, 9)

export default function TrendPage() {
  const { message } = AntApp.useApp()
  const { config, setConfig, patch, addReferenceLine, removeReferenceLine, addEventMarker, removeEventMarker } =
    useTrendStore()
  const sample = useNavStore((s) => s.sample)
  useScenarioSample('trend', (key) => {
    if (trendSamples[key]) setConfig(JSON.parse(JSON.stringify(trendSamples[key])))
  })

  const uploadProps: UploadProps = {
    accept: '.xlsx,.xls,.csv',
    showUploadList: false,
    beforeUpload: async (file) => {
      try {
        const { xAxisName, series } = await importTrendExcel(file as File)
        patch({ xAxisName, series, eventMarkers: [], referenceLines: [], referenceBands: [] })
        message.success(`已导入 ${series.length} 个指标`)
      } catch (e) {
        message.error((e as Error).message)
      }
      return false // 阻止真实上传
    },
  }

  return (
    <Row gutter={16}>
      <Col flex="auto">
        <div className="medviz-chart-card">
          <TrendChart config={config} />
        </div>
      </Col>

      <Col flex="360px">
        <ClinicalCard sample={sample} />
        <Card size="small" title="参数微调" styles={{ body: { maxHeight: '64vh', overflow: 'auto' } }}>
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />} block style={{ marginTop: 10 }}>
              导入 Excel / CSV
            </Button>
          </Upload>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>格式：首列时间点，其余每列一个指标</Text>
            <Button type="link" size="small" icon={<DownloadOutlined />} style={{ padding: 0 }} onClick={downloadTrendTemplate}>
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
            <Space>
              <Switch checked={config.smooth} onChange={(v) => patch({ smooth: v })} />
              <Text>平滑曲线</Text>
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
