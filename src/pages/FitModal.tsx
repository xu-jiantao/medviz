import { useState } from 'react'
import {
  Modal, Input, Upload, Button, Select, Segmented, Space, Typography, Table, Tag,
  App as AntApp, Divider, Alert,
} from 'antd'
import { UploadOutlined, CheckCircleTwoTone, CloseCircleTwoTone } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import type { NomogramConfig } from '@/charts/Nomogram/types'
import { parseRecords } from '@/data/importExcel'
import { fitLogistic, fitCox, checkBackend, type PredictorSpec, type EvalData, type FitMeta } from '@/data/fitClient'

const { Text } = Typography

interface Props {
  open: boolean
  onClose: () => void
  onFitted: (config: NomogramConfig, meta?: FitMeta, evalData?: EvalData) => void
}

type PType = 'continuous' | 'categorical'

export default function FitModal({ open, onClose, onFitted }: Props) {
  const { message } = AntApp.useApp()
  const [baseUrl, setBaseUrl] = useState('http://localhost:8000')
  const [backendOk, setBackendOk] = useState<boolean | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [records, setRecords] = useState<Record<string, unknown>[]>([])
  const [model, setModel] = useState<'logistic' | 'cox'>('logistic')
  const [outcome, setOutcome] = useState<string>()
  const [duration, setDuration] = useState<string>()
  const [event, setEvent] = useState<string>()
  const [predictors, setPredictors] = useState<string[]>([])
  const [types, setTypes] = useState<Record<string, PType>>({})
  const [times, setTimes] = useState('12,36,60')
  const [timeLabels, setTimeLabels] = useState('1年生存率,3年生存率,5年生存率')
  const [loading, setLoading] = useState(false)

  const ping = async () => {
    const ok = await checkBackend(baseUrl)
    setBackendOk(ok)
    message[ok ? 'success' : 'error'](ok ? '后端已连接' : '连不上后端，请确认已启动')
  }

  const uploadProps: UploadProps = {
    accept: '.xlsx,.xls,.csv',
    showUploadList: false,
    beforeUpload: async (file) => {
      try {
        const { columns: cols, records: recs } = await parseRecords(file as File)
        setColumns(cols)
        setRecords(recs)
        // 按首行值猜类型：数字→连续，否则分类
        const guess: Record<string, PType> = {}
        for (const c of cols) {
          const v = recs[0]?.[c]
          guess[c] = typeof v === 'number' || (v != null && !isNaN(Number(v))) ? 'continuous' : 'categorical'
        }
        setTypes(guess)
        message.success(`已读取 ${recs.length} 行、${cols.length} 列`)
      } catch (e) {
        message.error((e as Error).message)
      }
      return false
    },
  }

  const handleFit = async () => {
    if (records.length === 0) return message.warning('请先上传数据')
    if (predictors.length === 0) return message.warning('请至少选择一个预测变量')
    const specs: PredictorSpec[] = predictors.map((name) => ({ name, type: types[name], label: name }))
    setLoading(true)
    try {
      let result
      if (model === 'logistic') {
        if (!outcome) return message.warning('请选择结局列')
        result = await fitLogistic(baseUrl, { data: records, outcome, predictors: specs, title: '自动拟合·Logistic 列线图', outcomeName: '结局概率' })
      } else {
        if (!duration || !event) return message.warning('请选择生存时间列和事件列')
        const t = times.split(',').map((x) => Number(x.trim())).filter((x) => !isNaN(x))
        const labels = timeLabels.split(',').map((x) => x.trim()).filter(Boolean)
        result = await fitCox(baseUrl, { data: records, duration, event, predictors: specs, times: t, timeLabels: labels, title: '自动拟合·Cox 列线图' })
      }
      const { _meta, _eval, ...config } = result
      onFitted(config as NomogramConfig, _meta, _eval)
      message.success('拟合完成，已应用到列线图')
      onClose()
    } catch (e) {
      message.error('拟合失败：' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const colOptions = columns.map((c) => ({ label: c, value: c }))
  // 预测变量候选：排除已选作结局/时间/事件的列
  const usedAsRole = new Set([outcome, duration, event].filter(Boolean) as string[])
  const predictorCandidates = columns.filter((c) => !usedAsRole.has(c))

  return (
    <Modal
      open={open} onCancel={onClose} width={680} title="从原始数据自动拟合列线图"
      okText="拟合并应用" cancelText="取消" confirmLoading={loading} onOk={handleFit}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <Alert type="info" showIcon
          message="需要先启动 Python 后端：cd backend && uvicorn app:app --port 8000"
        />

        <div>
          <Text>后端地址</Text>
          <Space.Compact style={{ width: '100%' }}>
            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
            <Button onClick={ping}>测试连接</Button>
          </Space.Compact>
          {backendOk != null && (
            <Text style={{ marginLeft: 4 }}>
              {backendOk
                ? <><CheckCircleTwoTone twoToneColor="#52c41a" /> 已连接</>
                : <><CloseCircleTwoTone twoToneColor="#cf1322" /> 未连接</>}
            </Text>
          )}
        </div>

        <Upload {...uploadProps}>
          <Button icon={<UploadOutlined />}>上传病例数据 (CSV / Excel)</Button>
        </Upload>
        {columns.length > 0 && <Text type="secondary">已读取 {records.length} 行：{columns.join('、')}</Text>}

        {columns.length > 0 && (
          <>
            <Divider style={{ margin: '4px 0' }} />
            <Segmented
              value={model}
              onChange={(v) => setModel(v as 'logistic' | 'cox')}
              options={[
                { label: 'Logistic（诊断/并发症概率）', value: 'logistic' },
                { label: 'Cox（生存/预后）', value: 'cox' },
              ]}
            />

            {model === 'logistic' ? (
              <div>
                <Text>结局列（0/1）</Text>
                <Select style={{ width: '100%' }} options={colOptions} value={outcome} onChange={setOutcome} placeholder="选择结局变量" />
              </div>
            ) : (
              <Space style={{ width: '100%' }}>
                <div style={{ flex: 1 }}>
                  <Text>生存时间列</Text>
                  <Select style={{ width: 180 }} options={colOptions} value={duration} onChange={setDuration} placeholder="时间" />
                </div>
                <div style={{ flex: 1 }}>
                  <Text>事件列（0/1）</Text>
                  <Select style={{ width: 180 }} options={colOptions} value={event} onChange={setEvent} placeholder="事件" />
                </div>
              </Space>
            )}

            {model === 'cox' && (
              <Space style={{ width: '100%' }} wrap>
                <div>
                  <Text>时间点（逗号分隔）</Text>
                  <Input style={{ width: 200 }} value={times} onChange={(e) => setTimes(e.target.value)} />
                </div>
                <div>
                  <Text>对应标签</Text>
                  <Input style={{ width: 280 }} value={timeLabels} onChange={(e) => setTimeLabels(e.target.value)} />
                </div>
              </Space>
            )}

            <div>
              <Text>预测变量</Text>
              <Select
                mode="multiple" style={{ width: '100%' }} placeholder="选择纳入模型的变量"
                value={predictors}
                options={predictorCandidates.map((c) => ({ label: c, value: c }))}
                onChange={setPredictors}
              />
            </div>

            {predictors.length > 0 && (
              <Table
                size="small" rowKey="name" pagination={false}
                dataSource={predictors.map((name) => ({ name }))}
                columns={[
                  { title: '变量', dataIndex: 'name' },
                  {
                    title: '类型', width: 220,
                    render: (_, r) => (
                      <Segmented
                        size="small"
                        value={types[r.name]}
                        options={[{ label: '连续', value: 'continuous' }, { label: '分类', value: 'categorical' }]}
                        onChange={(v) => setTypes((t) => ({ ...t, [r.name]: v as PType }))}
                      />
                    ),
                  },
                  {
                    title: '示例值', render: (_, r) => <Tag>{String(records[0]?.[r.name] ?? '')}</Tag>,
                  },
                ]}
              />
            )}
          </>
        )}
      </Space>
    </Modal>
  )
}
