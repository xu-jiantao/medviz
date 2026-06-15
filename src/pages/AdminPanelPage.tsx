import { useEffect, useState } from 'react'
import { Card, Table, Select, Switch, Button, Tag, Typography, Checkbox, App as AntApp, Space } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { listUsers, type StoredUser, type Role, useAuthStore } from '@/auth/authStore'
import { useAclStore, FEATURES, remainingMs, getDefaultLimit, type UserLimit } from '@/auth/acl'

const { Title, Text } = Typography

const ROLE_TAG: Record<Role, { color: string; label: string }> = {
  superadmin: { color: 'purple', label: '超级管理员' },
  admin: { color: 'red', label: '管理员' },
  doctor: { color: 'blue', label: '医生' },
  user: { color: 'default', label: '普通用户' },
}

// 时长预设
const LIMIT_OPTIONS: { value: string; label: string; limit: UserLimit }[] = [
  { value: 'permanent', label: '永久', limit: { mode: 'permanent' } },
  { value: 'm2', label: '2 分钟', limit: { mode: 'minutes', value: 2 } },
  { value: 'm3', label: '3 分钟', limit: { mode: 'minutes', value: 3 } },
  { value: 'h1', label: '1 小时', limit: { mode: 'hours', value: 1 } },
  { value: 'h8', label: '8 小时', limit: { mode: 'hours', value: 8 } },
  { value: 'h24', label: '24 小时', limit: { mode: 'hours', value: 24 } },
  { value: 'd1', label: '1 天', limit: { mode: 'days', value: 1 } },
  { value: 'd3', label: '3 天', limit: { mode: 'days', value: 3 } },
  { value: 'd7', label: '一周（7 天）', limit: { mode: 'days', value: 7 } },
  { value: 'd30', label: '30 天', limit: { mode: 'days', value: 30 } },
]
const limitToValue = (l?: UserLimit) =>
  LIMIT_OPTIONS.find((o) => o.limit.mode === l?.mode && o.limit.value === l?.value)?.value ?? 'permanent'

function fmtRemaining(ms: number): string {
  if (ms === Infinity) return '永久'
  if (ms <= 0) return '已到期'
  const h = ms / 3600_000
  if (h >= 24) return `剩 ${Math.floor(h / 24)} 天 ${Math.floor(h % 24)} 小时`
  if (h >= 1) return `剩 ${Math.floor(h)} 小时`
  if (ms >= 60_000) return `剩 ${Math.floor(ms / 60_000)} 分钟 ${Math.ceil((ms % 60_000) / 1000)} 秒`
  return `剩 ${Math.ceil(ms / 1000)} 秒`
}

export default function AdminPanelPage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const { message } = AntApp.useApp()
  const { acl, load, setUserLimit, setDisabled, resetClock, setRolePerm } = useAclStore()
  const [users, setUsers] = useState<StoredUser[]>([])
  const [, force] = useState(0)

  const refresh = async () => {
    try {
      await load()
      const allUsers = await listUsers()
      const validUsers = allUsers
        .filter((u) => u && u.username)
        .map((u) => ({
          ...u,
          role: u.role || 'user'
        }))
        .filter((u) => u.role !== 'superadmin')
      setUsers(validUsers)
    } catch (err) {
      console.error('Failed to load user management data:', err)
      message.error('加载用户数据失败')
    }
  }
  useEffect(() => {
    if (currentUser?.role === 'superadmin') {
      refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser])

  if (!currentUser || currentUser.role !== 'superadmin') {
    return (
      <Card style={{ margin: 16 }}>
        <Text type="danger" style={{ fontSize: 16, fontWeight: 'bold' }}>无权访问此页面</Text>
      </Card>
    )
  }

  const editableRoles: Role[] = ['admin', 'doctor', 'user']

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <Card
        title={<Title level={5} style={{ margin: 0 }}>使用时长管理</Title>}
        extra={<Button size="small" icon={<ReloadOutlined />} onClick={refresh}>刷新</Button>}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          为每个用户设置使用期限（从首次登录起算）。到期后该用户无法再登录，需超管重置或改期限。超级管理员不受限。
        </Text>
        <Table
          style={{ marginTop: 12 }}
          rowKey="username" size="small" pagination={false} dataSource={users}
          columns={[
            { title: '用户名', dataIndex: 'username' },
            {
              title: '角色',
              dataIndex: 'role',
              render: (r: Role) => {
                const tag = ROLE_TAG[r] || { color: 'default', label: '普通用户' }
                return <Tag color={tag.color}>{tag.label}</Tag>
              }
            },
            {
              title: '使用期限', render: (_, u) => (
                <Select
                  size="small" style={{ width: 140 }}
                  value={limitToValue(acl.userLimits[u.username] ?? getDefaultLimit(u.username, u.role ?? 'user'))}
                  options={LIMIT_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
                  onChange={async (v) => {
                    await setUserLimit(u.username, LIMIT_OPTIONS.find((o) => o.value === v)!.limit)
                    force((x) => x + 1); message.success('已更新使用期限')
                  }}
                />
              ),
            },
            {
              title: '剩余',
              render: (_, u) => {
                const limit = acl.userLimits[u.username] ?? getDefaultLimit(u.username, u.role ?? 'user')
                if (limit.mode === 'permanent') {
                  return <Text type="secondary">永久</Text>
                }
                const start = acl.firstLoginAt[u.username]
                if (!start) {
                  const units: Record<string, string> = { minutes: '分钟', hours: '小时', days: '天' }
                  return <Text type="warning">未登录（待激活 {limit.value}{units[limit.mode]}）</Text>
                }
                return <Text type="secondary">{fmtRemaining(remainingMs(u.username, u.role ?? 'user'))}</Text>
              }
            },
            {
              title: '启用', render: (_, u) => (
                <Switch
                  size="small" checked={!acl.disabled[u.username]}
                  onChange={async (on) => { await setDisabled(u.username, !on); force((x) => x + 1) }}
                />
              ),
            },
            {
              title: '操作', render: (_, u) => (
                <Button size="small" type="link" onClick={async () => { await resetClock(u.username); force((x) => x + 1); message.success('已重置计时') }}>
                  重置计时
                </Button>
              ),
            },
          ]}
        />
      </Card>

      <Card title={<Title level={5} style={{ margin: 0 }}>角色功能权限</Title>}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          勾选 = 该角色可用此功能。图表浏览始终允许；超级管理员/本表不含的管理功能不受此限。
        </Text>
        <Table
          style={{ marginTop: 12 }}
          rowKey="key" size="small" pagination={false}
          dataSource={editableRoles.map((role) => ({ key: role, role }))}
          columns={[
            {
              title: '角色',
              dataIndex: 'role',
              render: (r: Role) => {
                const tag = ROLE_TAG[r] || { color: 'default', label: '普通用户' }
                return <Tag color={tag.color}>{tag.label}</Tag>
              }
            },
            ...FEATURES.map((f) => ({
              title: f.label,
              render: (_: unknown, row: { role: Role }) => (
                <Checkbox
                  checked={acl.rolePerms[row.role]?.[f.key] !== false}
                  onChange={async (e) => { await setRolePerm(row.role, f.key, e.target.checked) }}
                />
              ),
            })),
          ]}
        />
      </Card>
    </Space>
  )
}
