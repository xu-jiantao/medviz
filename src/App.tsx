import { useEffect, useRef, useState } from 'react'
import {
  Layout, Menu, Typography, Button, Space, Dropdown, Avatar, Spin, Tooltip, DatePicker,
  App as AntApp,
} from 'antd'
import {
  LineChartOutlined, RadarChartOutlined, TableOutlined, CalculatorOutlined,
  SaveOutlined, FolderOpenOutlined, FilePdfOutlined, UserOutlined, LogoutOutlined,
  AppstoreOutlined, SettingOutlined, CloudSyncOutlined, MedicineBoxOutlined,
  FileExcelOutlined, DatabaseOutlined,
} from '@ant-design/icons'
import TrendPage from './pages/TrendPage'
import RadarPage from './pages/RadarPage'
import HeatmapPage from './pages/HeatmapPage'
import NomogramPage from './pages/NomogramPage'
import LoginPage from './pages/LoginPage'
import AggregatePage from './pages/AggregatePage'
import ProjectsDrawer from './pages/ProjectsDrawer'
import AccountModal from './pages/AccountModal'
import PatientBar from './components/PatientBar'
import { saveProjectFile, loadProjectFile } from './export/projectIO'
import { exportElementToPdf } from './export/exportPdf'
import { exportCurrentChartExcel } from './export/exportChartExcel'
import { useAuthStore } from './auth/authStore'
import { useNavStore } from './store/navStore'
import { loadWorkspace, resetWorkspace, startAutosave } from './workspace'
import { NAV } from './nav'
import { checkForUpdate, isTauri } from './updater'

const ROLE_LABEL: Record<string, string> = { admin: '管理员', doctor: '医生', user: '普通用户' }

const { Header, Sider, Content } = Layout
const { Title } = Typography
const { RangePicker } = DatePicker

const CAT_ICON: Record<string, React.ReactNode> = {
  trend: <LineChartOutlined />,
  radar: <RadarChartOutlined />,
  heatmap: <TableOutlined />,
  nomogram: <CalculatorOutlined />,
}

const MENU_ITEMS = NAV.map((cat) => ({
  key: cat.key,
  icon: CAT_ICON[cat.icon],
  label: cat.label,
  children: cat.children.map((sc) => ({ key: sc.key, label: sc.label })),
}))

export default function App() {
  const { message, modal } = AntApp.useApp()
  const { currentUser, ready, init, logout } = useAuthStore()
  const { view, scenarioKey, setScenario } = useNavStore()
  const [exporting, setExporting] = useState(false)
  const [projectsOpen, setProjectsOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [showAggregate, setShowAggregate] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const canAggregate = currentUser?.role === 'admin' || currentUser?.role === 'doctor'

  useEffect(() => {
    init()
  }, [init])

  // 登录后加载该用户工作区（无则重置默认），并开启自动保存
  useEffect(() => {
    if (!currentUser) return
    let cleanup: (() => void) | undefined
    loadWorkspace(currentUser.username)
      .then((ok) => { if (!ok) resetWorkspace() })
      .finally(() => { cleanup = startAutosave(currentUser.username) })
    return () => cleanup?.()
  }, [currentUser?.username])

  useEffect(() => {
    if (isTauri) runUpdateCheck(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runUpdateCheck = async (manual: boolean) => {
    try {
      const upd = await checkForUpdate()
      if (!upd) {
        if (manual) message.success('已是最新版本')
        return
      }
      modal.confirm({
        title: `发现新版本 ${upd.version}`,
        content: upd.notes ? upd.notes : '是否现在下载并更新？更新后应用会自动重启。',
        okText: '立即更新',
        cancelText: '稍后',
        onOk: async () => {
          const hide = message.loading('正在下载更新…', 0)
          try {
            await upd.install()
          } catch (e) {
            message.error('更新失败：' + (e as Error).message)
          } finally {
            hide()
          }
        },
      })
    } catch (e) {
      if (manual) message.error('检查更新失败：' + (e as Error).message)
    }
  }

  const onOpen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await loadProjectFile(file)
      message.success('项目已载入')
    } catch (err) {
      message.error((err as Error).message)
    }
    e.target.value = ''
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

  if (!ready) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!currentUser) return <LoginPage />

  return (
    <Layout style={{ height: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#001529', padding: '0 16px', gap: 16 }}>
        <Space size={14}>
          <Space size={6}>
            <MedicineBoxOutlined style={{ color: '#69b1ff', fontSize: 20 }} />
            <Title level={5} style={{ color: '#fff', margin: 0, whiteSpace: 'nowrap' }}>MedViz</Title>
          </Space>
          <PatientBar />
        </Space>

        <Space size={8}>
          <Tooltip title="全局时间范围筛选">
            <RangePicker size="small" style={{ width: 220 }} />
          </Tooltip>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={onOpen} />
          <Tooltip title="我的项目"><Button ghost size="small" icon={<AppstoreOutlined />} onClick={() => setProjectsOpen(true)} /></Tooltip>
          <Tooltip title="打开项目文件"><Button ghost size="small" icon={<FolderOpenOutlined />} onClick={() => fileRef.current?.click()} /></Tooltip>
          <Tooltip title="导出项目文件"><Button ghost size="small" icon={<SaveOutlined />} onClick={saveProjectFile} /></Tooltip>
          <Button size="small" icon={<FileExcelOutlined />} onClick={() => exportCurrentChartExcel(view)} style={{ background: '#52c41a', color: '#fff', borderColor: '#52c41a' }}>
            导出Excel
          </Button>
          <Button type="primary" size="small" icon={<FilePdfOutlined />} loading={exporting} onClick={onExportPdf}>
            导出/打印
          </Button>
          <Dropdown
            menu={{
              items: [
                { key: 'u', label: `${currentUser.email || currentUser.username}（${ROLE_LABEL[currentUser.role]}）`, disabled: true },
                { type: 'divider' },
                { key: 'account', icon: <SettingOutlined />, label: '账号设置 / 改密码', onClick: () => setAccountOpen(true) },
                ...(isTauri
                  ? [{ key: 'update', icon: <CloudSyncOutlined />, label: '检查更新', onClick: () => runUpdateCheck(true) }]
                  : []),
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
        <Sider width={216} theme="light" style={{ overflow: 'auto' }}>
          <Menu
            mode="inline"
            selectedKeys={[showAggregate ? 'aggregate' : scenarioKey]}
            defaultOpenKeys={NAV.map((c) => c.key)}
            items={[
              ...MENU_ITEMS,
              ...(canAggregate
                ? [{ key: 'aggregate', icon: <DatabaseOutlined />, label: '数据汇总' }]
                : []),
            ]}
            style={{ height: '100%', borderInlineEnd: 0 }}
            onClick={(e) => {
              if (e.key === 'aggregate') setShowAggregate(true)
              else { setShowAggregate(false); setScenario(e.key) }
            }}
          />
        </Sider>
        <Content style={{ padding: 16, overflow: 'auto' }}>
          {showAggregate ? <AggregatePage /> : (
            <>
              {view === 'trend' && <TrendPage />}
              {view === 'radar' && <RadarPage />}
              {view === 'heatmap' && <HeatmapPage />}
              {view === 'nomogram' && <NomogramPage />}
            </>
          )}
        </Content>
      </Layout>

      <ProjectsDrawer open={projectsOpen} onClose={() => setProjectsOpen(false)} username={currentUser.username} />
      <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />
    </Layout>
  )
}
