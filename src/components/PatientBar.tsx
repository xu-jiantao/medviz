import { Popover, Form, Input, InputNumber, Button, Tag, Space, Select } from 'antd'
import { UserOutlined, EditOutlined } from '@ant-design/icons'
import { usePatientStore, loadPatientData, saveActivePatientConfig } from '@/store/patientStore'
import { useNavStore } from '@/store/navStore'

export default function PatientBar() {
  const { patient, patients, activePatientId, setActivePatientId, setPatient } = usePatientStore()
  const scenarioKey = useNavStore((s) => s.scenarioKey)

  const handleSelectPatient = (id: string) => {
    saveActivePatientConfig()
    setActivePatientId(id)
    loadPatientData(id, scenarioKey)
  }

  const editForm = (
    <Form
      layout="vertical" size="small" style={{ width: 280 }}
      initialValues={patient}
      onFinish={(v) => setPatient(v)}
    >
      <Space style={{ width: '100%' }}>
        <Form.Item name="name" label="姓名"><Input /></Form.Item>
        <Form.Item name="gender" label="性别"><Input style={{ width: 60 }} /></Form.Item>
        <Form.Item name="age" label="年龄"><InputNumber style={{ width: 70 }} /></Form.Item>
      </Space>
      <Form.Item name="bed" label="科室/床号"><Input /></Form.Item>
      <Form.Item name="mrn" label="住院号"><Input disabled /></Form.Item>
      <Form.Item name="diagnosis" label="诊断"><Input /></Form.Item>
      <Button type="primary" htmlType="submit" size="small" block>保存</Button>
    </Form>
  )

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'rgba(255,255,255,0.08)', padding: '4px 12px', borderRadius: 6,
    }}>
      <UserOutlined style={{ color: '#69b1ff' }} />
      <Select
        size="small"
        variant="borderless"
        value={activePatientId}
        className="patient-select"
        options={patients.map((p) => ({ label: p.name, value: p.mrn }))}
        onChange={handleSelectPatient}
        popupClassName="patient-select-popup"
        dropdownStyle={{ minWidth: 150 }}
        style={{
          color: '#fff',
          fontWeight: 600,
          padding: 0,
          margin: 0,
          width: 110,
        }}
      />
      <span style={{ color: '#bfbfbf', fontSize: 12 }}>{patient.gender} · {patient.age}岁</span>
      <Tag color="blue" style={{ margin: 0 }}>{patient.bed}</Tag>
      <span style={{ color: '#d9d9d9', fontSize: 12 }}>{patient.mrn}</span>
      <Tag color="red" style={{ margin: 0 }}>{patient.diagnosis}</Tag>
      <Popover content={editForm} title="编辑患者信息" trigger="click" placement="bottomLeft">
        <Button type="text" size="small" icon={<EditOutlined />} style={{ color: '#bfbfbf' }} />
      </Popover>
    </div>
  )
}
