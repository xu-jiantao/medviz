// 各示例对应的「临床判断」结论与应对建议，显示在右侧临床分析面板

export interface ClinicalNote {
  level: 'warning' | 'info' | 'success'
  conclusion: string
  advice?: string
}

export const CLINICAL: Record<string, ClinicalNote> = {
  // 趋势
  '高血压3年血压趋势': {
    level: 'warning',
    conclusion: '收缩压第 6 月降至 142 后，第 9 月回升至 150，提示可能出现「药效逃逸」。',
    advice: '考虑换用 ARB 或加量，缩短随访间隔。',
  },
  '心脏术后BNP': {
    level: 'warning',
    conclusion: '术后第 3 天 BNP 反跳性升高至 620 pg/mL（>400 阈值），提示容量负荷过重或心功能不全。',
    advice: '评估液体平衡，必要时加强利尿、限制入量。',
  },
  '脓毒症多指标(归一化)': {
    level: 'warning',
    conclusion: 'WBC 下降但 PCT 持续升高，提示可能存在非细菌性感染或真菌感染。',
    advice: '复查血/真菌培养，评估抗真菌指征。',
  },
  // 雷达
  'SOFA器官功能评分': {
    level: 'warning',
    conclusion: '「循环」与「肾脏」两轴明显外凸，提示需要升压药与 CRRT 支持。',
    advice: '监测乳酸与尿量，及时启动器官支持。',
  },
  'APACHE II生理评分': {
    level: 'warning',
    conclusion: '「氧合」轴外凸突出，提示呼吸衰竭为主要矛盾。',
    advice: '优化氧合策略，必要时机械通气。',
  },
  '脑卒中康复(入院vs出院)': {
    level: 'success',
    conclusion: '出院较入院各轴普遍扩大，但「吞咽」「言语」改善相对滞后。',
    advice: '康复重点放在吞咽与言语训练。',
  },
  // 热图
  '体温时序(带给药竖线)': {
    level: 'success',
    conclusion: '换用碳青霉烯后体温由深红转浅，提示抗生素有效覆盖致病菌。',
    advice: '维持当前方案，继续监测体温趋势。',
  },
  '基因突变(分类色块)': {
    level: 'info',
    conclusion: '患者 E EGFR 扩增、患者 B ALK 融合，提示存在可匹配的靶向治疗机会。',
    advice: '按驱动基因匹配靶向药物（如奥希替尼）。',
  },
  '药敏IC50(连续)': {
    level: 'info',
    conclusion: '类器官 O3 对紫杉醇敏感（绿）、对铂类相对耐药（红）。',
    advice: '据药敏优选化疗方案，避免无效铂类。',
  },
  // 列线图
  '非小细胞肺癌术后生存': {
    level: 'info',
    conclusion: '在右侧选择各变量取值，列线图即时读出个体化 1/3/5 年生存率。',
    advice: '结合分期与化疗意愿共同决策。',
  },
  '甲状腺结节恶性概率': {
    level: 'info',
    conclusion: '输入超声特征与弹性评分，实时得出恶性概率。',
    advice: '恶性概率 >70% 建议直接手术，5%~70% 行 FNA。',
  },
  '肺栓塞确诊概率': {
    level: 'info',
    conclusion: '综合 Wells、D-二聚体、下肢超声与 CTPA，读出确诊概率。',
    advice: '概率 >85% 可直接抗凝，15%~85% 安排 CTPA。',
  },
}
