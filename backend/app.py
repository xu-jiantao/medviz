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

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# pandas / statsmodels / lifelines 仅在「拟合」接口里用，延迟导入，
# 这样云端只部署「账号+同步」时无需安装这些笨重的库。

import auth_store

app = FastAPI(title="MedViz Nomogram Fitter", version="0.1.0")


@app.on_event("startup")
def _startup():
    auth_store.init_db()

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


# ---------------- 账号与云同步 ----------------
class RegisterReq(BaseModel):
    username: str
    email: str = ""
    password: str


class LoginReq(BaseModel):
    username: str
    password: str


class ProjectsReq(BaseModel):
    projects: list


class ChangePwdReq(BaseModel):
    oldPassword: str
    newPassword: str


class WorkspaceReq(BaseModel):
    workspace: dict


def current_user(authorization: str = Header(default="")) -> str:
    """从 Authorization: Bearer <token> 解析出用户名。"""
    token = authorization.removeprefix("Bearer ").strip()
    username = auth_store.verify_token(token)
    if not username:
        raise HTTPException(401, "未登录或登录已过期")
    return username


@app.post("/auth/register")
def auth_register(req: RegisterReq):
    try:
        auth_store.create_user(req.username, req.email, req.password)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"token": auth_store.make_token(req.username), "user": auth_store.get_user(req.username)}


@app.post("/auth/login")
def auth_login(req: LoginReq):
    try:
        user = auth_store.verify_user(req.username, req.password)
    except ValueError as e:
        raise HTTPException(401, str(e))
    return {"token": auth_store.make_token(user["username"]), "user": user}


@app.get("/auth/me")
def auth_me(username: str = Depends(current_user)):
    return {"user": auth_store.get_user(username)}


@app.post("/auth/change-password")
def auth_change_password(req: ChangePwdReq, username: str = Depends(current_user)):
    try:
        auth_store.change_password(username, req.oldPassword, req.newPassword)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"ok": True}


@app.get("/cloud/projects")
def cloud_get(username: str = Depends(current_user)):
    return {"projects": auth_store.get_projects(username)}


@app.put("/cloud/projects")
def cloud_put(req: ProjectsReq, username: str = Depends(current_user)):
    updated = auth_store.set_projects(username, req.projects)
    return {"ok": True, "updated": updated, "count": len(req.projects)}


@app.get("/cloud/workspace")
def cloud_get_workspace(username: str = Depends(current_user)):
    return {"workspace": auth_store.get_workspace(username)}


@app.put("/cloud/workspace")
def cloud_put_workspace(req: WorkspaceReq, username: str = Depends(current_user)):
    updated = auth_store.set_workspace(username, req.workspace)
    return {"ok": True, "updated": updated}


@app.post("/fit/logistic")
def fit_logistic(req: LogisticRequest):
    import pandas as pd
    from nomogram_fit import fit_logistic_nomogram

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
    import pandas as pd
    from nomogram_fit import fit_cox_nomogram

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


def _read_upload(file: UploadFile):
    import pandas as pd

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

    from nomogram_fit import fit_logistic_nomogram

    df = _read_upload(file)
    ps = json.loads(predictors)
    return fit_logistic_nomogram(df, outcome, ps, title=title, points_max=pointsMax, outcome_name=outcomeName)
