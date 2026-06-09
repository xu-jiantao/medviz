import { useState } from 'react'
import { Card, Form, Input, Button, Tabs, Typography, Divider, App as AntApp } from 'antd'
import {
  UserOutlined, LockOutlined, MailOutlined, MedicineBoxOutlined, ThunderboltOutlined,
  SafetyOutlined, ArrowLeftOutlined,
} from '@ant-design/icons'
import { useAuthStore, DEMO } from '@/auth/authStore'

const { Title, Text } = Typography

export default function LoginPage() {
  const { login, register, demoLogin } = useAuthStore()
  const { message } = AntApp.useApp()
  const [tab, setTab] = useState('login')
  const [view, setView] = useState<'auth' | 'reset'>('auth')
  const [loading, setLoading] = useState(false)

  const onDemo = async () => {
    setLoading(true)
    try {
      await demoLogin()
      message.success('已用演示账号登录')
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

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

  const onRegister = async (v: {
    username: string; email: string; password: string; question?: string; answer?: string
  }) => {
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

        {view === 'reset' ? (
          <ResetView onBack={() => setView('auth')} />
        ) : (
          <>
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
                      <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]} style={{ marginBottom: 8 }}>
                        <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" autoComplete="current-password" />
                      </Form.Item>
                      <div style={{ textAlign: 'right', marginBottom: 12 }}>
                        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setView('reset')}>
                          忘记密码？
                        </Button>
                      </div>
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
                      <Form.Item name="question">
                        <Input prefix={<SafetyOutlined />} placeholder="密保问题（选填，用于找回密码）" size="large" />
                      </Form.Item>
                      <Form.Item name="answer">
                        <Input prefix={<SafetyOutlined />} placeholder="密保答案（选填）" size="large" />
                      </Form.Item>
                      <Button type="primary" htmlType="submit" block size="large" loading={loading}>注册并登录</Button>
                    </Form>
                  ),
                },
              ]}
            />
            <Divider style={{ margin: '8px 0' }} plain>
              <Text type="secondary" style={{ fontSize: 12 }}>或</Text>
            </Divider>
            <Button icon={<ThunderboltOutlined />} block onClick={onDemo} loading={loading}>
              用演示账号一键登录
            </Button>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'center', marginTop: 8 }}>
              演示账号：{DEMO.username} / {DEMO.password}　·　账号仅存本机，离线可用
            </Text>
          </>
        )}
      </Card>
    </div>
  )
}

// 忘记密码：先填用户名取出密保问题，再答题重置
function ResetView({ onBack }: { onBack: () => void }) {
  const { getSecurityQuestion, resetPassword } = useAuthStore()
  const { message } = AntApp.useApp()
  const [username, setUsername] = useState('')
  const [question, setQuestion] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const loadQuestion = async () => {
    if (!username.trim()) return message.warning('请输入用户名')
    setLoading(true)
    try {
      const q = await getSecurityQuestion(username)
      if (!q) {
        message.error('该账号未设置密保问题，无法找回。可重新注册一个账号。')
        return
      }
      setQuestion(q)
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const onReset = async (v: { answer: string; newPassword: string }) => {
    setLoading(true)
    try {
      await resetPassword({ username, answer: v.answer, newPassword: v.newPassword })
      message.success('密码已重置，已自动登录')
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Button type="link" size="small" icon={<ArrowLeftOutlined />} style={{ padding: 0, marginBottom: 8 }} onClick={onBack}>
        返回登录
      </Button>
      <Title level={5} style={{ marginTop: 0 }}>找回密码</Title>

      {!question ? (
        <>
          <Input
            prefix={<UserOutlined />} placeholder="用户名" size="large"
            value={username} onChange={(e) => setUsername(e.target.value)}
            onPressEnter={loadQuestion}
          />
          <Button type="primary" block size="large" style={{ marginTop: 12 }} loading={loading} onClick={loadQuestion}>
            下一步
          </Button>
        </>
      ) : (
        <Form name="resetForm" layout="vertical" onFinish={onReset} requiredMark={false}>
          <Text type="secondary">密保问题</Text>
          <div style={{ margin: '4px 0 12px', fontWeight: 500 }}>{question}</div>
          <Form.Item name="answer" rules={[{ required: true, message: '请输入密保答案' }]}>
            <Input prefix={<SafetyOutlined />} placeholder="密保答案" size="large" />
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
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>重置密码</Button>
        </Form>
      )}
    </div>
  )
}
