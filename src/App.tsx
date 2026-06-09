import { useEffect, useRef, useState } from 'react'
import { Layout, Menu, Typography, Button, Space, Dropdown, Avatar, Spin, App as AntApp } from 'antd'
import {
  LineChartOutlined, RadarChartOutlined, TableOutlined, CalculatorOutlined,
  SaveOutlined, FolderOpenOutlined, FilePdfOutlined, UserOutlined, LogoutOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import TrendPage from './pages/TrendPage'
import RadarPage from './pages/RadarPage'
import HeatmapPage from './pages/HeatmapPage'
import NomogramPage from './pages/NomogramPage'
import LoginPage from './pages/LoginPage'
import ProjectsDrawer from './pages/ProjectsDrawer'
import { saveProjectFile, loadProjectFile } from './export/projectIO'
import { exportElementToPdf } from './export/exportPdf'
import { useAuthStore } from './auth/authStore'

const { Header, Sider, Content } = Layout
const { Title } = Typography

type ViewKey = 'trend' | 'radar' | 'heatmap' | 'nomogram'

const MENU = [
  { key: 'trend', icon: <LineChartOutlined />, label: '趋势图' },
  { key: 'radar', icon: <RadarChartOutlined />, label: '雷达图' },
  { key: 'heatmap', icon: <TableOutlined />, label: '热图' },
  { key: 'nomogram', icon: <CalculatorOutlined />, label: '列线图' },
]

export default function App() {
  const { message } = AntApp.useApp()
  const { currentUser, ready, init, logout } = useAuthStore()
  const [view, setView] = useState<ViewKey>('trend')
  const [exporting, setExporting] = useState(false)
  const [projectsOpen, setProjectsOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    init()
  }, [init])

  const onOpen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await loadProjectFile(file)
      message.success('项目已载入')
    } catch (err) {
      message.error((err as Error).message)
    }
    e.target.value = '' // 允许重复选同一文件
  }

  const onExportPdf = async () => {
    const el = document.querySelector('.medviz-chart-card') as HTMLElement | null
    if (!el) {
      message.warning('当前页面没有可导出的图表')
      return
    }
    setExporting(true)
    try {
      await exportElementToPdf(el)
      message.success('已导出 PDF')
    } catch (err) {
      message.error('导出失败：' + (err as Error).message)
    } finally {
      setExporting(false)
    }
  }

  // 启动时还在读会话
  if (!ready) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  // 门禁：未登录显示登录/注册
  if (!currentUser) return <LoginPage />

  return (
    <Layout style={{ height: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#001529' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          MedViz · 医学数据可视化
        </Title>
        <Space>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={onOpen} />
          <Button ghost size="small" icon={<AppstoreOutlined />} onClick={() => setProjectsOpen(true)}>
            我的项目
          </Button>
          <Button ghost size="small" icon={<FolderOpenOutlined />} onClick={() => fileRef.current?.click()}>
            打开文件
          </Button>
          <Button ghost size="small" icon={<SaveOutlined />} onClick={saveProjectFile}>
            导出文件
          </Button>
          <Button type="primary" size="small" icon={<FilePdfOutlined />} loading={exporting} onClick={onExportPdf}>
            导出PDF
          </Button>
          <Dropdown
            menu={{
              items: [
                { key: 'u', label: currentUser.email || currentUser.username, disabled: true },
                { type: 'divider' },
                { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: () => logout() },
              ],
            }}
          >
            <Space style={{ color: '#fff', cursor: 'pointer' }}>
              <Avatar size="small" style={{ background: '#1677ff' }} icon={<UserOutlined />} />
              {currentUser.username}
            </Space>
          </Dropdown>
        </Space>
      </Header>
      <Layout>
        <Sider width={160} theme="light">
          <Menu
            mode="inline"
            selectedKeys={[view]}
            items={MENU}
            style={{ height: '100%' }}
            onClick={(e) => setView(e.key as ViewKey)}
          />
        </Sider>
        <Content style={{ padding: 16, overflow: 'auto' }}>
          {view === 'trend' && <TrendPage />}
          {view === 'radar' && <RadarPage />}
          {view === 'heatmap' && <HeatmapPage />}
          {view === 'nomogram' && <NomogramPage />}
        </Content>
      </Layout>

      <ProjectsDrawer open={projectsOpen} onClose={() => setProjectsOpen(false)} username={currentUser.username} />
    </Layout>
  )
}
