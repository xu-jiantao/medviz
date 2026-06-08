import { useState } from 'react'
import {
  Card, Select, Input, Button, Space, Table, Divider, Typography, InputNumber,
  Row, Col, Statistic, Tag, Collapse, ColorPicker, Segmented, Alert,
} from 'antd'
import { DeleteOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import NomogramChart from '@/charts/Nomogram/NomogramChart'
import type { NomogramConfig, NomogramVariable } from '@/charts/Nomogram/types'
import { nomogramSamples } from '@/charts/Nomogram/samples'
import { variablePoints, totalPoints, outcomeProbability } from '@/charts/Nomogram/calc'
import { useNomogramStore } from '@/store/nomogramStore'

const { Text, Title } = Typography
const uid = () => Math.random().toString(36).slice(2, 9)

export default function NomogramPage() {
  const { config, selection, setConfig, patch, mutate, setSel, resetSel } = useNomogramStore()
  const [sampleKey, setSampleKey] = useState('非小细胞肺癌术后生存')

  const loadSample = (key: string) => {
    setSampleKey(key)
    setConfig(JSON.parse(JSON.stringify(nomogramSamples[key])))
  }

  const total = totalPoints(config, selection)

  return (
    <Row gutter={16}>
      <Col flex="auto">
        <div className="medviz-chart-card">
          <Title level={5} style={{ textAlign: 'center', marginTop: 0 }}>{config.title}</Title>
          <NomogramChart config={config} selection={selection} showReading />
        </div>
        <Alert
          style={{ marginTop: 12 }}
          type="info" showIcon
          message="读法：每个变量的取值向上对到「分值」轴 → 各分值相加 = 总分 → 总分向下对到结局轴得到概率。右侧选择各变量即可自动读数。"
        />
      </Col>

      <Col flex="360px">
        <Card size="small" title="床旁计算" styles={{ body: { maxHeight: '82vh', overflow: 'auto' } }}
          extra={<Button size="small" icon={<ReloadOutlined />} onClick={resetSel}>清空</Button>}>
          <Text type="secondary">临床示例</Text>
          <Select
            style={{ width: '100%', marginTop: 6 }}
            value={sampleKey}
            options={Object.keys(nomogramSamples).map((k) => ({ label: k, value: k }))}
            onChange={loadSample}
          />

          <Divider style={{ margin: '12px 0' }} orientation="left">输入变量</Divider>
          <Space direction="vertical" style={{ width: '100%' }} size={10}>
            {config.variables.map((v) => (
              <div key={v.id}>
                <Text style={{ fontSize: 13 }}>
                  {v.name}
                  <Tag style={{ marginLeft: 6 }} color="blue">
                    {variablePoints(v, selection[v.id]).toFixed(0)} 分
                  </Tag>
                </Text>
                {v.type === 'categorical' ? (
                  <Select
                    style={{ width: '100%', marginTop: 2 }} placeholder="选择"
                    value={selection[v.id]}
                    options={(v.levels ?? []).map((l, i) => ({ label: `${l.label} (${l.points}分)`, value: i }))}
                    onChange={(val) => setSel(v.id, val)}
                  />
                ) : (
                  <InputNumber
                    style={{ width: '100%', marginTop: 2 }} placeholder="输入数值"
                    suffix={v.unit}
                    value={selection[v.id]}
                    onChange={(val) => setSel(v.id, val)}
                  />
                )}
              </div>
            ))}
          </Space>

          <Divider style={{ margin: '14px 0' }} />
          <Statistic title="总分 Total Points" value={total.toFixed(0)} />
          <div style={{ marginTop: 10 }}>
            {config.outcomes.map((o) => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <Text>{o.name}</Text>
                <Text strong style={{ color: o.color, fontSize: 16 }}>
                  {(outcomeProbability(o, total) * 100).toFixed(0)}%
                </Text>
              </div>
            ))}
          </div>
        </Card>

        <ModelEditor config={config} patch={patch} mutate={mutate} />
      </Col>
    </Row>
  )
}

// ---------- 模型编辑器 ----------
function ModelEditor({
  config, patch, mutate,
}: {
  config: NomogramConfig
  patch: (p: Partial<NomogramConfig>) => void
  mutate: (fn: (c: NomogramConfig) => NomogramConfig) => void
}) {
  return (
    <Card size="small" title="编辑模型" style={{ marginTop: 16 }}
      styles={{ body: { maxHeight: '70vh', overflow: 'auto' } }}>
      <Space style={{ width: '100%' }} direction="vertical" size={8}>
        <div>
          <Text>标题</Text>
          <Input value={config.title} onChange={(e) => patch({ title: e.target.value })} />
        </div>
        <div>
          <Text>分值轴上限</Text>
          <InputNumber style={{ width: '100%' }} min={10} value={config.pointsMax}
            onChange={(v) => patch({ pointsMax: v ?? 100 })} />
        </div>
      </Space>

      <Divider style={{ margin: '12px 0' }} orientation="left">变量</Divider>
      <Collapse size="small" accordion items={config.variables.map((v) => ({
        key: v.id,
        label: v.name,
        children: <VariableEditor v={v} mutate={mutate} />,
      }))} />
      <Button size="small" icon={<PlusOutlined />} block style={{ marginTop: 8 }}
        onClick={() => mutate((c) => ({
          ...c,
          variables: [...c.variables, {
            id: uid(), name: '新变量', type: 'categorical',
            levels: [{ label: '档位1', points: 0 }],
          }],
        }))}>
        添加变量
      </Button>

      <Divider style={{ margin: '12px 0' }} orientation="left">结局</Divider>
      <Collapse size="small" accordion items={config.outcomes.map((o) => ({
        key: o.id,
        label: o.name,
        children: <OutcomeEditor outcomeId={o.id} config={config} mutate={mutate} />,
      }))} />
      <Button size="small" icon={<PlusOutlined />} block style={{ marginTop: 8 }}
        onClick={() => mutate((c) => ({
          ...c,
          outcomes: [...c.outcomes, {
            id: uid(), name: '新结局', color: '#722ed1',
            anchors: [{ prob: 0.5, totalPoints: 50 }],
          }],
        }))}>
        添加结局
      </Button>
    </Card>
  )
}

function VariableEditor({ v, mutate }: { v: NomogramVariable; mutate: (fn: (c: NomogramConfig) => NomogramConfig) => void }) {
  const setVar = (patch: Partial<NomogramVariable>) =>
    mutate((c) => ({ ...c, variables: c.variables.map((x) => (x.id === v.id ? { ...x, ...patch } : x)) }))

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={8}>
      <Input size="small" value={v.name} onChange={(e) => setVar({ name: e.target.value })} addonBefore="名称" />
      <Segmented size="small" value={v.type}
        options={[{ label: '分类', value: 'categorical' }, { label: '连续', value: 'continuous' }]}
        onChange={(t) => setVar(t === 'categorical'
          ? { type: 'categorical', levels: v.levels ?? [{ label: '档位1', points: 0 }] }
          : { type: 'continuous', valueAnchors: v.valueAnchors ?? [{ value: 0, points: 0 }, { value: 100, points: 30 }] })} />

      {v.type === 'categorical' ? (
        <Table size="small" rowKey={(_, i) => String(i)} pagination={false}
          dataSource={v.levels ?? []}
          columns={[
            {
              title: '档位', render: (_, _r, i) => (
                <Input size="small" value={(v.levels ?? [])[i].label}
                  onChange={(e) => setVar({ levels: (v.levels ?? []).map((l, j) => j === i ? { ...l, label: e.target.value } : l) })} />
              ),
            },
            {
              title: '分值', width: 70, render: (_, _r, i) => (
                <InputNumber size="small" style={{ width: '100%' }} value={(v.levels ?? [])[i].points}
                  onChange={(val) => setVar({ levels: (v.levels ?? []).map((l, j) => j === i ? { ...l, points: val ?? 0 } : l) })} />
              ),
            },
            {
              title: '', width: 32, render: (_, _r, i) => (
                <DeleteOutlined style={{ color: '#cf1322' }}
                  onClick={() => setVar({ levels: (v.levels ?? []).filter((_, j) => j !== i) })} />
              ),
            },
          ]} />
      ) : (
        <>
          <Input size="small" addonBefore="单位" value={v.unit} onChange={(e) => setVar({ unit: e.target.value })} />
          <Table size="small" rowKey={(_, i) => String(i)} pagination={false}
            dataSource={v.valueAnchors ?? []}
            columns={[
              {
                title: '数值', render: (_, _r, i) => (
                  <InputNumber size="small" style={{ width: '100%' }} value={(v.valueAnchors ?? [])[i].value}
                    onChange={(val) => setVar({ valueAnchors: (v.valueAnchors ?? []).map((a, j) => j === i ? { ...a, value: val ?? 0 } : a) })} />
                ),
              },
              {
                title: '分值', width: 70, render: (_, _r, i) => (
                  <InputNumber size="small" style={{ width: '100%' }} value={(v.valueAnchors ?? [])[i].points}
                    onChange={(val) => setVar({ valueAnchors: (v.valueAnchors ?? []).map((a, j) => j === i ? { ...a, points: val ?? 0 } : a) })} />
                ),
              },
              {
                title: '', width: 32, render: (_, _r, i) => (
                  <DeleteOutlined style={{ color: '#cf1322' }}
                    onClick={() => setVar({ valueAnchors: (v.valueAnchors ?? []).filter((_, j) => j !== i) })} />
                ),
              },
            ]} />
        </>
      )}

      <Space>
        <Button size="small" icon={<PlusOutlined />}
          onClick={() => v.type === 'categorical'
            ? setVar({ levels: [...(v.levels ?? []), { label: '新档位', points: 0 }] })
            : setVar({ valueAnchors: [...(v.valueAnchors ?? []), { value: 0, points: 0 }] })}>
          添加{v.type === 'categorical' ? '档位' : '锚点'}
        </Button>
        <Button size="small" danger
          onClick={() => mutate((c) => ({ ...c, variables: c.variables.filter((x) => x.id !== v.id) }))}>
          删除变量
        </Button>
      </Space>
    </Space>
  )
}

function OutcomeEditor({
  outcomeId, config, mutate,
}: {
  outcomeId: string
  config: NomogramConfig
  mutate: (fn: (c: NomogramConfig) => NomogramConfig) => void
}) {
  const o = config.outcomes.find((x) => x.id === outcomeId)!
  const setOut = (patch: Partial<typeof o>) =>
    mutate((c) => ({ ...c, outcomes: c.outcomes.map((x) => (x.id === outcomeId ? { ...x, ...patch } : x)) }))

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={8}>
      <Space.Compact style={{ width: '100%' }}>
        <ColorPicker value={o.color} onChange={(c) => setOut({ color: c.toHexString() })} />
        <Input size="small" value={o.name} onChange={(e) => setOut({ name: e.target.value })} />
      </Space.Compact>
      <Table size="small" rowKey={(_, i) => String(i)} pagination={false}
        dataSource={o.anchors}
        columns={[
          {
            title: '概率%', render: (_, _r, i) => (
              <InputNumber size="small" style={{ width: '100%' }} min={0} max={100}
                value={Math.round(o.anchors[i].prob * 100)}
                onChange={(val) => setOut({ anchors: o.anchors.map((a, j) => j === i ? { ...a, prob: (val ?? 0) / 100 } : a) })} />
            ),
          },
          {
            title: '总分', width: 70, render: (_, _r, i) => (
              <InputNumber size="small" style={{ width: '100%' }} value={o.anchors[i].totalPoints}
                onChange={(val) => setOut({ anchors: o.anchors.map((a, j) => j === i ? { ...a, totalPoints: val ?? 0 } : a) })} />
            ),
          },
          {
            title: '', width: 32, render: (_, _r, i) => (
              <DeleteOutlined style={{ color: '#cf1322' }}
                onClick={() => setOut({ anchors: o.anchors.filter((_, j) => j !== i) })} />
            ),
          },
        ]} />
      <Space>
        <Button size="small" icon={<PlusOutlined />}
          onClick={() => setOut({ anchors: [...o.anchors, { prob: 0.5, totalPoints: 50 }] })}>
          添加锚点
        </Button>
        <Button size="small" danger
          onClick={() => mutate((c) => ({ ...c, outcomes: c.outcomes.filter((x) => x.id !== outcomeId) }))}>
          删除结局
        </Button>
      </Space>
    </Space>
  )
}
