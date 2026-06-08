import type { NomogramConfig } from './types'

/** 示例1：非小细胞肺癌术后生存预测（多结局：1/3/5 年生存率） */
export const nsclc: NomogramConfig = {
  title: '非小细胞肺癌术后生存预测',
  pointsMax: 100,
  variables: [
    {
      id: 'age', name: '年龄', type: 'continuous', unit: '岁',
      valueAnchors: [{ value: 40, points: 0 }, { value: 80, points: 30 }],
    },
    {
      id: 'stage', name: '病理分期', type: 'categorical',
      levels: [
        { label: 'IA', points: 0 }, { label: 'IB', points: 10 },
        { label: 'IIA', points: 20 }, { label: 'IIB', points: 35 },
        { label: 'IIIA', points: 50 },
      ],
    },
    {
      id: 'ln', name: '淋巴结转移数', type: 'categorical',
      levels: [{ label: '0个', points: 0 }, { label: '1~3个', points: 15 }, { label: '≥4个', points: 30 }],
    },
    {
      id: 'lvi', name: '脉管癌栓', type: 'categorical',
      levels: [{ label: '无', points: 0 }, { label: '有', points: 20 }],
    },
    {
      id: 'chemo', name: '术后辅助化疗', type: 'categorical',
      levels: [{ label: '是', points: 0 }, { label: '否', points: 12 }],
    },
  ],
  outcomes: [
    {
      id: 's1', name: '1年生存率', color: '#52c41a',
      anchors: [
        { prob: 0.99, totalPoints: 20 }, { prob: 0.95, totalPoints: 60 },
        { prob: 0.9, totalPoints: 90 }, { prob: 0.82, totalPoints: 120 }, { prob: 0.7, totalPoints: 142 },
      ],
    },
    {
      id: 's3', name: '3年生存率', color: '#1677ff',
      anchors: [
        { prob: 0.95, totalPoints: 20 }, { prob: 0.85, totalPoints: 60 },
        { prob: 0.72, totalPoints: 90 }, { prob: 0.55, totalPoints: 120 }, { prob: 0.35, totalPoints: 142 },
      ],
    },
    {
      id: 's5', name: '5年生存率', color: '#cf1322',
      anchors: [
        { prob: 0.9, totalPoints: 20 }, { prob: 0.75, totalPoints: 60 },
        { prob: 0.6, totalPoints: 90 }, { prob: 0.4, totalPoints: 120 }, { prob: 0.2, totalPoints: 142 },
      ],
    },
  ],
}

/** 示例2：疑似肺栓塞确诊概率（诊断概率，单结局） */
export const pe: NomogramConfig = {
  title: '疑似肺栓塞（PE）确诊概率',
  pointsMax: 100,
  variables: [
    {
      id: 'wells', name: 'Wells分层', type: 'categorical',
      levels: [{ label: '低', points: 0 }, { label: '中', points: 15 }, { label: '高', points: 30 }],
    },
    {
      id: 'dd', name: 'D-二聚体', type: 'categorical',
      levels: [{ label: '<500', points: 0 }, { label: '500~1000', points: 10 }, { label: '>1000', points: 20 }],
    },
    {
      id: 'us', name: '下肢超声', type: 'categorical',
      levels: [{ label: '正常', points: 0 }, { label: '血栓', points: 30 }],
    },
    {
      id: 'ctpa', name: 'CTPA', type: 'categorical',
      levels: [
        { label: '未做', points: 0 }, { label: '亚段栓塞', points: 15 }, { label: '主肺动脉栓塞', points: 40 },
      ],
    },
  ],
  outcomes: [
    {
      id: 'p', name: '确诊PE概率', color: '#cf1322',
      anchors: [
        { prob: 0.02, totalPoints: 0 }, { prob: 0.15, totalPoints: 30 },
        { prob: 0.5, totalPoints: 60 }, { prob: 0.85, totalPoints: 90 }, { prob: 0.97, totalPoints: 120 },
      ],
    },
  ],
}

/** 示例3：甲状腺结节恶性概率 */
export const thyroid: NomogramConfig = {
  title: '甲状腺结节恶性概率',
  pointsMax: 100,
  variables: [
    {
      id: 'size', name: '结节大小', type: 'categorical',
      levels: [{ label: '<1cm', points: 0 }, { label: '1~2cm', points: 5 }, { label: '>2cm', points: 10 }],
    },
    {
      id: 'echo', name: '超声特征', type: 'categorical',
      levels: [
        { label: '囊性', points: 0 }, { label: '实性等回声', points: 5 },
        { label: '实性低回声', points: 15 }, { label: '微钙化', points: 20 },
      ],
    },
    {
      id: 'ar', name: '纵横比', type: 'categorical',
      levels: [{ label: '<1', points: 0 }, { label: '>1', points: 15 }],
    },
    {
      id: 'margin', name: '边界', type: 'categorical',
      levels: [{ label: '清晰', points: 0 }, { label: '模糊', points: 10 }],
    },
    {
      id: 'elastic', name: '弹性评分', type: 'categorical',
      levels: [{ label: '1~2分', points: 0 }, { label: '3分', points: 10 }, { label: '4~5分', points: 20 }],
    },
  ],
  outcomes: [
    {
      id: 'mal', name: '恶性概率', color: '#cf1322',
      anchors: [
        { prob: 0.02, totalPoints: 0 }, { prob: 0.1, totalPoints: 20 },
        { prob: 0.4, totalPoints: 40 }, { prob: 0.7, totalPoints: 55 }, { prob: 0.92, totalPoints: 75 },
      ],
    },
  ],
}

export const nomogramSamples: Record<string, NomogramConfig> = {
  '非小细胞肺癌术后生存': nsclc,
  '肺栓塞确诊概率': pe,
  '甲状腺结节恶性概率': thyroid,
}
