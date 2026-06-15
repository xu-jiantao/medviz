# MedViz · 医学数据可视化

面向临床医生的医学数据可视化工具（CDSS 布局）：**趋势图 / 雷达图 / 热图 / 列线图** 四种高度可定制图表，
支持 Excel/CSV 导入与导出、PDF 报告、从原始病例数据自动拟合统计模型，并可打包为 **Mac / Windows 桌面应用**（带自动更新）。
内置注册登录、三种角色权限、按用户持久化与可选的免费云同步。

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

### CDSS 界面布局
- **顶部**：患者信息栏（姓名/床号/诊断，可编辑）+ 全局时间范围 + 导出按钮。
- **左侧二级导航**：一级=图形类别，二级=临床场景（点场景自动加载对应示例）。
- **右侧临床辅助面板**：「临床判断」卡（预警/提示/良好分级，结论+建议，**可编辑保存**）+ 参数微调。

### 账号、角色与项目
- **注册登录 + 应用门禁**：本地优先（PBKDF2 加盐哈希，存 IndexedDB，离线可用）。
- **三种角色**：`admin`(管理员) / `doctor`(医生) / `user`(普通用户)，按角色显示菜单。内置演示账号：
  `admin / admin8832`、`doctor / doctor8833`、`demo / demo8834`。
- **忘记密码 / 改密码**：注册可设密保问题；登录页「忘记密码」答题重置；用户菜单改密码。
- **工作区自动持久化**：四图编辑、患者信息、临床判断自定义等**按用户自动保存**，刷新/重开自动恢复（见 [数据存储与持久化](#数据存储与持久化重要)）。
- **按用户存项目**：把四图全部配置存为命名项目（仅本人可见）。
- **数据汇总（管理员/医生）**：聚合本机所有账号的患者+项目，一键导出 Excel。
- **云同步（可选）**：登录云账号后把项目备份到服务器、在其它设备恢复（见 [云同步](#云同步免费)）。

### 导出与打包
- **导出 Excel**：把当前图底层数据反向生成表格（含患者抬头）；各图导入处提供「下载模板」。
- **PDF 报告导出**、**项目保存/读取**（四图配置合一 JSON）、各图 **PNG 导出**。
- **桌面应用**：Tauri 打包 Mac `.dmg` / Windows `.msi`/`.exe`，可内置 Python 后端（开箱即用）。
- **桌面自动更新**：装一次后，发新版自动提示下载更新（见 [发布新版本与自动更新](#发布新版本与自动更新命令)）。

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
| 桌面 | Tauri（Rust），PyInstaller 把后端打成 sidecar，tauri-plugin-updater 自动更新 |
| CI | GitHub Actions：推 tag 自动出 Mac + Windows 安装包并签名更新产物 |

---

## 快速开始（网页开发）

```bash
npm install
npm run dev      # 开发服务器 http://localhost:5173
npm run build    # 构建生产包到 dist/
```

首次进入是登录页，点 **「⚡ 用演示账号一键登录」**（普通用户 `demo / `）即可进入，无需注册。
体验不同角色可手动登录：`admin /`（管理员）、`doctor /`（医生）。

## 桌面应用

```bash
# 需先安装 Rust（https://rustup.rs）
npm run tauri:build      # 产物在 src-tauri/target/release/bundle/
```

或直接到 **[Releases](https://github.com/marinerxyz/medviz/releases)** 下载已构建好的安装包：
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

## 发布新版本与自动更新（命令）

整个发布流程已用 GitHub Actions 自动化：**推一个 `v` 开头的 tag → 云端自动构建 Mac+Windows 安装包 → 签名更新产物 → 发布到 Releases**。

### 发布一个新版本

```bash
# 1) 改三处版本号为新版本（如 0.6.0）：
#    package.json、src-tauri/tauri.conf.json、src-tauri/Cargo.toml
#    然后刷新 Cargo.lock：
( cd src-tauri && cargo update -p app )

# 2) 提交并推送 main（只同步代码，不触发打包）
git add -A && git commit -m "v0.6.0：说明"
git push origin main

# 3) 打 tag 并推送 → 触发 CI 构建+发布（约 15–25 分钟）
git tag v0.6.7
git push origin v0.6.7
```

完成后到 **[Releases](https://github.com/marinerxyz/medviz/releases)** → 第一个版本的 **Assets** 即是安装包
（`MedViz_x.y.z_aarch64.dmg`、`MedViz_x.y.z_x64-setup.exe`、`_x64_en-US.msi`）。

### 桌面端自动更新（用户侧）

- 用户**装一次**带更新器的版本（v0.5.0 起）后，每次打开应用会静默检查更新；
  发现新版弹「立即更新」→ 自动下载 → **用内嵌公钥验签** → 安装 → 重启。也可在用户菜单手动「检查更新」。
- 原理：应用读取 Releases 的 `latest.json`（含各平台已签名更新包地址），与本地版本比较。
- 一次性前提：仓库已配置 GitHub Secret **`TAURI_SIGNING_PRIVATE_KEY`**（更新签名私钥）；
  公钥写在 `src-tauri/tauri.conf.json` 的 `plugins.updater.pubkey`。私钥务必备份（`updater-private.key`，已 gitignore）。

### 本地手动打桌面包（不发布）

```bash
# 需先装 Rust（https://rustup.rs）。如要内置后端 sidecar，先用 PyInstaller 生成二进制放到 src-tauri/binaries/
npm run tauri:build       # 产物在 src-tauri/target/release/bundle/
```

---

## 数据存储与持久化（重要）

MedViz 有**两层数据**：本地（每台设备）+ 云端（可选）。先看一张对照表，再回答常见问题。

| 数据 | 存在哪 | 是不是数据库 | 增删改查 | 卸载重装后 |
|---|---|---|---|---|
| 账号（用户名/角色/**PBKDF2 哈希密码**） | 本地 **IndexedDB** | 是（浏览器内嵌库） | 注册/登录/改密码/重置 | **可能丢失** |
| 工作区（四图编辑+患者+临床判断+当前场景） | 本地 **IndexedDB**（`workspace:<用户>`） | 是 | 自动防抖保存、登录恢复 | **可能丢失** |
| 命名项目（我的项目） | 本地 **IndexedDB**（`projects:<用户>`） | 是 | 保存/载入/更新/删除 | **可能丢失** |
| 云账号 + 云端项目 | 云端 **Postgres(Neon)** 或本地 SQLite | 是（真 SQL 库） | 经后端接口 CRUD | **保留**（在服务器） |
| 列线图拟合 | 不存储（无状态计算） | — | — | — |

### 后端数据是怎么保存的？

后端 `backend/auth_store.py` 用 **SQL 数据库**保存账号和云端项目，**两栖**：
- **本地/桌面内置**：用 **SQLite**（文件 `medviz_users.db`）。
- **云端部署**：设了环境变量 `DATABASE_URL` 时自动切 **Postgres（Neon）**。

两张表：`users`（用户名、邮箱、加盐哈希、创建时间）、`projects`（用户名、项目 JSON、更新时间）。
通过 FastAPI 接口做 CRUD：`/auth/register`(增)、`/auth/login`、`/auth/change-password`(改)、
`/cloud/projects` GET(查) / PUT(整体覆盖更新)。云端项目按用户存为一条 JSON（覆盖式 last-write-wins，非逐条记录 CRUD）。
列线图拟合接口（`/fit/*`）是**无状态**的，不落库。

### 用户卸载重装客户端后，数据是不是最新的？

**不一定，默认不会自动保留。** 关键点：

- **本地数据**（账号、工作区、命名项目）存在应用的 WebView 存储（IndexedDB）里，属于**每个安装、每台设备独立**。
  卸载客户端时这部分本地数据**通常会被清掉**（取决于系统/卸载方式），重装后**可能是空的**。
- **要在重装/换设备后拿到最新数据，必须事先用「云同步」上传**：
  **我的项目 → 云同步 → 上传到云**（数据进 Neon Postgres，**持久、跨设备**）；
  重装后再 **从云恢复** 即可拿回。云端是唯一durable、跨设备的数据源。
- ⚠️ **当前限制**：自动持久化的**工作区**（随手编辑的状态）**只存本地、不自动上云**；
  只有**命名项目**能上云。所以重要内容请「保存为项目」后再「上传到云」，才能在重装后恢复。

> 一句话：**本地 = 方便但易失（每装一份独立）；云端 = 持久且跨设备，但需手动上传/恢复。**
> 真正的"卸载重装即得最新数据"需要把工作区也接入云端自动同步——这是后续可加的增强。

### 数据是不是保存在数据库里做增删改查？

是。两层都是数据库：
- **本地** IndexedDB 是浏览器内嵌数据库，账号/工作区/项目都在其中增删改查（前端 `src/auth/idb.ts` 封装）。
- **云端** Neon **Postgres** 是真正的 SQL 数据库，经后端接口做 CRUD。

但注意：**云端项目是"整组覆盖"式**同步（上传=本机项目列表覆盖云端那一条 JSON），不是对单个项目的细粒度行级 CRUD。

---

## 目录结构

```
src/
├─ App.tsx                主框架：门禁 + 顶栏(患者/导出/用户) + 二级导航 + 角色菜单
├─ nav.ts                 导航结构(类别→场景→示例)
├─ clinical.ts            各示例的临床判断默认结论
├─ workspace.ts           按用户工作区持久化(自动保存/恢复/重置)
├─ updater.ts             桌面端检查/安装更新
├─ pages/
│  ├─ TrendPage / RadarPage / HeatmapPage / NomogramPage   四图页面
│  ├─ LoginPage.tsx       登录/注册/忘记密码/演示账号
│  ├─ AccountModal.tsx    改密码
│  ├─ AggregatePage.tsx   数据汇总(管理员/医生)
│  ├─ ProjectsDrawer.tsx  按用户存项目 + 云同步 + 云端改密码
│  └─ FitModal.tsx        从数据拟合(连后端)
├─ components/            PatientBar(患者栏) / ClinicalCard(可编辑临床判断)
├─ charts/
│  ├─ TrendChart/  RadarChart/  Heatmap/    各含 types/buildOption/组件/samples
│  └─ Nomogram/    types/calc/NomogramChart(SVG)/EvalCharts(ROC,校准)/samples
├─ store/                 trend/radar/heatmap/nomogram + nav + patient + clinical
├─ auth/                  idb / crypto(PBKDF2) / authStore(角色) / projects / cloudStore / cloudClient
├─ data/                  importExcel(解析) / templates(下载模板) / fitClient(拟合接口)
└─ export/                projectIO(项目JSON) / exportPdf / exportChartExcel(数据→Excel)

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
| 9 | 各图「下载模板」+ 导出 Excel | ✅ |
| 10 | 桌面端自动更新（tauri-updater，签名校验，CI 自动出更新产物） | ✅ |
| 11 | CDSS 界面重构（二级导航 + 患者栏 + 可编辑临床判断面板） | ✅ |
| 12 | 工作区按用户持久化（刷新/重开保留编辑） | ✅ |
| 13 | 三种角色(admin/doctor/user) + 数据汇总导出 | ✅ |
| 后续 | 工作区自动上云（实现"卸载重装即得最新")、云端跨设备数据汇总 | ⏳ |

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
