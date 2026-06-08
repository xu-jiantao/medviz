"""
MedViz 列线图自动拟合后端。

启动：
    cd backend
    python -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt
    uvicorn app:app --reload --port 8000

接口文档（自动生成）：http://localhost:8000/docs
"""

from __future__ import annotations

import io

import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from nomogram_fit import fit_cox_nomogram, fit_logistic_nomogram

app = FastAPI(title="MedViz Nomogram Fitter", version="0.1.0")

# 开发期允许本地前端跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictorIn(BaseModel):
    name: str
    type: str = Field(pattern="^(continuous|categorical)$")
    label: str | None = None
    unit: str | None = None


class LogisticRequest(BaseModel):
    data: list[dict]
    outcome: str
    predictors: list[PredictorIn]
    title: str = "Logistic 回归列线图"
    pointsMax: float = 100.0
    outcomeName: str = "结局概率"


class CoxRequest(BaseModel):
    data: list[dict]
    duration: str
    event: str
    predictors: list[PredictorIn]
    times: list[float]
    timeLabels: list[str] | None = None
    title: str = "Cox 回归列线图"
    pointsMax: float = 100.0


def _predictors_to_dicts(ps: list[PredictorIn]) -> list[dict]:
    return [p.model_dump(exclude_none=True) for p in ps]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/fit/logistic")
def fit_logistic(req: LogisticRequest):
    df = pd.DataFrame(req.data)
    if req.outcome not in df.columns:
        raise HTTPException(400, f"结局列 '{req.outcome}' 不在数据中")
    try:
        return fit_logistic_nomogram(
            df, req.outcome, _predictors_to_dicts(req.predictors),
            title=req.title, points_max=req.pointsMax, outcome_name=req.outcomeName,
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(400, f"拟合失败：{e}")


@app.post("/fit/cox")
def fit_cox(req: CoxRequest):
    df = pd.DataFrame(req.data)
    for col in (req.duration, req.event):
        if col not in df.columns:
            raise HTTPException(400, f"列 '{col}' 不在数据中")
    try:
        return fit_cox_nomogram(
            df, req.duration, req.event, _predictors_to_dicts(req.predictors),
            times=req.times, time_labels=req.timeLabels,
            title=req.title, points_max=req.pointsMax,
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(400, f"拟合失败：{e}")


def _read_upload(file: UploadFile) -> pd.DataFrame:
    raw = file.file.read()
    name = (file.filename or "").lower()
    if name.endswith(".csv"):
        return pd.read_csv(io.BytesIO(raw))
    return pd.read_excel(io.BytesIO(raw))


@app.post("/parse")
async def parse_file(file: UploadFile = File(...)):
    """上传 CSV/Excel，返回列名和前几行，便于前端配置变量映射。"""
    df = _read_upload(file)
    return {
        "columns": list(df.columns),
        "rowCount": int(len(df)),
        "preview": df.head(5).to_dict(orient="records"),
    }


@app.post("/fit/logistic/upload")
async def fit_logistic_upload(
    file: UploadFile = File(...),
    outcome: str = Form(...),
    predictors: str = Form(..., description='JSON 数组，如 [{"name":"age","type":"continuous"}]'),
    title: str = Form("Logistic 回归列线图"),
    pointsMax: float = Form(100.0),
    outcomeName: str = Form("结局概率"),
):
    import json
    df = _read_upload(file)
    ps = json.loads(predictors)
    return fit_logistic_nomogram(df, outcome, ps, title=title, points_max=pointsMax, outcome_name=outcomeName)
