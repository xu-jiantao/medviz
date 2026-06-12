import { useEffect, useState } from 'react'
import { Card, Table, Button, Tag, Typography, App as AntApp } from 'antd'
import { FileExcelOutlined, ReloadOutlined } from '@ant-design/icons'
import { listUsers, type Role } from '@/auth/authStore'
import { idbGet } from '@/auth/idb'
import { listProjects } from '@/auth/projects'
import { downloadWorkbook, type Aoa } from '@/data/templates'
import { chartAoaFromWorkspace } from '@/export/exportChartExcel'
import type { ViewKey } from '@/nav'

const CHART_SHEETS: { view: ViewKey; name: string }[] = [
  { view: 'trend', name: '趋势图' },
  { view: 'radar', name: '雷达图' },
  { view: 'heatmap', name: '热图' },
  { view: 'nomogram', name: '列线图' },
]

const { Title, Text } = Typography

interface Row {
  username: string
  role: Role
  email: string
  patientName: string
  bed: string
  diagnosis: string
  projects: number
  createdAt: string
}

const ROLE_TAG: Record<Role, { color: string; label: string }> = {
  admin: { color: 'red', label: '管理员' },
  doctor: { color: 'blue', label: '医生' },
  user: { color: 'default', label: '普通用户' },
}

export default function AggregatePage() {
  const { message } = AntApp.useApp()
  const [rows, setRows] = useState<Row[]>([])
  const [wsMap, setWsMap] = useState<Record<string, Record<string, unknown>>>({})
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const users = await listUsers()
      const out: Row[] = []
      const ws_map: Record<string, Record<string, unknown>> = {}
      for (const u of users) {
        const ws = await idbGet<Record<string, unknown> & { patient?: { name: string; bed: string; diagnosis: string } }>(
          `workspace:${u.username.toLowerCase()}`,
        )
        if (ws) ws_map[u.username] = ws
        const projs = await listProjects(u.username)
        out.push({
          username: u.username,
          role: u.role ?? 'user',
          email: u.email,
          patientName: ws?.patient?.name ?? '—',
          bed: ws?.patient?.bed ?? '—',
          diagnosis: ws?.patient?.diagnosis ?? '—',
          projects: projs.length,
          createdAt: (u.createdAt ?? '').slice(0, 10),
        })
      }
      setRows(out)
      setWsMap(ws_map)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onExport = () => {
    // Sheet 1：用户汇总
    const header = ['用户名', '角色', '邮箱', '患者姓名', '科室/床号', '诊断', '项目数', '注册时间']
    const summary: Aoa = [
      [`MedViz 全部用户病人数据汇总 · 导出于 ${new Date().toLocaleString('zh-CN')}`],
      [],
      header,
      ...rows.map((r) => [
        r.username, ROLE_TAG[r.role].label, r.email, r.patientName, r.bed, r.diagnosis, r.projects, r.createdAt,
      ]),
    ]
    const sheets = [{ name: '用户汇总', aoa: summary }]

    // Sheet 2~5：每种图类型一张，纵向堆叠所有用户的该图数据
    for (const { view, name } of CHART_SHEETS) {
      const aoa: Aoa = [[`${name} · 全部用户`]]
      for (const u of rows) {
        const ws = wsMap[u.username]
        if (!ws) continue
        const built = chartAoaFromWorkspace(view, ws)
        if (!built) continue
        aoa.push([], [`【${u.username}（${u.patientName}）】 ${built.title}`], ...built.aoa)
      }
      sheets.push({ name, aoa })
    }

    downloadWorkbook(`全部用户病人数据汇总.xlsx`, sheets)
    message.success(`已导出 ${rows.length} 个用户 × ${CHART_SHEETS.length} 种图`)
  }

  return (
    <Card
      title={<Title level={5} style={{ margin: 0 }}>数据汇总 · 全部用户病人数据</Title>}
      extra={
        <>
          <Button size="small" icon={<ReloadOutlined />} onClick={refresh} style={{ marginRight: 8 }}>刷新</Button>
          <Button size="small" type="primary" icon={<FileExcelOutlined />} onClick={onExport} disabled={!rows.length}>
            导出全部 Excel
          </Button>
        </>
      }
    >
      <Text type="secondary" style={{ fontSize: 12 }}>
        汇总本机所有账号的患者与项目（跨设备汇总需接入云后端）。共 {rows.length} 个用户。
      </Text>
      <Table
        style={{ marginTop: 12 }}
        rowKey="username" size="small" loading={loading} pagination={false}
        dataSource={rows}
        columns={[
          { title: '用户名', dataIndex: 'username' },
          { title: '角色', dataIndex: 'role', render: (r: Role) => <Tag color={ROLE_TAG[r].color}>{ROLE_TAG[r].label}</Tag> },
          { title: '患者', dataIndex: 'patientName' },
          { title: '科室/床号', dataIndex: 'bed' },
          { title: '诊断', dataIndex: 'diagnosis' },
          { title: '项目数', dataIndex: 'projects' },
          { title: '注册', dataIndex: 'createdAt' },
        ]}
      />
    </Card>
  )
}
