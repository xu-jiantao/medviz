"""
从原始病例数据拟合统计模型，并转换成前端列线图所需的 NomogramConfig 结构。

采用 rms（Regression Modeling Strategies）风格的列线图构建法：
  1. 对每个预测变量，计算它在数据取值范围内对线性预测子(lp)的「贡献区间」
  2. 贡献区间最大的变量被赋予满分 pointsMax(默认100)，其余按比例缩放
  3. 各变量分值之和 = 总分；总分与 lp 成线性关系
  4. 总分 → 概率：
       Logistic:  P = 1 / (1 + exp(-lp))
       Cox:       S(t) = S0(t) ** exp(lp_centered)   （按时间点各出一条结局轴）

输出的 dict 结构与前端 src/charts/Nomogram/types.ts 的 NomogramConfig 完全对应。
"""

from __future__ import annotations

import uuid
from typing import Literal

import numpy as np
import pandas as pd
import statsmodels.api as sm
from lifelines import CoxPHFitter


def _uid() -> str:
    return uuid.uuid4().hex[:8]


# 预测变量描述：{"name": 列名, "type": "continuous" | "categorical", "label"?: 显示名, "unit"?: 单位}
Predictor = dict


class PredictorBasis:
    """记录单个变量「取值 → 对 lp 的贡献」的离散基点，用于后续换算分值。"""

    def __init__(self, predictor: Predictor):
        self.name = predictor["name"]
        self.label = predictor.get("label", self.name)
        self.unit = predictor.get("unit")
        self.type = predictor["type"]
        # points_basis: List[(显示标签或数值, 贡献值)]
        self.basis: list[tuple] = []

    @property
    def contributions(self) -> list[float]:
        return [c for _, c in self.basis]

    @property
    def contrib_min(self) -> float:
        return min(self.contributions)

    @property
    def contrib_range(self) -> float:
        cs = self.contributions
        return max(cs) - min(cs)


def _build_design(df: pd.DataFrame, predictors: list[Predictor]):
    """构造设计矩阵；分类变量做哑变量编码（drop_first，首水平为参照）。
    返回 (X, 每个变量的列映射信息)。"""
    cols = {}
    parts = []
    for p in predictors:
        name = p["name"]
        if p["type"] == "categorical":
            s = df[name].astype("category")
            levels = list(s.cat.categories)
            dummies = pd.get_dummies(s, prefix=name, prefix_sep="__", drop_first=True).astype(float)
            parts.append(dummies)
            cols[name] = {"levels": levels, "ref": levels[0], "dummy_cols": list(dummies.columns)}
        else:
            parts.append(df[[name]].astype(float))
            cols[name] = {"min": float(df[name].min()), "max": float(df[name].max())}
    X = pd.concat(parts, axis=1)
    return X, cols


def _fill_basis(predictors: list[Predictor], cols: dict, params: pd.Series) -> list[PredictorBasis]:
    """根据回归系数填充每个变量的贡献基点。params 含各列系数（分类为哑变量列）。"""
    out = []
    for p in predictors:
        pb = PredictorBasis(p)
        info = cols[p["name"]]
        if p["type"] == "categorical":
            # 参照水平贡献=0；其余=对应哑变量系数
            pb.basis.append((str(info["ref"]), 0.0))
            for lvl in info["levels"][1:]:
                col = f"{p['name']}__{lvl}"
                beta = float(params.get(col, 0.0))
                pb.basis.append((str(lvl), beta))
        else:
            beta = float(params.get(p["name"], 0.0))
            xmin, xmax = info["min"], info["max"]
            pb.basis.append((xmin, beta * xmin))
            pb.basis.append((xmax, beta * xmax))
        out.append(pb)
    return out


def _assemble_variables(bases: list[PredictorBasis], scale: float) -> list[dict]:
    """把贡献基点按 scale 换算成前端变量结构（分值非负，最小贡献端=0分）。"""
    variables = []
    for pb in bases:
        cmin = pb.contrib_min
        if pb.type == "categorical":
            levels = [
                {"label": lbl, "points": round((c - cmin) * scale, 1)}
                for lbl, c in pb.basis
            ]
            variables.append({
                "id": _uid(), "name": pb.label, "type": "categorical", "levels": levels,
            })
        else:
            anchors = [
                {"value": val, "points": round((c - cmin) * scale, 1)}
                for val, c in pb.basis
            ]
            anchors.sort(key=lambda a: a["value"])
            variables.append({
                "id": _uid(), "name": pb.label, "type": "continuous",
                "unit": pb.unit, "valueAnchors": anchors,
            })
    return variables


def _total_range(bases: list[PredictorBasis], scale: float) -> tuple[float, float]:
    total_max = sum(pb.contrib_range for pb in bases) * scale
    return 0.0, total_max


def _sweep_points(total_max: float, n: int = 7) -> list[float]:
    return [round(total_max * i / (n - 1), 1) for i in range(n)]


# ---------------------------------------------------------------------------
# Logistic 列线图
# ---------------------------------------------------------------------------
def fit_logistic_nomogram(
    df: pd.DataFrame,
    outcome: str,
    predictors: list[Predictor],
    title: str = "Logistic 回归列线图",
    points_max: float = 100.0,
    outcome_name: str = "结局概率",
) -> dict:
    y = df[outcome].astype(float)
    X, cols = _build_design(df, predictors)
    Xc = sm.add_constant(X, has_constant="add")
    res = sm.Logit(y, Xc).fit(disp=0)
    params = res.params
    const = float(params.get("const", 0.0))

    bases = _fill_basis(predictors, cols, params)
    max_range = max((pb.contrib_range for pb in bases), default=1.0) or 1.0
    scale = points_max / max_range

    variables = _assemble_variables(bases, scale)
    _, total_max = _total_range(bases, scale)
    sum_cmin = sum(pb.contrib_min for pb in bases)

    anchors = []
    for tp in _sweep_points(total_max):
        lp = const + sum_cmin + tp / scale
        prob = 1.0 / (1.0 + np.exp(-lp))
        anchors.append({"prob": round(float(prob), 4), "totalPoints": tp})

    return {
        "title": title,
        "pointsMax": points_max,
        "variables": variables,
        "outcomes": [{"id": _uid(), "name": outcome_name, "color": "#cf1322", "anchors": anchors}],
        "_meta": {"model": "logistic", "n": int(len(df)), "auc_pseudo_r2": round(float(res.prsquared), 4)},
    }


# ---------------------------------------------------------------------------
# Cox 列线图（按时间点各出一条生存率轴）
# ---------------------------------------------------------------------------
def fit_cox_nomogram(
    df: pd.DataFrame,
    duration: str,
    event: str,
    predictors: list[Predictor],
    times: list[float],
    time_labels: list[str] | None = None,
    title: str = "Cox 回归列线图",
    points_max: float = 100.0,
) -> dict:
    X, cols = _build_design(df, predictors)
    fit_df = X.copy()
    fit_df[duration] = df[duration].astype(float).values
    fit_df[event] = df[event].astype(int).values

    cph = CoxPHFitter()
    cph.fit(fit_df, duration_col=duration, event_col=event)
    params = cph.params_  # Series，索引=列名

    bases = _fill_basis(predictors, cols, params)
    max_range = max((pb.contrib_range for pb in bases), default=1.0) or 1.0
    scale = points_max / max_range

    variables = _assemble_variables(bases, scale)
    _, total_max = _total_range(bases, scale)
    sum_cmin = sum(pb.contrib_min for pb in bases)

    # 各列均值（lifelines 以均值为中心）
    means = X.mean()
    sum_beta_mean = float(sum(float(params[c]) * float(means[c]) for c in X.columns))

    # 基线生存函数 S0(t)（均值协变量处）
    base_surv = cph.baseline_survival_  # DataFrame index=time
    sweep = _sweep_points(total_max)

    palette = ["#52c41a", "#1677ff", "#cf1322", "#722ed1", "#fa8c16"]
    labels = time_labels or [f"t={t}" for t in times]
    outcomes = []
    for k, (t, lab) in enumerate(zip(times, labels)):
        s0 = _baseline_at(base_surv, t)
        anchors = []
        for tp in sweep:
            lp_centered = tp / scale + sum_cmin - sum_beta_mean
            surv = float(s0 ** np.exp(lp_centered))
            surv = min(max(surv, 0.0), 1.0)
            anchors.append({"prob": round(surv, 4), "totalPoints": tp})
        outcomes.append({"id": _uid(), "name": lab, "color": palette[k % len(palette)], "anchors": anchors})

    return {
        "title": title,
        "pointsMax": points_max,
        "variables": variables,
        "outcomes": outcomes,
        "_meta": {"model": "cox", "n": int(len(df)), "concordance": round(float(cph.concordance_index_), 4)},
    }


def _baseline_at(base_surv: pd.DataFrame, t: float) -> float:
    """取基线生存函数在时间 t 的值（阶梯函数，取 <=t 的最后一个）。"""
    s = base_surv.iloc[:, 0]
    idx = s.index[s.index <= t]
    if len(idx) == 0:
        return float(s.iloc[0])
    return float(s.loc[idx[-1]])
