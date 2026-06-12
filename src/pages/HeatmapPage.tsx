import { useState } from 'react'
import {
  Card, Select, Switch, Input, Button, Space, Table, Upload, App as AntApp, Divider,
  Typography, InputNumber, Row, Col, ColorPicker, Segmented,
} from 'antd'
import { DeleteOutlined, PlusOutlined, UploadOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import Heatmap from '@/charts/Heatmap/Heatmap'
import type { HeatAxisItem } from '@/charts/Heatmap/types'
import { COLOR_PRESETS } from '@/charts/Heatmap/types'
import { useHeatmapStore } from '@/store/heatmapStore'
import { useNavStore } from '@/store/navStore'
import ClinicalCard from '@/components/ClinicalCard'
import { importHeatmapExcel } from '@/data/importExcel'
import { downloadCurrentTemplate, exportCurrentChartExcel } from '@/export/exportChartExcel'
import { heatmapSamples } from '@/charts/Heatmap/samples'

const { Text } = Typography
const uid = () => Math.random().toString(36).slice(2, 9)

export default function HeatmapPage() {
  const s = useHeatmapStore()
  const { message } = AntApp.useApp()
  const { config } = s
  const sample = useNavStore((st) => st.sample)

  const onReset = () => {
    const defaults = heatmapSamples[sample]
    if (defaults) {
      s.setConfig(JSON.parse(JSON.stringify(defaults)))
      message.success('已还原为该场景默认数据')
    }
  }

  const uploadProps: UploadProps = {
    accept: '.xlsx,.xls,.csv',
    showUploadList: false,
    beforeUpload: async (file) => {
      try {
        const { rows, cols, cells } = await importHeatmapExcel(file as File)
        s.patch({ rows, cols, cells, colMarkers: [], rowMarkers: [] })
        message.success(`已导入 ${rows.length} 行 × ${cols.length} 列并已重置标记线`)
      } catch (e) {
        message.error((e as Error).message)
      }
      return false
    },
  }

  const isCat = config.mode === 'categorical'

  const matrixCols: ColumnsType<HeatAxisItem> = [
    {
      title: '行 \\ 列', dataIndex: 'name', fixed: 'left', width: 130,
      render: (_, row) => (
        <Input size="small" value={row.name} onChange={(e) => s.renameRow(row.id, e.target.value)} />
      ),
    },
    ...config.cols.map((col) => ({
      key: col.id,
      width: 110,
      title: (
        <Space.Compact size="small" style={{ width: '100%' }}>
          <Input
            size="small" value={col.name}
            onChange={(e) => s.renameCol(col.id, e.target.value)}
          />
          <Button size="small" icon={<DeleteOutlined />} onClick={() => s.removeCol(col.id)} />
        </Space.Compact>
      ),
      render: (_: unknown, row: HeatAxisItem) => {
        const val = config.cells[row.id]?.[col.id]
        return isCat ? (
          <Select
            size="small" allowClear style={{ width: '100%' }}
            value={val == null ? undefined : String(val)}
            options={config.categories.map((c) => ({ label: c.label, value: c.key }))}
            onChange={(v) => s.setCell(row.id, col.id, v ?? null)}
          />
        ) : (
          <InputNumber
            size="small" style={{ width: '100%' }}
            value={typeof val === 'number' ? val : undefined}
            onChange={(v) => s.setCell(row.id, col.id, v ?? null)}
          />
        )
      },
    })),
    {
      title: '', width: 40, fixed: 'right',
      render: (_, row) => (
        <DeleteOutlined style={{ color: '#cf1322' }} onClick={() => s.removeRow(row.id)} />
      ),
    },
  ]

  return (
    <Row gutter={16}>
      <Col flex="auto">
        <div className="medviz-chart-card">
          <Heatmap config={config} onExportExcel={() => exportCurrentChartExcel('heatmap')} />
        </div>
        <Card size="small" title="数据矩阵（行 × 列）" style={{ marginTop: 16 }}>
          <Table
            rowKey="id" size="small" pagination={false}
            scroll={{ x: 'max-content' }}
            columns={matrixCols}
            dataSource={config.rows}
          />
          <Space style={{ marginTop: 10 }}>
            <Button size="small" icon={<PlusOutlined />} onClick={() => s.addRow('新行')}>添加行</Button>
            <Button size="small" icon={<PlusOutlined />} onClick={() => s.addCol('新列')}>添加列</Button>
          </Space>
        </Card>
      </Col>

      <Col flex="320px">
        <ClinicalCard sample={sample} />
        <Card size="small" title="参数微调" styles={{ body: { maxHeight: '68vh', overflow: 'auto' } }}>
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
            <Text type="secondary" style={{ fontSize: 12 }}>首列行名，表头为列名，单元格为数值/分类</Text>
            <Button type="link" size="small" icon={<DownloadOutlined />} style={{ padding: 0 }} onClick={() => downloadCurrentTemplate('heatmap')}>
              下载模板
            </Button>
          </div>

          <Divider style={{ margin: '12px 0' }} />
          <div>
            <Text>标题</Text>
            <Input value={config.title} onChange={(e) => s.patch({ title: e.target.value })} />
          </div>
          <div style={{ marginTop: 10 }}>
            <Text>着色模式</Text>
            <br />
            <Segmented
              size="small" style={{ marginTop: 4 }}
              value={config.mode}
              onChange={(v) => s.patch({ mode: v as 'continuous' | 'categorical' })}
              options={[{ label: '连续数值', value: 'continuous' }, { label: '分类色块', value: 'categorical' }]}
            />
          </div>
          <Space style={{ marginTop: 10 }} size={16}>
            <Space size={4}>
              <Switch size="small" checked={config.showValueLabel} onChange={(v) => s.patch({ showValueLabel: v })} />
              <Text>显示数值标签</Text>
            </Space>
            <Space size={4}>
              <Switch size="small" checked={config.showClustering} onChange={(v) => s.patch({ showClustering: v })} />
              <Text>开启聚类分析</Text>
            </Space>
          </Space>

          {!isCat && (
            <>
              <Divider style={{ margin: '12px 0' }} orientation="left">连续配色</Divider>
              <Select
                style={{ width: '100%' }}
                value={Object.keys(COLOR_PRESETS).find(
                  (k) => COLOR_PRESETS[k].join() === config.colorRange.colors.join(),
                )}
                placeholder="选择配色方案"
                options={Object.keys(COLOR_PRESETS).map((k) => ({ label: k, value: k }))}
                onChange={(k) => s.patch({ colorRange: { ...config.colorRange, colors: COLOR_PRESETS[k] } })}
              />
              <Space style={{ marginTop: 8 }}>
                <Text>范围</Text>
                <InputNumber
                  size="small" placeholder="min" style={{ width: 80 }}
                  value={config.colorRange.min}
                  onChange={(v) => s.patch({ colorRange: { ...config.colorRange, min: v ?? undefined } })}
                />
                <InputNumber
                  size="small" placeholder="max" style={{ width: 80 }}
                  value={config.colorRange.max}
                  onChange={(v) => s.patch({ colorRange: { ...config.colorRange, max: v ?? undefined } })}
                />
              </Space>
            </>
          )}

          {isCat && (
            <>
              <Divider style={{ margin: '12px 0' }} orientation="left">分类与颜色</Divider>
              <Space direction="vertical" style={{ width: '100%' }} size={6}>
                {config.categories.map((c) => (
                  <Space.Compact key={c.key} style={{ width: '100%' }}>
                    <ColorPicker
                      size="small" value={c.color}
                      onChange={(col) => s.updateCategory(c.key, { color: col.toHexString() })}
                    />
                    <Input
                      size="small" value={c.label}
                      onChange={(e) => s.updateCategory(c.key, { label: e.target.value })}
                    />
                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => s.removeCategory(c.key)} />
                  </Space.Compact>
                ))}
                <Button
                  size="small" icon={<PlusOutlined />} block
                  onClick={() => s.addCategory({ key: uid(), label: '新类别', color: '#722ed1' })}
                >
                  添加类别
                </Button>
              </Space>
            </>
          )}

          <Divider style={{ margin: '12px 0' }} orientation="left">列标记线</Divider>
          <Space direction="vertical" style={{ width: '100%' }} size={6}>
            {config.colMarkers.map((m) => (
              <Space.Compact key={m.id} style={{ width: '100%' }}>
                <Input size="small" disabled value={config.cols.find((c) => c.id === m.colId)?.name} style={{ width: 90 }} />
                <Input size="small" value={m.label} disabled />
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => s.removeColMarker(m.id)} />
              </Space.Compact>
            ))}
            <MarkerAdder
              items={config.cols}
              placeholder="列"
              onAdd={(colId, label) => s.addColMarker({ id: uid(), colId, label, color: '#000' })}
            />
          </Space>

          <Divider style={{ margin: '12px 0' }} orientation="left">行标记线</Divider>
          <Space direction="vertical" style={{ width: '100%' }} size={6}>
            {(config.rowMarkers ?? []).map((m) => (
              <Space.Compact key={m.id} style={{ width: '100%' }}>
                <Input size="small" disabled value={config.rows.find((r) => r.id === m.rowId)?.name} style={{ width: 90 }} />
                <Input size="small" value={m.label} disabled />
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => s.removeRowMarker(m.id)} />
              </Space.Compact>
            ))}
            <MarkerAdder
              items={config.rows}
              placeholder="行"
              onAdd={(rowId, label) => s.addRowMarker({ id: uid(), rowId, label, color: '#000' })}
            />
          </Space>
        </Card>
      </Col>
    </Row>
  )
}

function MarkerAdder({
  items, placeholder, onAdd,
}: {
  items: HeatAxisItem[]
  placeholder: string
  onAdd: (id: string, label: string) => void
}) {
  const [itemId, setItemId] = useState<string>()
  const [label, setLabel] = useState('')
  return (
    <Space.Compact style={{ width: '100%' }}>
      <Select
        size="small" placeholder={placeholder} style={{ width: 90 }}
        value={itemId}
        options={items.map((c) => ({ label: c.name, value: c.id }))}
        onChange={setItemId}
      />
      <Input size="small" placeholder="标签" value={label} onChange={(e) => setLabel(e.target.value)} />
      <Button
        size="small" icon={<PlusOutlined />}
        onClick={() => {
          if (itemId && label) {
            onAdd(itemId, label)
            setItemId(undefined)
            setLabel('')
          }
        }}
      />
    </Space.Compact>
  )
}
