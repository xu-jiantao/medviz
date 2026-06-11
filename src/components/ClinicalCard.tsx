import { Card, Typography, Tag } from 'antd'
import { BulbOutlined } from '@ant-design/icons'
import { CLINICAL } from '@/clinical'

const { Text, Paragraph } = Typography

const LEVEL_META: Record<string, { color: string; label: string; bg: string }> = {
  warning: { color: '#cf1322', label: '预警', bg: '#fff1f0' },
  info: { color: '#1677ff', label: '提示', bg: '#e6f4ff' },
  success: { color: '#52c41a', label: '良好', bg: '#f6ffed' },
}

export default function ClinicalCard({ sample }: { sample: string }) {
  const note = CLINICAL[sample]
  const meta = note ? LEVEL_META[note.level] : LEVEL_META.info

  return (
    <Card
      size="small"
      style={{ marginBottom: 12, borderColor: meta.color, background: meta.bg }}
      styles={{ header: { borderColor: meta.color } }}
      title={
        <span style={{ color: meta.color }}>
          <BulbOutlined /> 临床判断 <Tag color={meta.color} style={{ marginLeft: 4 }}>{meta.label}</Tag>
        </span>
      }
    >
      {note ? (
        <>
          <Paragraph style={{ marginBottom: note.advice ? 8 : 0 }}>{note.conclusion}</Paragraph>
          {note.advice && (
            <Text type="secondary" style={{ fontSize: 13 }}>
              💡 建议：{note.advice}
            </Text>
          )}
        </>
      ) : (
        <Text type="secondary">当前图表暂无预设临床判断。</Text>
      )}
    </Card>
  )
}
