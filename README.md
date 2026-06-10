# MedViz · 医学数据可视化

面向临床医生的医学数据可视化工具：**趋势图 / 雷达图 / 热图 / 列线图** 四种高度可定制图表，
支持 Excel/CSV 导入、PDF 报告导出、从原始病例数据自动拟合统计模型，并可打包为 **Mac / Windows 桌面应用**。
内置注册登录与可选的免费云同步。

---

## 功能一览

### 四种图表（均可定制 + 导入 Excel/CSV + 导出 PNG，内置临床示例）
- **趋势图** —— 多指标随时间变化；参考线、参考区间（阴影）、事件标注节点、多指标归一化、双 Y 轴。
  示例：高血压 3 年随访 / 术后 BNP / 脓毒症多指标。
- **雷达图** —— 维度数量与规则自定义；多组叠加对比；维度×组别矩阵编辑。
  示例：SOFA / APACHE II / 脑卒中康复（入院 vs 出院）。
- **热图** —— 连续数值 / 分类色块双模式；行/列/配色自定义；列标记线；矩阵编辑。
  示例：基因突变 / 药敏 IC50 / 体温时序。
- **列线图（Nomogram）** —— 自绘 SVG 计算尺；变量/分值/总分→概率；**床旁实时读数**；模型可视化编辑。
  示例：NSCLC 术后生存 / 肺栓塞诊断 / 甲状腺结节恶性概率。

### 统计建模（列线图二期）
- **从数据自动拟合**：上传原始病例 CSV/Excel，后端用 **Logistic / Cox 回归**拟合，自动生成 rms 风格列线图（变量分值 + 总分→概率），前端「从数据拟合」一键应用。
- **模型评价图**：Logistic 输出 **ROC 曲线 + AUC + 校准曲线**；Cox 输出 C-index。

### 账号与项目
- **注册登录 + 应用门禁**：本地优先（PBKDF2 加盐哈希，存 IndexedDB，离线可用），内置演示账号 `demo / demo1234` 一键登录。
- **忘记密码 / 改密码**：注册可设密保问题；登录页「忘记密码」答题重置；用户菜单改密码。
- **按用户存项目**：把四图全部配置存为命名项目（仅本人可见）。
- **云同步（可选）**：登录云账号后把项目备份到服务器、在其它设备恢复（见 [云同步](#云同步免费)）。

### 导出与打包
- **PDF 报告导出**、**项目保存/读取**（四图配置合一 JSON）。
- **桌面应用**：Tauri 打包 Mac `.dmg` / Windows `.msi`/`.exe`，可内置 Python 后端（开箱即用）。

---

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | React + TypeScript + Vite |
| 图表 | ECharts（趋势/雷达/热图）、D3 scale + 自绘 SVG（列线图） |
| UI / 状态 | Ant Design、Zustand |
| 数据 | SheetJS(xlsx) 导入、html2canvas + jsPDF 导出 |
| 认证 | Web Crypto PBKDF2 + IndexedDB（本地）；后端 token |
| 后端 | FastAPI、statsmodels / lifelines（拟合）、SQLite/Postgres 两栖 |
| 桌面 | Tauri（Rust），PyInstaller 把后端打成 sidecar |
| CI | GitHub Actions：推 tag 自动出 Mac + Windows 安装包 |

---

## 快速开始（网页开发）

```bash
npm install
npm run dev      # 开发服务器 http://localhost:5173
npm run build    # 构建生产包到 dist/
```

首次进入是登录页，点 **「⚡ 用演示账号一键登录」**（`demo / demo1234`）即可进入，无需注册。

## 桌面应用

```bash
# 需先安装 Rust（https://rustup.rs）
npm run tauri:build      # 产物在 src-tauri/target/release/bundle/
```

或直接到 **[Releases](https://github.com/xu-jiantao/medviz/releases)** 下载已构建好的安装包：
- Mac：`MedViz_x.y.z_aarch64.dmg`
- Windows：`MedViz_x.y.z_x64-setup.exe` 或 `_x64_en-US.msi`

> ⚠️ Releases 里 **Assets（附件）** 才是安装包；tag 页的「Source code」只是源码快照，不能运行。
> 安装包未做代码签名：Mac 首次打开需「右键 → 打开」，Windows 点「更多信息 → 仍要运行」。

## 后端（拟合 + 账号）

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000     # 接口文档 http://localhost:8000/docs
python demo.py                            # 合成数据自检 + 生成示例
```

后端两块能力：**列线图自动拟合**（`/fit/logistic`、`/fit/cox`）与 **账号/云同步**（`/auth/*`、`/cloud/projects`）。
数据库两栖：本地用 SQLite，设了环境变量 `DATABASE_URL` 时自动切 Postgres。详见 [backend/README.md](backend/README.md)。

桌面包里后端以 **Tauri sidecar**（PyInstaller 单文件，约 89MB）随应用启动自动拉起，监听 `127.0.0.1:8000`。
代价：内置后端后应用约 100MB、冷启动 ~30–80 秒（科学计算库导入较重），故在后台预热。

## 云同步（免费）

账号同步部分可免费部署到 **Render + Neon Postgres**（不用绑卡），见 [backend/DEPLOY.md](backend/DEPLOY.md)。
云端用精简依赖 `requirements-cloud.txt`（不含统计库）。

已部署示例：`https://medviz-backend-ocrp.onrender.com`（前端「云同步」默认地址）。
用法：**我的项目 → 云同步** → 登录/注册云账号 → **上传到云 / 从云恢复**（换设备时用）。
> Render 免费机闲置会休眠，下次首个请求约 50 秒唤醒，属正常。

---

## 目录结构

```
src/
├─ App.tsx                主框架：门禁 + 顶栏（项目/导出/用户菜单）+ 四图导航
├─ main.tsx
├─ pages/
│  ├─ TrendPage / RadarPage / HeatmapPage / NomogramPage   四图页面
│  ├─ LoginPage.tsx       登录/注册/忘记密码
│  ├─ AccountModal.tsx    改密码
│  ├─ ProjectsDrawer.tsx  按用户存项目 + 云同步
│  └─ FitModal.tsx        从数据拟合（连后端）
├─ charts/
│  ├─ TrendChart/  RadarChart/  Heatmap/    各含 types/buildOption/组件/samples
│  └─ Nomogram/    types/calc/NomogramChart(SVG)/EvalCharts(ROC,校准)/samples
├─ store/                 四图 Zustand store
├─ auth/                  idb / crypto(PBKDF2) / authStore / projects / cloudStore / cloudClient
├─ data/                  importExcel（解析）/ fitClient（调拟合接口）
└─ export/                projectIO（项目JSON）/ exportPdf

backend/
├─ app.py                 FastAPI：拟合接口 + 账号/云同步接口
├─ nomogram_fit.py        回归系数 → rms 风格列线图（含 ROC/校准计算）
├─ auth_store.py          账号 + 云项目（SQLite/Postgres 两栖，PBKDF2，签名 token）
├─ server_entry.py        PyInstaller 打包入口（sidecar）
├─ demo.py                合成数据自检
├─ requirements.txt       本地全量依赖（含统计库）
├─ requirements-cloud.txt 云端精简依赖（仅账号同步）
└─ DEPLOY.md              Render + Neon 免费部署指南

src-tauri/                Tauri 桌面外壳（lib.rs 启动时拉起后端 sidecar）
.github/workflows/        CI：各平台自建 sidecar + 打包发布
```

## 设计原则

每种图 = **一份配置 schema（types.ts）** + **一个 option 转换器（buildOption.ts）** + **渲染组件**。
配置面板由 schema 驱动，「轴/参考线/维度/行列数量自定义」天然满足；加新图表只是照抄一组文件。

## 安全说明（重要）

- 本地账号是**门禁 / 多用户隔离**级别：密码 PBKDF2 加盐哈希、不存明文，但 IndexedDB 数据对有设备访问权的人（开发者工具）可见。
- **不适合直接存真实患者隐私数据（PHI）**：临床生产环境需服务端认证 + 数据库加密 + 传输加密 + 审计日志。
- 本地账号每台设备独立，密保问题是唯一的离线找回方式；未设密保则无法找回，只能重新注册。

---

## 路线图（均已完成）

| 阶段 | 内容 | 状态 |
|---|---|---|
| 1–4 | 趋势图 / 雷达图 / 热图 / 列线图（四种核心图表） | ✅ |
| 5 | PDF 导出 + 项目保存/读取 | ✅ |
| 6 | Tauri 桌面打包（Mac/Windows） | ✅ |
| 6.5 | GitHub Actions CI 自动出双平台安装包 | ✅ |
| 7 | 列线图自动拟合（Logistic/Cox） | ✅ |
| 7.1 | 模型评价图（ROC / 校准曲线 / AUC / C-index） | ✅ |
| 7.2 | Python 后端打进桌面应用（Tauri sidecar） | ✅ |
| 8 | 注册登录 + 应用门禁 + 按用户存项目 | ✅ |
| 8.1 | 云同步（后端两栖 SQLite/Postgres + Render/Neon 免费部署） | ✅ |
| 8.2 | 演示账号 / 忘记密码 / 改密码 | ✅ |

---

## Excel / CSV 导入格式

**趋势图**：第一列时间点（表头任意），其余每列一个指标（列头=指标名）

| 随访时间 | 收缩压 | 舒张压 |
|---|---|---|
| 基线 | 168 | 102 |
| 3月 | 158 | 96 |

**雷达图**：第一列维度，名为「满分/max」的列为量程（可选），其余每列一组数据。
**热图**：第一列行名，表头为列名，单元格为数值（连续）或分类文本（分类）。
**拟合**：每行一个病例，列含预测变量 + 结局列（Logistic）或生存时间+事件列（Cox）。
