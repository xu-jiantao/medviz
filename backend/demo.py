"""
合成病例数据，跑通 Logistic / Cox 两种拟合，验证输出结构，并导出示例 CSV。
直接运行： python demo.py
"""

from __future__ import annotations

import json
import os

import numpy as np
import pandas as pd

from nomogram_fit import fit_cox_nomogram, fit_logistic_nomogram

rng = np.random.default_rng(42)
N = 600
OUT_DIR = os.path.join(os.path.dirname(__file__), "sample_data")
os.makedirs(OUT_DIR, exist_ok=True)


def sigmoid(x):
    return 1 / (1 + np.exp(-x))


def make_logistic_df() -> pd.DataFrame:
    age = rng.normal(60, 10, N).clip(35, 85)
    stage = rng.choice(["I", "II", "III"], N, p=[0.4, 0.35, 0.25])
    nodes = rng.choice(["0个", "1~3个", "≥4个"], N, p=[0.5, 0.3, 0.2])
    stage_eff = pd.Series(stage).map({"I": 0.0, "II": 0.8, "III": 1.8}).values
    nodes_eff = pd.Series(nodes).map({"0个": 0.0, "1~3个": 0.9, "≥4个": 2.0}).values
    lp = -5.5 + 0.05 * age + stage_eff + nodes_eff
    y = rng.binomial(1, sigmoid(lp))
    return pd.DataFrame({"age": age.round(0), "stage": stage, "nodes": nodes, "malignant": y})


def make_cox_df() -> pd.DataFrame:
    age = rng.normal(62, 9, N).clip(40, 85)
    stage = rng.choice(["IA", "IB", "II", "III"], N, p=[0.3, 0.3, 0.25, 0.15])
    lvi = rng.choice(["无", "有"], N, p=[0.7, 0.3])
    stage_eff = pd.Series(stage).map({"IA": 0.0, "IB": 0.5, "II": 1.1, "III": 1.9}).values
    lvi_eff = pd.Series(lvi).map({"无": 0.0, "有": 0.7}).values
    lp = 0.03 * (age - 60) + stage_eff + lvi_eff
    # 指数分布生存时间（月），基线风险 0.01
    t = rng.exponential(1.0 / (0.012 * np.exp(lp)))
    censor = rng.uniform(0, 80, N)  # 随访上限
    duration = np.minimum(t, censor).round(1)
    event = (t <= censor).astype(int)
    return pd.DataFrame({
        "age": age.round(0), "stage": stage, "lvi": lvi,
        "months": duration, "death": event,
    })


def check_config(cfg: dict, label: str):
    assert "variables" in cfg and cfg["variables"], f"{label}: 无变量"
    assert "outcomes" in cfg and cfg["outcomes"], f"{label}: 无结局"
    for v in cfg["variables"]:
        if v["type"] == "categorical":
            pts = [l["points"] for l in v["levels"]]
        else:
            pts = [a["points"] for a in v["valueAnchors"]]
        assert min(pts) >= -0.01, f"{label}/{v['name']}: 出现负分值"
    for o in cfg["outcomes"]:
        probs = [a["prob"] for a in o["anchors"]]
        assert all(0 <= p <= 1 for p in probs), f"{label}/{o['name']}: 概率越界"
    print(f"  ✓ {label} 结构校验通过：{len(cfg['variables'])} 变量, "
          f"{len(cfg['outcomes'])} 结局, meta={cfg.get('_meta')}")


def main():
    print("=== Logistic ===")
    df_log = make_logistic_df()
    df_log.to_csv(os.path.join(OUT_DIR, "logistic_sample.csv"), index=False)
    cfg_log = fit_logistic_nomogram(
        df_log, "malignant",
        [
            {"name": "age", "type": "continuous", "label": "年龄", "unit": "岁"},
            {"name": "stage", "type": "categorical", "label": "病理分期"},
            {"name": "nodes", "type": "categorical", "label": "淋巴结转移"},
        ],
        title="术后恶性概率（合成数据）", outcome_name="恶性概率",
    )
    check_config(cfg_log, "Logistic")
    with open(os.path.join(OUT_DIR, "logistic_nomogram.json"), "w", encoding="utf-8") as f:
        json.dump(cfg_log, f, ensure_ascii=False, indent=2)

    print("=== Cox ===")
    df_cox = make_cox_df()
    df_cox.to_csv(os.path.join(OUT_DIR, "cox_sample.csv"), index=False)
    cfg_cox = fit_cox_nomogram(
        df_cox, "months", "death",
        [
            {"name": "age", "type": "continuous", "label": "年龄", "unit": "岁"},
            {"name": "stage", "type": "categorical", "label": "病理分期"},
            {"name": "lvi", "type": "categorical", "label": "脉管癌栓"},
        ],
        times=[12, 36, 60], time_labels=["1年生存率", "3年生存率", "5年生存率"],
        title="术后生存预测（合成数据）",
    )
    check_config(cfg_cox, "Cox")
    with open(os.path.join(OUT_DIR, "cox_nomogram.json"), "w", encoding="utf-8") as f:
        json.dump(cfg_cox, f, ensure_ascii=False, indent=2)

    # 抽样展示一条结局轴
    print("\nCox 5年生存率 锚点（总分→概率）:")
    for a in cfg_cox["outcomes"][2]["anchors"]:
        print(f"   总分 {a['totalPoints']:6.1f} → {a['prob']*100:5.1f}%")
    print(f"\n示例数据与结果已写入 {OUT_DIR}/")


if __name__ == "__main__":
    main()
