# MedViz 列线图自动拟合后端

从原始病例数据拟合 **Logistic / Cox** 回归，自动生成前端列线图所需的
「变量分值 + 总分→概率」结构（rms 风格列线图）。这是二期能力，前端「从数据拟合」按钮调用它。

## 启动

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

接口文档（自动生成）：http://localhost:8000/docs

> 注意：`statsmodels 0.14.4` 与新版 scipy 不兼容，requirements 已把 scipy 钉到 1.14.1。

## 自检 / 生成示例数据

```bash
python demo.py
```

会合成 600 例病例，分别跑通 Logistic 和 Cox，校验输出结构，并把示例数据和结果写到
`sample_data/`（`*_sample.csv` 原始数据、`*_nomogram.json` 拟合出的列线图配置）。

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 健康检查 |
| POST | `/fit/logistic` | Logistic 拟合，body 见下 |
| POST | `/fit/cox` | Cox 拟合（按时间点各出一条生存率轴）|
| POST | `/parse` | 上传 CSV/Excel，返回列名和预览 |
| POST | `/fit/logistic/upload` | 直接上传文件 + 表单字段拟合 |

### `/fit/logistic` 请求体

```json
{
  "data": [ {"age": 68, "stage": "II", "nodes": "1~3个", "malignant": 1}, ... ],
  "outcome": "malignant",
  "predictors": [
    {"name": "age", "type": "continuous", "label": "年龄", "unit": "岁"},
    {"name": "stage", "type": "categorical", "label": "病理分期"}
  ],
  "title": "术后恶性概率",
  "outcomeName": "恶性概率",
  "pointsMax": 100
}
```

### `/fit/cox` 请求体

```json
{
  "data": [ {"age": 62, "stage": "IB", "lvi": "无", "months": 40.2, "death": 1}, ... ],
  "duration": "months",
  "event": "death",
  "predictors": [ {"name": "age", "type": "continuous"}, {"name": "stage", "type": "categorical"} ],
  "times": [12, 36, 60],
  "timeLabels": ["1年生存率", "3年生存率", "5年生存率"]
}
```

返回值结构与前端 `src/charts/Nomogram/types.ts` 的 `NomogramConfig` 完全一致
（外加一个 `_meta` 字段，含模型类型、样本量、伪 R² / C-index），前端直接 `setConfig` 即可应用。

## 算法说明

- 对每个变量计算其在数据范围内对线性预测子(lp)的「贡献区间」
- 贡献区间最大的变量赋满分 `pointsMax`，其余按比例缩放（分值非负，最小贡献端=0分）
- 总分与 lp 成线性关系；
  - Logistic：`P = 1/(1+exp(-lp))`
  - Cox：`S(t) = S0(t)^exp(lp_centered)`，对每个时间点输出一条结局轴
