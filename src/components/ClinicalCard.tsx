import { useState } from 'react'
import { Card, Typography, Tag, Button, Input, Segmented, Space } from 'antd'
import { BulbOutlined, EditOutlined, SaveOutlined, RollbackOutlined } from '@ant-design/icons'
import { useClinicalStore, getNote } from '@/store/clinicalStore'
import type { ClinicalNote } from '@/clinical'

const { Text, Paragraph } = Typography

const LEVEL_META: Record<string, { color: string; label: string; bg: string }> = {
  warning: { color: '#cf1322', label: '预警', bg: '#fff1f0' },
  info: { color: '#1677ff', label: '提示', bg: '#e6f4ff' },
  success: { color: '#52c41a', label: '良好', bg: '#f6ffed' },
}

export default function ClinicalCard({ sample }: { sample: string }) {
  const { overrides, saveNote, resetNote } = useClinicalStore()
  const note = getNote(overrides, sample)
  const meta = note ? LEVEL_META[note.level] : LEVEL_META.info
  const edited = !!overrides[sample]

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ClinicalNote>(note ?? { level: 'info', conclusion: '', advice: '' })

  const startEdit = () => {
    setDraft(note ?? { level: 'info', conclusion: '', advice: '' })
    setEditing(true)
  }
  const onSave = () => {
    saveNote(sample, { ...draft, conclusion: draft.conclusion.trim() })
    setEditing(false)
  }

  return (
    <Card
      size="small"
      style={{ marginBottom: 12, borderColor: meta.color, background: editing ? '#fff' : meta.bg }}
      styles={{ header: { borderColor: meta.color } }}
      title={
        <span style={{ color: meta.color }}>
          <BulbOutlined /> 临床判断 <Tag color={meta.color} style={{ marginLeft: 4 }}>{meta.label}</Tag>
          {edited && <Tag style={{ marginLeft: 0 }}>已自定义</Tag>}
        </span>
      }
      extra={
        editing ? (
          <Space size={4}>
            <Button size="small" type="primary" icon={<SaveOutlined />} onClick={onSave}>保存</Button>
            <Button size="small" onClick={() => setEditing(false)}>取消</Button>
          </Space>
        ) : (
          <Space size={4}>
            {edited && <Button size="small" type="text" icon={<RollbackOutlined />} onClick={() => resetNote(sample)} title="恢复默认" />}
            <Button size="small" type="text" icon={<EditOutlined />} onClick={startEdit}>编辑</Button>
          </Space>
        )
      }
    >
      {editing ? (
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          <Segmented
            size="small"
            value={draft.level}
            options={[{ label: '预警', value: 'warning' }, { label: '提示', value: 'info' }, { label: '良好', value: 'success' }]}
            onChange={(v) => setDraft({ ...draft, level: v as ClinicalNote['level'] })}
          />
          <Input.TextArea
            rows={3} placeholder="临床判断结论"
            value={draft.conclusion}
            onChange={(e) => setDraft({ ...draft, conclusion: e.target.value })}
          />
          <Input.TextArea
            rows={2} placeholder="应对建议（可选）"
            value={draft.advice}
            onChange={(e) => setDraft({ ...draft, advice: e.target.value })}
          />
        </Space>
      ) : note ? (
        <>
          <Paragraph style={{ marginBottom: note.advice ? 8 : 0 }}>{note.conclusion}</Paragraph>
          {note.advice && (
            <Text type="secondary" style={{ fontSize: 13 }}>💡 建议：{note.advice}</Text>
          )}
        </>
      ) : (
        <Text type="secondary">当前图表暂无预设临床判断，点「编辑」可添加。</Text>
      )}
    </Card>
  )
}
