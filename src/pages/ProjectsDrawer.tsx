import { useEffect, useState } from 'react'
import {
  Drawer, List, Button, Input, Space, Popconfirm, Typography, Empty, App as AntApp,
} from 'antd'
import { SaveOutlined, FolderOpenOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import {
  listProjects, saveCurrentProject, loadProject, deleteProject, overwriteProject,
  type SavedProject,
} from '@/auth/projects'

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
    </Drawer>
  )
}
