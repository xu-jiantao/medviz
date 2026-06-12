import { useState } from 'react'
import {
  Card, Table, Button, Space, Modal, Form, Input, InputNumber, Popconfirm,
  Tag, Typography, Upload, Divider, Row, Col, Alert, App as AntApp, Select,
} from 'antd'
import {
  UserAddOutlined, EditOutlined, DeleteOutlined, CheckOutlined,
  DownloadOutlined, UploadOutlined, FileExcelOutlined, SyncOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { UploadProps } from 'antd'
import { usePatientStore, type Patient, loadPatientData, saveActivePatientConfig } from '@/store/patientStore'
import {
  exportPatientMasterExcel,
  importPatientMasterExcel,
  downloadMasterTemplate,
} from '@/export/patientMasterIO'
import { useNavStore } from '@/store/navStore'

const { Text, Paragraph } = Typography

export default function PatientManagementPage() {
  const { message } = AntApp.useApp()
  const { patients, activePatientId, setActivePatientId, addPatient, removePatient, setPatient } = usePatientStore()
  const currentScenarioKey = useNavStore((st) => st.scenarioKey)

  const handleSyncActive = () => {
    saveActivePatientConfig()
    message.success('已同步拉取并保存当前页面上 13 个图的最新编辑与床旁计算数据！')
  }
  
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [form] = Form.useForm()

  const openAddModal = () => {
    setEditingPatient(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEditModal = (p: Patient) => {
    setEditingPatient(p)
    form.setFieldsValue(p)
    setModalOpen(true)
  }

  const handleSave = () => {
    form.validateFields().then((values) => {
      if (editingPatient) {
        // Edit mode
        setPatient(values)
        message.success('已修改患者信息')
      } else {
        // Add mode
        if (patients.some(x => x.mrn === values.mrn)) {
          message.error('该住院号 (MRN) 已存在，请更换！')
          return
        }
        addPatient(values)
        message.success('已新增患者')
      }
      setModalOpen(false)
    })
  }

  const handleSelectPatient = (mrn: string) => {
    saveActivePatientConfig()
    setActivePatientId(mrn)
    loadPatientData(mrn, currentScenarioKey)
    message.success(`已切换展示患者：${patients.find(x => x.mrn === mrn)?.name}`)
  }

  const uploadProps: UploadProps = {
    accept: '.xlsx,.xls',
    showUploadList: false,
    beforeUpload: async (file) => {
      try {
        const msg = await importPatientMasterExcel(file as File)
        message.success(msg)
      } catch (e) {
        message.error((e as Error).message)
      }
      return false
    },
  }

  const columns: ColumnsType<Patient> = [
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, r) => r.mrn === activePatientId ? (
        <Tag color="success" icon={<CheckOutlined />}>正在展示</Tag>
      ) : (
        <Button size="small" type="dashed" onClick={() => handleSelectPatient(r.mrn)}>展示该病</Button>
      )
    },
    { title: '姓名', dataIndex: 'name', key: 'name', width: 80 },
    { title: '性别', dataIndex: 'gender', key: 'gender', width: 60 },
    { title: '年龄', dataIndex: 'age', key: 'age', width: 65, render: (v) => `${v}岁` },
    { title: '科室/床号', dataIndex: 'bed', key: 'bed', width: 120 },
    { title: '住院号(MRN)', dataIndex: 'mrn', key: 'mrn', width: 120 },
    { title: '诊断', dataIndex: 'diagnosis', key: 'diagnosis', ellipsis: true },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, r) => (
        <Space direction="vertical" size={4}>
          {r.mrn === activePatientId && (
            <Button size="small" type="text" icon={<SyncOutlined />} style={{ color: '#722ed1' }} onClick={handleSyncActive}>同步当前</Button>
          )}
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEditModal(r)}>编辑</Button>
          <Button size="small" type="text" icon={<FileExcelOutlined />} style={{ color: '#52c41a' }} onClick={() => exportPatientMasterExcel(r.mrn)}>导出</Button>
          <Popconfirm
            title="删除该患者及其所有图表配置？"
            okText="删除" cancelText="取消"
            onConfirm={() => {
              removePatient(r.mrn)
              message.success('已删除该患者')
            }}
          >
            <Button size="small" type="text" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <Row gutter={16}>
      <Col span={17}>
        <Card
          title="患者管理"
          extra={
            <Button type="primary" icon={<UserAddOutlined />} onClick={openAddModal}>
              新增患者
            </Button>
          }
        >
          <Table
            dataSource={patients}
            columns={columns}
            rowKey="mrn"
            pagination={{ pageSize: 8 }}
            size="middle"
            scroll={{ x: 'max-content' }}
          />
        </Card>
      </Col>
      
      <Col span={7}>
        <Card title="批量数据导入 / 导出" style={{ height: '100%' }}>
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Alert
              type="info"
              showIcon
              message="关于 13 种临床图表整合包"
              description="您可以通过一个 Excel 工作簿包（含14张工作表：患者信息表 + 13张图表配置）一键导出和导入病人的所有病历和可视化信息。"
            />
            
            <Card size="small" title="图表数据模板下载" style={{ background: '#f5f5f5', border: '1px solid #d9d9d9' }}>
              <Paragraph style={{ fontSize: 13 }}>
                下载包含 13 种临床场景图表的整合包 Excel 模板，预填了示例指标和说明。
              </Paragraph>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                block
                onClick={downloadMasterTemplate}
              >
                下载总导入模板
              </Button>
            </Card>
            
            <Card size="small" title="一键导入整合数据包" style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}>
              <Paragraph style={{ fontSize: 13 }}>
                选择本地填好数据的 Master Excel 汇总表，系统将自动识别患者基本信息并匹配更新全部 13 种图表！
              </Paragraph>
              <Upload {...uploadProps}>
                <Button
                  type="primary"
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  icon={<UploadOutlined />}
                  block
                >
                  导入总 Excel 整合包
                </Button>
              </Upload>
            </Card>

            <Divider style={{ margin: '8px 0' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              💡 提示：在左侧列表点击“导出”，可随时下载该病人的完整 13 种图表 Excel 档案备份。
            </Text>
          </Space>
        </Card>
      </Col>

      <Modal
        title={editingPatient ? '修改患者信息' : '新增患者'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
        width={450}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                <Input placeholder="张三" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="gender" label="性别" rules={[{ required: true, message: '请选择性别' }]}>
                <Select
                  options={[
                    { label: '男', value: '男' },
                    { label: '女', value: '女' },
                  ]}
                  placeholder="男"
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="age" label="年龄" rules={[{ required: true, message: '请输入年龄' }]}>
                <InputNumber min={1} max={150} style={{ width: '100%' }} placeholder="45" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="bed" label="科室床号" rules={[{ required: true, message: '科室床号' }]}>
                <Input placeholder="心内科 05-3" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="mrn"
                label="住院号 (MRN - 唯一值)"
                rules={[{ required: true, message: '请输入住院号' }]}
              >
                <Input placeholder="MRN-00123" disabled={!!editingPatient} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="diagnosis" label="诊断" rules={[{ required: true, message: '请输入诊断' }]}>
            <Input.TextArea placeholder="高血压3级" rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </Row>
  )
}
