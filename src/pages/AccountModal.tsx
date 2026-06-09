import { useState } from 'react'
import { Modal, Form, Input, App as AntApp, Typography } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/auth/authStore'

const { Text } = Typography

interface Props {
  open: boolean
  onClose: () => void
}

export default function AccountModal({ open, onClose }: Props) {
  const { currentUser, changePassword } = useAuthStore()
  const { message } = AntApp.useApp()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const onSubmit = async (v: { oldPassword: string; newPassword: string }) => {
    setLoading(true)
    try {
      await changePassword(v)
      message.success('密码已修改')
      form.resetFields()
      onClose()
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onCancel={onClose} onOk={() => form.submit()} confirmLoading={loading}
      title="账号设置 · 修改密码" okText="保存" cancelText="取消">
      <Text type="secondary">当前账号：{currentUser?.username}</Text>
      <Form form={form} layout="vertical" onFinish={onSubmit} requiredMark={false} style={{ marginTop: 12 }}>
        <Form.Item name="oldPassword" rules={[{ required: true, message: '请输入原密码' }]}>
          <Input.Password prefix={<LockOutlined />} placeholder="原密码" size="large" />
        </Form.Item>
        <Form.Item name="newPassword" rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '至少 6 位' }]}>
          <Input.Password prefix={<LockOutlined />} placeholder="新密码（至少 6 位）" size="large" />
        </Form.Item>
        <Form.Item
          name="confirm" dependencies={['newPassword']}
          rules={[
            { required: true, message: '请再次输入新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                return Promise.reject(new Error('两次输入的密码不一致'))
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="确认新密码" size="large" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
