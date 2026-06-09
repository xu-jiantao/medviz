# MedViz · 医学数据可视化

医生用的临床数据可视化工具：**趋势图 / 雷达图 / 热图 / 列线图**，四种图都高度可定制，可导入 Excel/CSV，最终打包为 Mac / Windows 桌面应用。

## 技术栈

- **React + TypeScript + Vite** —— 前端框架
- **ECharts** —— 趋势图 / 雷达图 / 热图渲染
- **D3 scale + SVG** —— 列线图自绘（计划中）
- **Ant Design** —— UI 组件
- **Zustand** —— 状态管理
- **SheetJS (xlsx)** —— Excel/CSV 导入
- **Tauri** —— 桌面端打包（计划中）

## 运行

```bash
npm install
npm run dev      # 开发，http://localhost:5173
npm run build    # 构建生产包到 dist/
```

## 目录结构

```
src/
├─ App.tsx              主框架（左侧四种图表导航）
├─ pages/
│  ├─ TrendPage.tsx     趋势图页面：图表 + 配置面板 + 导入
│  └─ RadarPage.tsx     雷达图页面：图表 + 数据矩阵 + 数据组管理
├─ charts/
│  ├─ TrendChart/
│  │  ├─ types.ts       趋势图配置模型（轴/参考线/区间/事件标注）
│  │  ├─ buildOption.ts 配置 → ECharts option 转换器
│  │  ├─ TrendChart.tsx 渲染组件
│  │  └─ samples.ts     内置临床示例（高血压/BNP/脓毒症）
│  ├─ RadarChart/       同结构（types/buildOption/RadarChart/samples）
│  │                    示例：SOFA / APACHE II / 脑卒中康复对比
│  ├─ Heatmap/          连续/分类双模式 + 列标记线
│  │                    示例：基因突变 / 药敏IC50 / 体温时序
│  └─ Nomogram/         自绘 SVG 计算尺 + calc.ts（分值/概率插值）
│                       示例：NSCLC生存 / 肺栓塞 / 甲状腺结节
├─ store/              四个 Zustand store（trend/radar/heatmap/nomogram）
├─ data/
│  └─ importExcel.ts   Excel/CSV 解析（趋势/雷达/热图）
└─ export/
   ├─ projectIO.ts     项目保存/读取（四图配置合一 JSON）
   └─ exportPdf.ts     当前图表卡片 → PDF（html2canvas + jsPDF）

backend/                Python 列线图自动拟合后端（二期）
├─ app.py              FastAPI 接口（/fit/logistic、/fit/cox 等）
├─ nomogram_fit.py     回归系数 → rms 风格列线图配置
├─ demo.py            合成数据自检 + 生成示例
└─ requirements.txt
```

## 设计原则

每种图 = **一份配置 schema（types.ts）** + **一个 option 转换器（buildOption.ts）** + **渲染组件**。
配置面板根据 schema 驱动，"轴/参考线/维度/行列数量自定义"天然满足；加新图表只是加一组文件。

## 路线图

| 阶段 | 内容 | 状态 |
|---|---|---|
| 1 | 项目脚手架 + 趋势图（参考线/阴影区间/事件标注/多指标归一化/Excel导入） | ✅ 已完成 |
| 2 | 雷达图（维度自定义、多组叠加对比、维度×组别矩阵编辑、Excel导入；APACHE/SOFA/康复评估） | ✅ 已完成 |
| 3 | 热图（连续/分类双模式、行/列/配色自定义、列标记线、矩阵编辑、Excel导入；基因突变/药敏IC50/体温时序） | ✅ 已完成 |
| 4 | 列线图 —— 手动建模（自绘SVG、变量/分值/总分→概率、床旁实时读数、模型可编辑；生存/诊断/恶性概率） | ✅ 已完成 |
| 5 | 顶栏工具栏：PDF 报告导出、项目保存/读取（本地 JSON，四图一起存）、各图 PNG 导出 | ✅ 已完成 |
| 6 | Tauri 桌面打包（Mac .dmg / Windows .msi）| ⏳ |
| 6.5 | GitHub Actions CI：推 tag 自动出 Mac + Windows 安装包 | ✅ 已完成 |
| 7 | 列线图自动拟合（Python FastAPI + statsmodels/lifelines，从原始病例拟合 Logistic/Cox，前端「从数据拟合」一键应用） | ✅ 已完成 |
| 7.1 | 模型评价图：Logistic 的 ROC + 校准曲线、AUC/C-index 指标 | ✅ 已完成 |
| 7.2 | Python 后端打进桌面应用（Tauri sidecar，PyInstaller 单文件，启动时自动拉起，CI 各平台自建） | ✅ 已完成 |
| 8 | 注册登录 + 应用门禁 + 按用户存项目（本地优先：PBKDF2+IndexedDB；可选云同步：后端 SQLite 账号 + 项目备份/恢复） | ✅ 已完成 |

## Excel 导入格式（趋势图）

第一列 = 时间点（表头任意），其余每列 = 一个指标（列表头 = 指标名）：

| 随访时间 | 收缩压 | 舒张压 |
|---|---|---|
| 基线 | 168 | 102 |
| 3月 | 158 | 96 |
| 6月 | 142 | 88 |
