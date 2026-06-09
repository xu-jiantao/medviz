import { useEffect, useState } from 'react'
import {
  Drawer, List, Button, Input, Space, Popconfirm, Typography, Empty, App as AntApp,
  Divider, Tag, Segmented,
} from 'antd'
import {
  SaveOutlined, FolderOpenOutlined, DeleteOutlined, ReloadOutlined,
  CloudUploadOutlined, CloudDownloadOutlined, CloudOutlined, LogoutOutlined,
} from '@ant-design/icons'
import {
  listProjects, saveCurrentProject, loadProject, deleteProject, overwriteProject,
  replaceProjects, type SavedProject,
} from '@/auth/projects'
import { useCloudStore } from '@/auth/cloudStore'
import { cloudGetProjects, cloudPutProjects } from '@/auth/cloudClient'

const { Text } = Typography

interface Props {
  open: boolean
  onClose: () => void
  username: string
}

export default function ProjectsDrawer({ open, onClose, username }: Props) {
  const { message } = AntApp.useApp()
  const [items, setItems] = useState<SavedProject[]>([])
  const [name, setName] = useState('')

  const refresh = async () => setItems(await listProjects(username))

  useEffect(() => {
    if (open) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, username])

  const onSaveNew = async () => {
    await saveCurrentProject(username, name || `项目 ${items.length + 1}`)
    setName('')
    await refresh()
    message.success('已保存当前四图为新项目')
  }

  return (
    <Drawer title={`我的项目 · ${username}`} open={open} onClose={onClose} width={380}>
      <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
        <Input
          placeholder="项目名称" value={name}
          onChange={(e) => setName(e.target.value)}
          onPressEnter={onSaveNew}
        />
        <Button type="primary" icon={<SaveOutlined />} onClick={onSaveNew}>保存当前</Button>
      </Space.Compact>
      <Text type="secondary" style={{ fontSize: 12 }}>
        把当前趋势图/雷达图/热图/列线图的全部配置存为一个项目（仅你可见）
      </Text>

      {items.length === 0 ? (
        <Empty style={{ marginTop: 40 }} description="还没有保存的项目" />
      ) : (
        <List
          style={{ marginTop: 12 }}
          dataSource={items}
          renderItem={(p) => (
            <List.Item
              actions={[
                <Button
                  key="load" size="small" type="link" icon={<FolderOpenOutlined />}
                  onClick={async () => { await loadProject(username, p.id); message.success(`已载入「${p.name}」`); onClose() }}
                >载入</Button>,
                <Popconfirm
                  key="ow" title="用当前四图覆盖此项目？" onConfirm={async () => { await overwriteProject(username, p.id); await refresh(); message.success('已更新') }}
                >
                  <Button size="small" type="link" icon={<ReloadOutlined />}>更新</Button>
                </Popconfirm>,
                <Popconfirm
                  key="del" title="删除此项目？" onConfirm={async () => { await deleteProject(username, p.id); await refresh() }}
                >
                  <Button size="small" type="link" danger icon={<DeleteOutlined />} />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={p.name}
                description={<Text type="secondary" style={{ fontSize: 12 }}>{new Date(p.savedAt).toLocaleString('zh-CN')}</Text>}
              />
            </List.Item>
          )}
        />
      )}

      <Divider orientation="left" style={{ marginTop: 24 }}>云同步（可选）</Divider>
      <CloudSync localUsername={username} onAfterPull={refresh} />
    </Drawer>
  )
}

function CloudSync({ localUsername, onAfterPull }: { localUsername: string; onAfterPull: () => Promise<void> }) {
  const { message } = AntApp.useApp()
  const cloud = useCloudStore()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState(localUsername)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const doAuth = async () => {
    setBusy(true)
    try {
      if (mode === 'register') await cloud.register({ username, email, password })
      else await cloud.login({ username, password })
      message.success('云端已登录')
      setPassword('')
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const push = async () => {
    setBusy(true)
    try {
      const list = await listProjects(localUsername)
      const r = await cloudPutProjects(cloud.backendUrl, cloud.token!, list)
      message.success(`已上传 ${r.count} 个项目到云端`)
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const pull = async () => {
    setBusy(true)
    try {
      const { projects } = await cloudGetProjects(cloud.backendUrl, cloud.token!)
      await replaceProjects(localUsername, projects)
      await onAfterPull()
      message.success(`已从云端恢复 ${projects.length} 个项目`)
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (cloud.token && cloud.user) {
    return (
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        <Text><CloudOutlined /> 云账号：<Tag color="blue">{cloud.user.username}</Tag></Text>
        <Space>
          <Button icon={<CloudUploadOutlined />} loading={busy} onClick={push}>上传到云</Button>
          <Button icon={<CloudDownloadOutlined />} loading={busy} onClick={pull}>从云恢复</Button>
          <Button icon={<LogoutOutlined />} onClick={cloud.logout}>退出云</Button>
        </Space>
        <Text type="secondary" style={{ fontSize: 12 }}>上传=本机项目覆盖云端；恢复=云端项目覆盖本机（换设备时用）</Text>
      </Space>
    )
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={8}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        登录云账号后可把项目备份到服务器、在其它设备恢复。需后端在线。
      </Text>
      <Input size="small" placeholder="后端地址" value={cloud.backendUrl} onChange={(e) => cloud.setBackendUrl(e.target.value)} />
      <Segmented
        size="small" value={mode} onChange={(v) => setMode(v as 'login' | 'register')}
        options={[{ label: '登录', value: 'login' }, { label: '注册', value: 'register' }]}
      />
      <Input size="small" placeholder="云账号用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
      {mode === 'register' && (
        <Input size="small" placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} />
      )}
      <Input.Password size="small" placeholder="密码" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button type="primary" size="small" block loading={busy} onClick={doAuth}>
        {mode === 'register' ? '注册并登录云端' : '登录云端'}
      </Button>
    </Space>
  )
}
