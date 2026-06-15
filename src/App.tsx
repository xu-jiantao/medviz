import { useEffect, useRef, useState } from 'react'
import {
  Layout, Menu, Typography, Button, Space, Dropdown, Avatar, Spin, Tooltip, DatePicker,
  App as AntApp, Tag,
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
import PatientManagementPage from './pages/PatientManagementPage'
import AdminPanelPage from './pages/AdminPanelPage'
import ProjectsDrawer from './pages/ProjectsDrawer'
import AccountModal from './pages/AccountModal'
import PatientBar from './components/PatientBar'
import { saveProjectFile, loadProjectFile } from './export/projectIO'
import { exportElementToPdf } from './export/exportPdf'
import { exportPatientMasterExcel } from './export/patientMasterIO'
import { usePatientStore, saveActivePatientConfig } from './store/patientStore'
import { useAuthStore } from './auth/authStore'
import { useNavStore } from './store/navStore'
import { loadWorkspace, resetWorkspace, startAutosave, syncWorkspaceFromCloud } from './workspace'
import { NAV } from './nav'
import { remainingMs, useAclStore, can } from './auth/acl'
import { SettingFilled } from '@ant-design/icons'
import { checkForUpdate, isTauri } from './updater'

const ROLE_TAG: Record<string, { color: string; label: string }> = {
  superadmin: { color: 'purple', label: '超级管理员' },
  admin: { color: 'red', label: '管理员' },
  doctor: { color: 'blue', label: '医生' },
  user: { color: 'default', label: '普通用户' },
}

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
  const [adminView, setAdminView] = useState<'none' | 'aggregate' | 'patients' | 'admin-panel'>('none')
  const [openKeys, setOpenKeys] = useState<string[]>([]) // 一级菜单默认收起
  const fileRef = useRef<HTMLInputElement>(null)
  const aclLoad = useAclStore((s) => s.load)
  useAclStore((s) => s.acl) // 订阅，权限变化时刷新门禁
  const role = currentUser?.role
  const isMgr = role === 'admin' || role === 'doctor' || role === 'superadmin'
  const canAggregate = isMgr && can(role, 'aggregate')
  const canPatients = isMgr && can(role, 'patients')
  const canExport = can(role, 'export')
  const isSuper = role === 'superadmin'

  useEffect(() => {
    init()
    aclLoad()
  }, [init, aclLoad])

  // 登录后加载该用户工作区（无则重置默认），并开启自动保存
  useEffect(() => {
    setAdminView('none') // 切换/登录/注销用户时重置管理视图
    if (!currentUser) return
    let cleanup: (() => void) | undefined
    loadWorkspace(currentUser.username)
      .then((ok) => { if (!ok) resetWorkspace() })
      .then(() => syncWorkspaceFromCloud(currentUser.username).catch(() => 'none'))
      .finally(() => { cleanup = startAutosave(currentUser.username) })
    return () => cleanup?.()
  }, [currentUser?.username])

  // 权限卫兵：当角色或权限变化时，如果当前视图无权访问则自动退回普通图表视图
  useEffect(() => {
    if (adminView === 'admin-panel' && !isSuper) {
      setAdminView('none')
    } else if (adminView === 'patients' && !canPatients) {
      setAdminView('none')
    } else if (adminView === 'aggregate' && !canAggregate) {
      setAdminView('none')
    }
  }, [adminView, isSuper, canPatients, canAggregate])

  // 检查账号是否过期或禁用
  useEffect(() => {
    if (!currentUser || currentUser.role === 'superadmin') return

    const checkExpiration = async () => {
      await useAclStore.getState().load()
      const acl = useAclStore.getState().acl
      
      // 检查是否被超级管理员手动禁用
      if (acl.disabled[currentUser.username]) {
        await logout()
        modal.warning({
          title: '账号已被禁用',
          content: '您的账号已被管理员禁用，请联系海大计算机学院徐老师！',
          okText: '确定',
        })
        return
      }

      // 检查使用期限是否过期
      const ms = remainingMs(currentUser.username, currentUser.role)
      if (ms <= 0) {
        await logout()
        modal.warning({
          title: '使用期限已到期',
          content: '您的账号使用期限已到，请联系海大计算机学院徐老师！',
          okText: '确定',
        })
      }
    }

    // 挂载时立即检查一次
    checkExpiration()

    const interval = setInterval(checkExpiration, 5000)
    return () => clearInterval(interval)
  }, [currentUser, logout, modal])

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
          {canExport && (
            <>
              <Tooltip title="导出项目文件"><Button ghost size="small" icon={<SaveOutlined />} onClick={saveProjectFile} /></Tooltip>
              <Button
                size="small"
                icon={<FileExcelOutlined />}
                onClick={() => exportPatientMasterExcel(usePatientStore.getState().activePatientId)}
                style={{ background: '#52c41a', color: '#fff', borderColor: '#52c41a' }}
              >
                导出Excel
              </Button>
              <Button type="primary" size="small" icon={<FilePdfOutlined />} loading={exporting} onClick={onExportPdf}>
                导出/打印
              </Button>
            </>
          )}
          <Dropdown
            menu={{
              items: [
                { key: 'u', label: `${currentUser.email || currentUser.username}（${ROLE_TAG[currentUser.role].label}）`, disabled: true },
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
              <Tag color={ROLE_TAG[currentUser.role].color} style={{ marginInlineStart: 4 }}>
                {ROLE_TAG[currentUser.role].label}
              </Tag>
            </Space>
          </Dropdown>
        </Space>
      </Header>
      <Layout>
        <Sider width={216} theme="light" style={{ overflow: 'auto' }}>
          <Menu
            mode="inline"
            selectedKeys={[adminView !== 'none' ? adminView : scenarioKey]}
            openKeys={openKeys}
            onOpenChange={setOpenKeys}
            items={[
              ...MENU_ITEMS,
              ...(canPatients ? [{ key: 'patients', icon: <UserOutlined />, label: '病人管理' }] : []),
              ...(canAggregate ? [{ key: 'aggregate', icon: <DatabaseOutlined />, label: '数据汇总' }] : []),
              ...(isSuper ? [{ key: 'admin-panel', icon: <SettingFilled />, label: '权限与时长管理' }] : []),
            ]}
            style={{ height: '100%', borderInlineEnd: 0 }}
            onClick={(e) => {
              saveActivePatientConfig()
              if (e.key === 'aggregate') setAdminView('aggregate')
              else if (e.key === 'patients') setAdminView('patients')
              else if (e.key === 'admin-panel') setAdminView('admin-panel')
              else { setAdminView('none'); setScenario(e.key) }
            }}
          />
        </Sider>
        <Content style={{ padding: 16, overflow: 'auto' }}>
          {adminView === 'aggregate' && <AggregatePage />}
          {adminView === 'patients' && <PatientManagementPage />}
          {adminView === 'admin-panel' && <AdminPanelPage />}
          {adminView === 'none' && (
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
