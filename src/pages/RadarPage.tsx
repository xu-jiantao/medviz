import {
  Card, Switch, Input, Button, Space, Table, Upload, App as AntApp, Divider,
  Typography, InputNumber, Row, Col, ColorPicker, Segmented,
} from 'antd'
import { DeleteOutlined, PlusOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import RadarChart from '@/charts/RadarChart/RadarChart'
import type { RadarDimension } from '@/charts/RadarChart/types'
import { useRadarStore } from '@/store/radarStore'
import { useNavStore } from '@/store/navStore'
import ClinicalCard from '@/components/ClinicalCard'
import { importRadarExcel } from '@/data/importExcel'
import { downloadCurrentTemplate, exportCurrentChartExcel } from '@/export/exportChartExcel'

const { Text } = Typography
const uid = () => Math.random().toString(36).slice(2, 9)
const PALETTE = ['#1677ff', '#cf1322', '#fa8c16', '#52c41a', '#722ed1', '#13c2c2']

export default function RadarPage() {
  const {
    config, patch, addDimension, removeDimension, updateDimension,
    addSeries, removeSeries, updateSeries, setValue,
  } = useRadarStore()
  const { message } = AntApp.useApp()
  const sample = useNavStore((s) => s.sample)

  const uploadProps: UploadProps = {
    accept: '.xlsx,.xls,.csv',
    showUploadList: false,
    beforeUpload: async (file) => {
      try {
        const { dimensions, series } = await importRadarExcel(file as File)
        patch({ dimensions, series })
        message.success(`已导入 ${dimensions.length} 个维度、${series.length} 组数据`)
      } catch (e) {
        message.error((e as Error).message)
      }
      return false
    },
  }

  // 矩阵表：行=维度，列=维度名/满分 + 每组一列 + 删除
  const columns: ColumnsType<RadarDimension> = [
    {
      title: '维度', dataIndex: 'name', fixed: 'left', width: 150,
      render: (_, d) => (
        <Input
          size="small"
          value={d.name}
          onChange={(e) => updateDimension(d.id, { name: e.target.value })}
        />
      ),
    },
    {
      title: '满分', dataIndex: 'max', width: 80,
      render: (_, d) => (
        <InputNumber
          size="small" min={1} style={{ width: '100%' }}
          value={d.max}
          onChange={(v) => updateDimension(d.id, { max: v ?? 1 })}
        />
      ),
    },
    ...config.series.map((s) => ({
      title: s.name,
      key: s.id,
      width: 90,
      render: (_: unknown, d: RadarDimension) => (
        <InputNumber
          size="small" style={{ width: '100%' }}
          value={s.values[d.id] ?? 0}
          onChange={(v) => setValue(s.id, d.id, v ?? 0)}
        />
      ),
    })),
    {
      title: '', width: 40, fixed: 'right',
      render: (_, d) => (
        <DeleteOutlined style={{ color: '#cf1322' }} onClick={() => removeDimension(d.id)} />
      ),
    },
  ]

  return (
    <Row gutter={16}>
      <Col flex="auto">
        <div className="medviz-chart-card">
          <RadarChart config={config} onExportExcel={() => exportCurrentChartExcel('radar')} />
        </div>
        <Card size="small" title="数据矩阵（维度 × 组别）" style={{ marginTop: 16 }}>
          <Table
            rowKey="id" size="small" pagination={false}
            scroll={{ x: 'max-content' }}
            columns={columns}
            dataSource={config.dimensions}
          />
          <Button
            icon={<PlusOutlined />} size="small" style={{ marginTop: 10 }}
            onClick={() => addDimension({ id: uid(), name: `新维度`, max: 5 })}
          >
            添加维度
          </Button>
        </Card>
      </Col>

      <Col flex="320px">
        <ClinicalCard sample={sample} />
        <Card size="small" title="参数微调" styles={{ body: { maxHeight: '68vh', overflow: 'auto' } }}>
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />} block style={{ marginTop: 10 }}>
              导入 Excel / CSV
            </Button>
          </Upload>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>首列维度，「满分」列为量程，其余每列一组</Text>
            <Button type="link" size="small" icon={<DownloadOutlined />} style={{ padding: 0 }} onClick={() => downloadCurrentTemplate('radar')}>
              下载模板
            </Button>
          </div>

          <Divider style={{ margin: '12px 0' }} />
          <div>
            <Text>标题</Text>
            <Input value={config.title} onChange={(e) => patch({ title: e.target.value })} />
          </div>
          <Space style={{ marginTop: 12 }} wrap>
            <Segmented
              size="small"
              value={config.shape}
              onChange={(v) => patch({ shape: v as 'polygon' | 'circle' })}
              options={[{ label: '多边形', value: 'polygon' }, { label: '圆形', value: 'circle' }]}
            />
            <Space size={4}>
              <Switch size="small" checked={config.fill} onChange={(v) => patch({ fill: v })} />
              <Text>填充</Text>
            </Space>
          </Space>

          <Divider style={{ margin: '12px 0' }} orientation="left">数据组（叠加对比）</Divider>
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            {config.series.map((s) => (
              <Space.Compact key={s.id} style={{ width: '100%' }}>
                <ColorPicker
                  size="small"
                  value={s.color}
                  onChange={(c) => updateSeries(s.id, { color: c.toHexString() })}
                />
                <Input
                  size="small"
                  value={s.name}
                  onChange={(e) => updateSeries(s.id, { name: e.target.value })}
                />
                <Button
                  size="small" danger icon={<DeleteOutlined />}
                  disabled={config.series.length <= 1}
                  onClick={() => removeSeries(s.id)}
                />
              </Space.Compact>
            ))}
            <Button
              size="small" icon={<PlusOutlined />} block
              onClick={() =>
                addSeries({
                  id: uid(),
                  name: `组${config.series.length + 1}`,
                  color: PALETTE[config.series.length % PALETTE.length],
                  values: {},
                })
              }
            >
              添加数据组
            </Button>
          </Space>
        </Card>
      </Col>
    </Row>
  )
}
