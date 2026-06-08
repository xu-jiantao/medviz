import { useRef, useState } from 'react'
import { Layout, Menu, Typography, Button, Space, App as AntApp } from 'antd'
import {
  LineChartOutlined, RadarChartOutlined, TableOutlined, CalculatorOutlined,
  SaveOutlined, FolderOpenOutlined, FilePdfOutlined,
} from '@ant-design/icons'
import TrendPage from './pages/TrendPage'
import RadarPage from './pages/RadarPage'
import HeatmapPage from './pages/HeatmapPage'
import NomogramPage from './pages/NomogramPage'
import { saveProjectFile, loadProjectFile } from './export/projectIO'
import { exportElementToPdf } from './export/exportPdf'

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
  const [view, setView] = useState<ViewKey>('trend')
  const [exporting, setExporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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

  return (
    <Layout style={{ height: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#001529' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          MedViz · 医学数据可视化
        </Title>
        <Space>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={onOpen} />
          <Button ghost size="small" icon={<FolderOpenOutlined />} onClick={() => fileRef.current?.click()}>
            打开项目
          </Button>
          <Button ghost size="small" icon={<SaveOutlined />} onClick={saveProjectFile}>
            保存项目
          </Button>
          <Button type="primary" size="small" icon={<FilePdfOutlined />} loading={exporting} onClick={onExportPdf}>
            导出当前图PDF
          </Button>
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
    </Layout>
  )
}
