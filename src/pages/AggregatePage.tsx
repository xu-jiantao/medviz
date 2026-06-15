import { useEffect, useState } from 'react'
import { Card, Table, Button, Tag, Typography, App as AntApp } from 'antd'
import { FileExcelOutlined, ReloadOutlined } from '@ant-design/icons'
import { listUsers, type Role } from '@/auth/authStore'
import { idbGet } from '@/auth/idb'
import { listProjects } from '@/auth/projects'
import { downloadWorkbook, type Aoa } from '@/data/templates'
import { chartAoaForScenario } from '@/export/exportChartExcel'
import { NAV } from '@/nav'
import { CLINICAL, type ClinicalNote } from '@/clinical'

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
  superadmin: { color: 'purple', label: '超级管理员' },
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

    // Sheet 1.5：临床判断与建议汇总
    const LEVEL_LABEL: Record<string, string> = { warning: '预警', info: '提示', success: '良好' }
    const clinicalSummaryAoa: any[][] = [
      ['用户名', '患者姓名', '图表类别', '应用场景', '预警级别', '临床判断结论', '应对建议']
    ]
    for (const u of rows) {
      const ws = wsMap[u.username] ?? {}
      const clinicalOverrides = (ws.clinicalOverrides as Record<string, ClinicalNote>) ?? {}

      NAV.forEach((cat) => {
        cat.children.forEach((s) => {
          const note = clinicalOverrides[s.sample] ?? CLINICAL[s.sample]
          const levelStr = note ? (LEVEL_LABEL[note.level] ?? note.level) : '提示'
          clinicalSummaryAoa.push([
            u.username,
            u.patientName,
            cat.label,
            s.label,
            levelStr,
            note?.conclusion ?? '无',
            note?.advice ?? '无'
          ])
        })
      })
    }
    sheets.push({ name: '临床判断与建议汇总', aoa: clinicalSummaryAoa })

    // Sheet 2~14：13个临床场景，每个场景一张表，纵向堆叠所有用户的该场景数据
    const allScenarios = NAV.flatMap((c) => c.children.map((s) => ({ ...s, catLabel: c.label })))
    for (const s of allScenarios) {
      const aoa: Aoa = [[`${s.catLabel} - ${s.label} (${s.sample}) · 全部用户数据汇总`]]
      for (const u of rows) {
        const ws = wsMap[u.username] ?? {}
        const built = chartAoaForScenario(s, ws)
        if (!built) continue

        const clinicalOverrides = (ws.clinicalOverrides as Record<string, ClinicalNote>) ?? {}
        const note = clinicalOverrides[s.sample] ?? CLINICAL[s.sample]
        const levelStr = note ? (LEVEL_LABEL[note.level] ?? note.level) : '提示'

        aoa.push(
          [],
          [`【用户名：${u.username} | 患者：${u.patientName} | 科室/床号：${u.bed} | 诊断：${u.diagnosis}】`],
          ['图表标题', built.title ?? s.label],
          ['临床判断', note?.conclusion ?? '无'],
          ['预警级别', levelStr],
          ['应对建议', note?.advice ?? '无'],
          [],
          ...built.aoa
        )
      }
      sheets.push({ name: s.label.slice(0, 31), aoa })
    }

    const formatCompactDate = (date: Date): string => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      const hh = String(date.getHours()).padStart(2, '0')
      const mm = String(date.getMinutes()).padStart(2, '0')
      return `${y}${m}${d}${hh}${mm}`
    }
    const filename = `全部用户数据汇总_${formatCompactDate(new Date())}.xlsx`
    downloadWorkbook(filename, sheets)
    const isMac = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('mac')
    const path = isMac ? `~/Downloads/${filename}` : `Downloads\\${filename}`
    message.success(`已导出 ${rows.length} 个用户 × ${allScenarios.length} 种图表数据，已保存至：${path}`)
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
