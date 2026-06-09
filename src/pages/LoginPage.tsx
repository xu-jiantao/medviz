import { useState } from 'react'
import { Card, Form, Input, Button, Tabs, Typography, App as AntApp } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined, MedicineBoxOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/auth/authStore'

const { Title, Text } = Typography

export default function LoginPage() {
  const { login, register } = useAuthStore()
  const { message } = AntApp.useApp()
  const [tab, setTab] = useState('login')
  const [loading, setLoading] = useState(false)

  const onLogin = async (v: { username: string; password: string }) => {
    setLoading(true)
    try {
      await login(v)
      message.success(`欢迎回来，${v.username}`)
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const onRegister = async (v: { username: string; email: string; password: string }) => {
    setLoading(true)
    try {
      await register(v)
      message.success('注册成功，已自动登录')
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #001529 0%, #1677ff 100%)',
    }}>
      <Card style={{ width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <MedicineBoxOutlined style={{ fontSize: 40, color: '#1677ff' }} />
          <Title level={3} style={{ margin: '8px 0 0' }}>MedViz</Title>
          <Text type="secondary">医学数据可视化工具</Text>
        </div>

        <Tabs
          activeKey={tab}
          onChange={setTab}
          centered
          items={[
            {
              key: 'login',
              label: '登录',
              children: (
                <Form name="loginForm" layout="vertical" onFinish={onLogin} requiredMark={false}>
                  <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                    <Input prefix={<UserOutlined />} placeholder="用户名" size="large" autoComplete="username" />
                  </Form.Item>
                  <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" autoComplete="current-password" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" block size="large" loading={loading}>登录</Button>
                </Form>
              ),
            },
            {
              key: 'register',
              label: '注册',
              children: (
                <Form name="registerForm" layout="vertical" onFinish={onRegister} requiredMark={false}>
                  <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }, { min: 2, message: '至少 2 个字符' }]}>
                    <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
                  </Form.Item>
                  <Form.Item name="email" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}>
                    <Input prefix={<MailOutlined />} placeholder="邮箱" size="large" />
                  </Form.Item>
                  <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少 6 位' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="密码（至少 6 位）" size="large" />
                  </Form.Item>
                  <Form.Item
                    name="confirm" dependencies={['password']}
                    rules={[
                      { required: true, message: '请再次输入密码' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) return Promise.resolve()
                          return Promise.reject(new Error('两次输入的密码不一致'))
                        },
                      }),
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="确认密码" size="large" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" block size="large" loading={loading}>注册并登录</Button>
                </Form>
              ),
            },
          ]}
        />
        <Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'center', marginTop: 8 }}>
          账号与加密密码仅保存在本机（IndexedDB），离线可用
        </Text>
      </Card>
    </div>
  )
}
