from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import io
import math
from typing import Optional

# ML imports
from sklearn.linear_model import LinearRegression, Ridge, LogisticRegression
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error, accuracy_score, classification_report, confusion_matrix
import warnings
warnings.filterwarnings("ignore")

app = FastAPI(title="Business Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"},
    )


def sanitize(obj):
    """Recursively replace NaN/Inf with None for JSON safety."""
    if isinstance(obj, dict):
        return {k: sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize(v) for v in obj]
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        v = float(obj)
        return None if (math.isnan(v) or math.isinf(v)) else v
    if isinstance(obj, np.ndarray):
        return sanitize(obj.tolist())
    return obj


def read_csv(file_bytes: bytes) -> pd.DataFrame:
    return pd.read_csv(io.BytesIO(file_bytes))


def detect_date_cols(df: pd.DataFrame) -> list[str]:
    date_keywords = ['date', 'time', 'year', 'month', 'day', 'period', 'quarter', 'week']
    found = []
    for col in df.columns:
        col_lower = col.lower()
        if any(kw in col_lower for kw in date_keywords):
            found.append(col)
            continue
        # Try parse
        if df[col].dtype == object:
            try:
                parsed = pd.to_datetime(df[col], errors='coerce')
                if parsed.notna().sum() / max(len(df), 1) > 0.7:
                    found.append(col)
            except Exception:
                pass
    return found


def is_id_col(df: pd.DataFrame, col: str) -> bool:
    """Return True if a column looks like an identifier and should be excluded from numeric analysis."""
    col_lower = col.lower().strip()
    # Exact match
    if col_lower in ('id', 'index', 'idx', 'key', 'ref', 'no', 'num', 'number', 'code', 'serial'):
        return True
    # Suffix / prefix patterns
    id_patterns = ('_id', '_code', '_key', '_ref', '_no', '_num', '_index', '_serial',
                   'id_', 'code_', 'key_', 'ref_', 'no_', 'num_')
    if any(col_lower.endswith(p) or col_lower.startswith(p) for p in id_patterns):
        return True
    # High-cardinality integer: >90 % unique values and column name contains an id hint
    if pd.api.types.is_integer_dtype(df[col]):
        uniqueness = df[col].nunique() / max(len(df), 1)
        if uniqueness > 0.9:
            return True
    return False


def detect_business_context(df: pd.DataFrame, numeric_cols: list[str], date_cols: list[str]) -> dict:
    revenue_kw = ['revenue', 'sales', 'income', 'turnover', 'gross', 'receipts']
    cost_kw    = ['cost', 'expense', 'spend', 'expenditure', 'overhead', 'cogs']
    profit_kw  = ['profit', 'margin', 'earnings', 'ebitda', 'net', 'gain']
    id_kw      = ['id', 'code', 'number', 'num', 'ref', 'key', 'index']

    revenue_cols = [c for c in numeric_cols if any(kw in c.lower() for kw in revenue_kw)]
    cost_cols    = [c for c in numeric_cols if any(kw in c.lower() for kw in cost_kw)]
    profit_cols  = [c for c in numeric_cols if any(kw in c.lower() for kw in profit_kw)]
    id_cols      = [c for c in df.columns   if any(kw in c.lower() for kw in id_kw)]

    date_col = date_cols[0] if date_cols else None

    return {
        "revenue_cols": revenue_cols,
        "cost_cols":    cost_cols,
        "profit_cols":  profit_cols,
        "date_col":     date_col,
        "id_cols":      id_cols,
    }


def compute_trends(df: pd.DataFrame, numeric_cols: list[str]) -> dict:
    trends = {}
    for col in numeric_cols:
        series = df[col].dropna()
        if len(series) < 3:
            trends[col] = {"direction": "flat", "strength": 0.0, "monotonic_pct": 0.0}
            continue
        vals = series.values
        diffs = np.diff(vals)
        pos = (diffs > 0).sum()
        neg = (diffs < 0).sum()
        total = len(diffs)
        if total == 0:
            trends[col] = {"direction": "flat", "strength": 0.0, "monotonic_pct": 0.0}
            continue
        mon_pct = float(max(pos, neg)) / total

        # Linear regression slope for direction
        x = np.arange(len(vals)).reshape(-1, 1)
        lr = LinearRegression().fit(x, vals)
        slope = lr.coef_[0]
        std_val = np.std(vals)
        strength = float(min(abs(slope) / (std_val + 1e-9), 1.0))

        if mon_pct > 0.65:
            direction = "up" if pos > neg else "down"
        else:
            direction = "flat"

        trends[col] = {
            "direction":    direction,
            "strength":     round(strength, 4),
            "monotonic_pct": round(mon_pct, 4),
        }
    return trends


def compute_health_score(df: pd.DataFrame, missing_total: int, duplicates: int) -> float:
    total_cells = df.shape[0] * df.shape[1]
    if total_cells == 0:
        return 0.0
    missing_pct   = missing_total / total_cells
    duplicate_pct = duplicates / max(len(df), 1)
    score = 100.0 * (1 - missing_pct * 0.6 - duplicate_pct * 0.4)
    return round(max(0.0, min(100.0, score)), 2)


def compute_anomalies(df: pd.DataFrame, numeric_cols: list[str]) -> dict:
    anomalies = {}
    for col in numeric_cols:
        series = df[col].dropna()
        if len(series) < 4:
            anomalies[col] = {"count": 0, "pct": 0.0, "indices": []}
            continue
        q1, q3 = series.quantile(0.25), series.quantile(0.75)
        iqr = q3 - q1
        lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        mask = (series < lower) | (series > upper)
        idx = mask[mask].index.tolist()[:50]  # cap at 50
        anomalies[col] = {
            "count":   int(mask.sum()),
            "pct":     round(float(mask.sum()) / len(series) * 100, 2),
            "indices": [int(i) for i in idx],
        }
    return anomalies


def compute_growth_rates(df: pd.DataFrame, numeric_cols: list[str], date_col: Optional[str]) -> dict:
    growth = {}
    for col in numeric_cols:
        series = df[col].dropna()
        mom, yoy = None, None

        if date_col and date_col in df.columns:
            try:
                temp = df[[date_col, col]].copy()
                temp[date_col] = pd.to_datetime(temp[date_col], errors='coerce')
                temp = temp.dropna(subset=[date_col])
                temp = temp.sort_values(date_col)
                if len(temp) >= 2:
                    # MoM: last vs second-to-last
                    last  = temp[col].iloc[-1]
                    prev  = temp[col].iloc[-2]
                    if prev != 0:
                        mom = round(float((last - prev) / abs(prev) * 100), 2)
                if len(temp) >= 13:
                    yoy_prev = temp[col].iloc[-13]
                    if yoy_prev and yoy_prev != 0:
                        yoy = round(float((last - yoy_prev) / abs(yoy_prev) * 100), 2)
            except Exception:
                pass
        else:
            if len(series) >= 2:
                last = series.iloc[-1]
                prev = series.iloc[-2]
                if prev and prev != 0:
                    mom = round(float((last - prev) / abs(prev) * 100), 2)

        growth[col] = {"mom": mom, "yoy": yoy}
    return growth


def generate_insights(
    df: pd.DataFrame, numeric_cols: list[str], cat_cols: list[str],
    date_cols: list[str], bc: dict, trends: dict, anomalies: dict,
    growth_rates: dict, health_score: float, missing_total: int, duplicates: int,
) -> dict:
    rows, cols_n = df.shape
    out: dict = {k: [] for k in ["overview", "trends", "kpi", "distributions", "correlations", "forecast", "segments", "ml"]}

    # --- Overview ---
    comp = 100 - (missing_total / max(rows * cols_n, 1) * 100)
    out["overview"].append(f"Dataset has {rows:,} rows and {cols_n} columns with {comp:.1f}% data completeness.")
    if health_score >= 90:
        out["overview"].append(f"Excellent data quality (score {health_score}%) — ready for analysis.")
    elif health_score >= 70:
        out["overview"].append(f"Good data quality (score {health_score}%) — some gaps exist but analysis is reliable.")
    else:
        out["overview"].append(f"Data quality needs attention (score {health_score}%) — clean missing values and duplicates before drawing conclusions.")
    if duplicates > 0:
        out["overview"].append(f"{duplicates:,} duplicate rows found ({duplicates/max(rows,1)*100:.1f}%) — removing them will improve accuracy.")
    up_c   = [c for c in numeric_cols if trends.get(c, {}).get("direction") == "up"]
    down_c = [c for c in numeric_cols if trends.get(c, {}).get("direction") == "down"]
    if up_c:   out["overview"].append(f"{len(up_c)} metric(s) are growing: {', '.join(up_c[:3])}.")
    if down_c: out["overview"].append(f"{len(down_c)} metric(s) are declining: {', '.join(down_c[:3])}.")

    # --- Trends ---
    if not numeric_cols:
        out["trends"].append("No numeric columns available for trend analysis.")
    else:
        strong_up   = [c for c in numeric_cols if trends.get(c,{}).get("direction")=="up"   and trends.get(c,{}).get("strength",0)>0.5]
        strong_down = [c for c in numeric_cols if trends.get(c,{}).get("direction")=="down" and trends.get(c,{}).get("strength",0)>0.5]
        flat_c      = [c for c in numeric_cols if trends.get(c,{}).get("direction")=="flat"]
        if strong_up:   out["trends"].append(f"Strong upward trend in: {', '.join(strong_up[:3])} — consistent growth detected.")
        if strong_down: out["trends"].append(f"Strong downward trend in: {', '.join(strong_down[:3])} — worth investigating.")
        if flat_c:      out["trends"].append(f"{len(flat_c)} metric(s) are stable with no clear direction.")
        out["trends"].append("Trend strength shows how consistently a metric moves — 100% means perfectly monotonic.")

    # --- KPI ---
    if bc["revenue_cols"]:
        rc = bc["revenue_cols"][0]
        d  = trends.get(rc, {}).get("direction", "flat")
        out["kpi"].append(f"{'↑ Revenue is growing' if d=='up' else '↓ Revenue is declining' if d=='down' else '→ Revenue is stable'} ({rc}).")
    if bc["profit_cols"] and bc["cost_cols"]:
        out["kpi"].append("Compare profit and cost trends — if costs grow faster than profit, margins are shrinking.")
    if not bc["revenue_cols"] and not bc["profit_cols"]:
        out["kpi"].append("No revenue or profit columns detected — select your most important business metric.")
    out["kpi"].append("Moving average smooths noise so you can see the real underlying trend.")

    # --- Distributions ---
    skewed = []
    for col in numeric_cols[:10]:
        s = df[col].dropna()
        if len(s) > 10 and s.mean() != 0 and abs(s.mean()-s.median())/abs(s.mean()) > 0.2:
            skewed.append(col)
    if skewed: out["distributions"].append(f"Skewed distribution detected in: {', '.join(skewed[:3])} — mean and median differ significantly.")
    high_anom = [(c, anomalies[c]["pct"]) for c in numeric_cols if anomalies.get(c,{}).get("pct",0) > 5]
    if high_anom:
        c, p = high_anom[0]
        out["distributions"].append(f"{c} has {p:.1f}% outliers — unusual values that may distort averages.")
    if not skewed and not high_anom:
        out["distributions"].append("Distributions look well-behaved — no major skewness or outlier concentration.")
    out["distributions"].append("Histograms show how frequently values fall in each range — tall bars = common values.")

    # --- Correlations ---
    if len(numeric_cols) < 2:
        out["correlations"].append("Need at least 2 numeric columns to compute correlations.")
    else:
        out["correlations"].append("Correlation close to +1: two metrics rise and fall together.")
        out["correlations"].append("Correlation close to -1: when one goes up, the other goes down.")
        out["correlations"].append("Correlation near 0: no meaningful relationship between the two metrics.")
        if bc["revenue_cols"] and bc["cost_cols"]:
            out["correlations"].append("Key insight: check if revenue and cost are correlated — high correlation means costs scale with sales.")

    # --- Forecast ---
    if bc["revenue_cols"]:
        out["forecast"].append(f"Forecasting {bc['revenue_cols'][0]} — your primary revenue metric.")
    out["forecast"].append("Dashed line shows the projected future values based on historical trend.")
    out["forecast"].append("Shaded band is the 95% confidence interval — wider band = more uncertainty in the forecast.")
    if rows < 30:
        out["forecast"].append(f"Only {rows} data points — forecast is less reliable. More historical data improves accuracy.")

    # --- Segments ---
    out["segments"].append("Segments group similar records — useful for finding customer tiers or product categories.")
    out["segments"].append("High Value segment: records with above-average metrics across the board.")
    out["segments"].append("Leave clusters on Auto — the algorithm finds the natural number of groups in your data.")

    # --- ML ---
    if bc["profit_cols"]:
        out["ml"].append(f"Recommended target: {bc['profit_cols'][0]} — predict future profit from other metrics.")
    elif cat_cols:
        out["ml"].append(f"Recommended target: {cat_cols[0]} — classify records into categories.")
    out["ml"].append("R² close to 1.0 means excellent predictive power. Below 0.5 means the model struggles.")
    out["ml"].append("Feature importance: the higher a column ranks, the more it drives the prediction.")

    return out


def recommend_columns(df: pd.DataFrame, numeric_cols: list[str], cat_cols: list[str], date_cols: list[str], bc: dict) -> dict:
    def dedup(*lists):
        seen: list[str] = []
        for lst in lists:
            for c in lst:
                if c not in seen:
                    seen.append(c)
        return seen

    kpi_cols     = dedup(bc["revenue_cols"], bc["profit_cols"], bc["cost_cols"], numeric_cols)[:5]
    forecast_cols= dedup(bc["revenue_cols"], bc["profit_cols"], numeric_cols)[:8]
    seg_cols     = [c for c in dedup(bc["revenue_cols"], bc["cost_cols"], bc["profit_cols"], numeric_cols) if df[c].std() > 0][:6]

    if numeric_cols:
        top_var   = df[numeric_cols].var().nlargest(10).index.tolist()
    else:
        top_var   = []

    ml_targets   = [c for c in (cat_cols + numeric_cols) if c not in date_cols]
    ml_default   = dedup(bc["profit_cols"], bc["revenue_cols"], cat_cols, numeric_cols)
    ml_default   = ml_default[0] if ml_default else (numeric_cols[-1] if numeric_cols else "")

    return {
        "kpi":              kpi_cols,
        "forecast":         forecast_cols,
        "segments":         seg_cols,
        "distributions_num": numeric_cols[:10],
        "distributions_cat": cat_cols[:5],
        "correlations":     top_var,
        "ml_targets":       ml_targets,
        "ml_default_target": ml_default,
    }


def name_clusters(profiles: dict, cols: list[str]) -> dict:
    """Replace 'Cluster N' keys with descriptive names based on relative values."""
    if not cols:
        return profiles
    # Compute per-cluster score (sum of z-scores across cols)
    col_means = {}
    col_stds  = {}
    for col in cols:
        vals = [float(p.get(col) or 0) for p in profiles.values()]
        col_means[col] = sum(vals) / max(len(vals), 1)
        variance = sum((v - col_means[col]) ** 2 for v in vals) / max(len(vals), 1)
        col_stds[col]  = variance ** 0.5 or 1

    scores = {}
    for name, profile in profiles.items():
        score = sum((float(profile.get(col) or 0) - col_means[col]) / col_stds[col] for col in cols)
        scores[name] = score

    ranked = sorted(scores.keys(), key=lambda k: scores[k], reverse=True)
    n = len(ranked)
    labels = ["High Value", "Growth", "Core", "Basic", "At Risk", "Entry Level"]
    if n == 2:
        labels = ["High Value", "Growth Opportunity"]
    elif n == 3:
        labels = ["High Value", "Core Segment", "At Risk"]

    renamed: dict = {}
    for i, old_key in enumerate(ranked):
        new_key = labels[i] if i < len(labels) else f"Segment {i+1}"
        renamed[new_key] = profiles[old_key]
    return renamed


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    try:
        if not (file.filename or "").lower().endswith(".csv"):
            return JSONResponse(status_code=400, content={"detail": "Only CSV files are supported. Please upload a .csv file."})
        raw = await file.read()
        if len(raw) > 20 * 1024 * 1024:
            return JSONResponse(status_code=413, content={
                "detail": "File is too large (max 20 MB). Try removing unused columns or filtering rows before uploading."
            })
        df  = read_csv(raw)

        # Basic info
        shape   = list(df.shape)
        columns = list(df.columns)
        dtypes  = {c: str(df[c].dtype) for c in columns}

        # Column classification
        numeric_cols = [c for c in columns if pd.api.types.is_numeric_dtype(df[c]) and not is_id_col(df, c)]
        cat_cols     = [c for c in columns if not pd.api.types.is_numeric_dtype(df[c])]
        date_cols    = detect_date_cols(df)

        # Missing / duplicates
        missing       = {c: int(df[c].isna().sum()) for c in columns}
        missing_total = int(sum(missing.values()))
        duplicates    = int(df.duplicated().sum())
        complete_rows = int((~df.isnull().any(axis=1)).sum())
        memory_mb     = round(df.memory_usage(deep=True).sum() / 1e6, 4)

        # Preview / sample
        preview = df.head(10).replace({np.nan: None, np.inf: None, -np.inf: None}).to_dict(orient="records")
        sample  = df.head(500).replace({np.nan: None, np.inf: None, -np.inf: None}).to_dict(orient="records")

        # Statistics
        statistics: dict = {}
        for col in numeric_cols:
            desc = df[col].describe()
            statistics[col] = {k: sanitize(v) for k, v in desc.to_dict().items()}

        # Cat summary
        cat_summary: dict = {}
        for col in cat_cols[:10]:
            vc = df[col].value_counts().head(10)
            cat_summary[col] = {str(k): int(v) for k, v in vc.items()}

        # Business context
        business_context = detect_business_context(df, numeric_cols, date_cols)

        # Trends
        trends = compute_trends(df, numeric_cols[:20])

        # Health score
        health_score = compute_health_score(df, missing_total, duplicates)

        # Anomalies
        anomalies = compute_anomalies(df, numeric_cols[:20])

        # Growth rates
        growth_rates = compute_growth_rates(df, numeric_cols[:20], business_context["date_col"])

        # Plain English insights per tab
        insights = generate_insights(
            df, numeric_cols, cat_cols, date_cols, business_context,
            trends, anomalies, growth_rates, health_score, missing_total, duplicates,
        )

        # Smart column recommendations per feature
        recommendations = recommend_columns(df, numeric_cols, cat_cols, date_cols, business_context)

        return sanitize({
            "shape":            shape,
            "columns":          columns,
            "dtypes":           dtypes,
            "preview":          preview,
            "sample":           sample,
            "missing":          missing,
            "missing_total":    missing_total,
            "duplicates":       duplicates,
            "complete_rows":    complete_rows,
            "memory_mb":        memory_mb,
            "numeric_cols":     numeric_cols,
            "cat_cols":         cat_cols,
            "date_cols":        date_cols,
            "statistics":       statistics,
            "cat_summary":      cat_summary,
            "business_context": business_context,
            "trends":           trends,
            "health_score":     health_score,
            "anomalies":        anomalies,
            "growth_rates":     growth_rates,
            "insights":         insights,
            "recommendations":  recommendations,
        })

    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})


@app.post("/kpi")
async def kpi(
    file:    UploadFile = File(...),
    columns: str        = Form(...),
    window:  int        = Form(3),
):
    try:
        raw  = await file.read()
        df   = read_csv(raw)
        cols = [c.strip() for c in columns.split(",") if c.strip() in df.columns]

        result: dict = {}
        for col in cols:
            series = df[col].dropna().reset_index(drop=True)
            vals   = series.values.tolist()

            # Moving average
            ma = pd.Series(vals).rolling(window=window, min_periods=1).mean().tolist()

            # Trend line (linear regression)
            x = np.arange(len(vals)).reshape(-1, 1)
            lr = LinearRegression().fit(x, np.array(vals))
            trend_line = lr.predict(x).tolist()

            # Period-over-period growth %
            growth = []
            for i in range(1, len(vals)):
                prev = vals[i - 1]
                curr = vals[i]
                if prev and prev != 0:
                    growth.append(round((curr - prev) / abs(prev) * 100, 2))
                else:
                    growth.append(None)

            result[col] = {
                "values":     sanitize(vals),
                "moving_avg": sanitize(ma),
                "trend_line": sanitize(trend_line),
                "growth_pct": sanitize(growth),
                "mean":       sanitize(float(np.mean(vals))),
                "total":      sanitize(float(np.sum(vals))),
                "min":        sanitize(float(np.min(vals))),
                "max":        sanitize(float(np.max(vals))),
            }

        return sanitize(result)

    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})


@app.post("/forecast")
async def forecast(
    file:       UploadFile = File(...),
    target_col: str        = Form(...),
    periods:    int        = Form(12),
):
    try:
        if not (file.filename or "").lower().endswith(".csv"):
            return JSONResponse(status_code=400, content={"detail": "Only CSV files are supported."})
        # Cap periods to prevent oversized responses and unreliable extrapolation
        periods = max(1, min(periods, 60))

        raw = await file.read()
        df  = read_csv(raw)

        if target_col not in df.columns:
            return JSONResponse(status_code=400, content={"detail": f"Column '{target_col}' not found"})

        series = df[target_col].dropna().reset_index(drop=True)
        vals   = series.values
        n      = len(vals)

        if n < 3:
            return JSONResponse(status_code=400, content={"detail": "Need at least 3 data points to forecast"})

        x = np.arange(n).reshape(-1, 1)

        # Fit polynomial degree 2 if enough points, else linear
        if n >= 10:
            coeffs = np.polyfit(np.arange(n), vals, deg=2)
            poly   = np.poly1d(coeffs)
            hist_pred = poly(np.arange(n))
            fut_x     = np.arange(n, n + periods)
            fut_pred  = poly(fut_x)
        else:
            lr = LinearRegression().fit(x, vals)
            hist_pred = lr.predict(x)
            fut_pred  = lr.predict(np.arange(n, n + periods).reshape(-1, 1))

        # Residual std for confidence bands
        residuals = vals - hist_pred
        std_res   = float(np.std(residuals))

        # Warn when forecast horizon is large relative to history
        low_confidence = periods > n // 2

        historical = [{"index": int(i), "value": sanitize(float(vals[i])), "fitted": sanitize(float(hist_pred[i]))} for i in range(n)]
        forecasted = [
            {
                "index":   int(n + i),
                "value":   sanitize(float(fut_pred[i])),
                "lower":   sanitize(float(fut_pred[i] - 1.96 * std_res)),
                "upper":   sanitize(float(fut_pred[i] + 1.96 * std_res)),
            }
            for i in range(periods)
        ]

        return sanitize({
            "target_col":     target_col,
            "historical":     historical,
            "forecasted":     forecasted,
            "std_residual":   std_res,
            "low_confidence": low_confidence,
        })

    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})


@app.post("/segment")
async def segment(
    file:       UploadFile = File(...),
    columns:    str        = Form(...),
    n_clusters: int        = Form(0),
):
    try:
        raw  = await file.read()
        df   = read_csv(raw)
        cols = [c.strip() for c in columns.split(",") if c.strip() in df.columns]

        if not cols:
            return JSONResponse(status_code=400, content={"detail": "No valid columns provided"})

        X = df[cols].dropna()
        if len(X) < 3:
            return JSONResponse(status_code=400, content={"detail": "Not enough data rows for clustering"})

        scaler   = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        # Find optimal k via elbow if auto
        max_k = min(6, len(X) - 1)
        if n_clusters == 0:
            inertias = []
            k_range  = range(2, max_k + 1)
            for k in k_range:
                km = KMeans(n_clusters=k, random_state=42, n_init=10)
                km.fit(X_scaled)
                inertias.append(km.inertia_)
            # Simple elbow: biggest drop
            if len(inertias) > 1:
                drops   = [inertias[i] - inertias[i + 1] for i in range(len(inertias) - 1)]
                optimal = list(k_range)[int(np.argmax(drops))]
            else:
                optimal = 2
            n_clusters = optimal
        else:
            n_clusters = max(2, min(n_clusters, max_k))

        km = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = km.fit_predict(X_scaled)

        X_out = X.copy()
        X_out["_cluster"] = labels

        # Cluster profiles: mean per cluster
        profiles = {}
        for k in range(n_clusters):
            mask = labels == k
            profiles[f"Cluster {k}"] = {
                col: sanitize(float(X[col].values[mask].mean())) for col in cols
            }
            profiles[f"Cluster {k}"]["count"] = int(mask.sum())
            profiles[f"Cluster {k}"]["pct"]   = round(float(mask.sum()) / len(X) * 100, 2)

        named_profiles = name_clusters(profiles, cols)

        return sanitize({
            "n_clusters":   n_clusters,
            "labels":       labels.tolist(),
            "profiles":     named_profiles,
            "columns_used": cols,
            "sample_data":  X_out.head(300).replace({np.nan: None}).to_dict(orient="records"),
        })

    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})


@app.post("/train")
async def train(
    file:      UploadFile = File(...),
    target:    str        = Form(...),
    algorithm: str        = Form(...),
    test_size: float      = Form(0.2),
):
    try:
        raw = await file.read()
        df  = read_csv(raw)

        if target not in df.columns:
            return JSONResponse(status_code=400, content={"detail": f"Target '{target}' not found"})

        y       = df[target].dropna()
        df_     = df.loc[y.index].copy()
        y       = df_[target]
        feature_cols = [c for c in df_.columns if c != target]

        # Encode categoricals
        X = df_[feature_cols].copy()
        for col in X.select_dtypes(include=["object"]).columns:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))
        X = X.fillna(X.median(numeric_only=True))

        is_numeric_target = pd.api.types.is_numeric_dtype(y)
        if not is_numeric_target:
            le = LabelEncoder()
            y  = le.fit_transform(y.astype(str))
            problem_type = "classification"
        else:
            y = y.values
            unique_vals = len(np.unique(y))
            problem_type = "regression" if unique_vals > 10 else ("classification" if unique_vals <= 10 else "regression")

        X_arr = X.values
        X_train, X_test, y_train, y_test = train_test_split(X_arr, y, test_size=test_size, random_state=42)

        algo_map_reg = {
            "Linear Regression":   LinearRegression(),
            "Ridge Regression":    Ridge(),
            "Decision Tree":       DecisionTreeRegressor(random_state=42),
            "Random Forest":       RandomForestRegressor(n_estimators=100, random_state=42),
            "Gradient Boosting":   GradientBoostingRegressor(random_state=42),
        }
        algo_map_cls = {
            "Logistic Regression": LogisticRegression(max_iter=500, random_state=42),
            "Decision Tree":       DecisionTreeClassifier(random_state=42),
            "Random Forest":       RandomForestClassifier(n_estimators=100, random_state=42),
            "Gradient Boosting":   GradientBoostingClassifier(random_state=42),
        }

        if problem_type == "regression":
            model = algo_map_reg.get(algorithm, RandomForestRegressor(n_estimators=100, random_state=42))
        else:
            model = algo_map_cls.get(algorithm, RandomForestClassifier(n_estimators=100, random_state=42))

        model.fit(X_train, y_train)
        preds = model.predict(X_test)

        metrics: dict = {}
        avp    = None
        cls_report = None
        conf_mat   = None
        feat_imp   = None

        if problem_type == "regression":
            metrics["r2"]   = sanitize(round(float(r2_score(y_test, preds)), 4))
            metrics["rmse"] = sanitize(round(float(np.sqrt(mean_squared_error(y_test, preds))), 4))
            metrics["mae"]  = sanitize(round(float(mean_absolute_error(y_test, preds)), 4))
            avp = {"actual": sanitize(y_test.tolist()), "predicted": sanitize(preds.tolist())}
        else:
            metrics["accuracy"] = sanitize(round(float(accuracy_score(y_test, preds)), 4))
            cls_report = sanitize({str(k): v for k, v in classification_report(y_test, preds, output_dict=True).items()})
            conf_mat   = sanitize(confusion_matrix(y_test, preds).tolist())

        # Feature importance
        if hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
            pairs       = sorted(zip(feature_cols, importances.tolist()), key=lambda x: x[1], reverse=True)[:20]
            feats, scores = zip(*pairs)
            cumulative = np.cumsum(scores).tolist()
            feat_imp = {"features": list(feats), "scores": sanitize(list(scores)), "cumulative": sanitize(cumulative)}
        elif hasattr(model, "coef_"):
            coef = model.coef_.flatten() if model.coef_.ndim > 1 else model.coef_
            pairs = sorted(zip(feature_cols, np.abs(coef).tolist()), key=lambda x: x[1], reverse=True)[:20]
            feats, scores = zip(*pairs)
            cumulative = np.cumsum(list(scores)).tolist()
            feat_imp = {"features": list(feats), "scores": sanitize(list(scores)), "cumulative": sanitize(cumulative)}

        return sanitize({
            "algorithm":               algorithm,
            "problem_type":            problem_type,
            "train_samples":           int(len(X_train)),
            "test_samples":            int(len(X_test)),
            "features":                int(X_arr.shape[1]),
            "metrics":                 metrics,
            "actual_vs_predicted":     avp,
            "classification_report":   cls_report,
            "confusion_matrix":        conf_mat,
            "feature_importance":      feat_imp,
        })

    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})


@app.post("/insights")
async def insights(file: UploadFile = File(...)):
    try:
        raw = await file.read()
        df  = read_csv(raw)

        texts: list[str] = []
        columns    = list(df.columns)
        numeric_cols = [c for c in columns if pd.api.types.is_numeric_dtype(df[c]) and not is_id_col(df, c)]
        n_rows, n_cols = df.shape

        texts.append(f"Dataset has {n_rows:,} rows and {n_cols} columns.")

        # Missing
        missing_cols = [(c, int(df[c].isna().sum())) for c in columns if df[c].isna().sum() > 0]
        heavy_missing = [(c, m) for c, m in missing_cols if m / n_rows > 0.1]
        if heavy_missing:
            names = ", ".join(c for c, _ in heavy_missing[:3])
            texts.append(f"{len(heavy_missing)} column(s) have more than 10% missing values: {names}.")
        else:
            texts.append("No columns have more than 10% missing values — data completeness is good.")

        # Duplicates
        dups = int(df.duplicated().sum())
        if dups > 0:
            texts.append(f"{dups:,} duplicate rows detected ({dups/n_rows*100:.1f}% of data).")

        # Growth on numeric cols
        for col in numeric_cols[:5]:
            series = df[col].dropna()
            if len(series) >= 2:
                first, last = float(series.iloc[0]), float(series.iloc[-1])
                if first != 0:
                    pct = (last - first) / abs(first) * 100
                    direction = "grown" if pct > 0 else "declined"
                    texts.append(f"{col} has {direction} {abs(pct):.1f}% from first to last record.")

        # Correlations
        if len(numeric_cols) >= 2:
            corr_matrix = df[numeric_cols].corr()
            pairs = []
            for i in range(len(numeric_cols)):
                for j in range(i + 1, len(numeric_cols)):
                    v = corr_matrix.iloc[i, j]
                    if pd.notna(v):
                        pairs.append((numeric_cols[i], numeric_cols[j], float(v)))
            pairs.sort(key=lambda x: abs(x[2]), reverse=True)
            if pairs:
                c1, c2, cv = pairs[0]
                direction = "positive" if cv > 0 else "negative"
                texts.append(f"Strong {direction} correlation between {c1} and {c2} ({cv:.2f}).")

        # Anomalies
        for col in numeric_cols[:5]:
            series = df[col].dropna()
            if len(series) < 4:
                continue
            q1, q3 = series.quantile(0.25), series.quantile(0.75)
            iqr    = q3 - q1
            outliers = ((series < q1 - 1.5 * iqr) | (series > q3 + 1.5 * iqr)).sum()
            if outliers > 0:
                texts.append(f"{col} has {int(outliers)} outlier(s) detected via IQR method ({outliers/len(series)*100:.1f}%).")

        # Business context
        revenue_kw = ['revenue', 'sales', 'income']
        cost_kw    = ['cost', 'expense', 'spend']
        rev_cols   = [c for c in numeric_cols if any(kw in c.lower() for kw in revenue_kw)]
        cost_cols_ = [c for c in numeric_cols if any(kw in c.lower() for kw in cost_kw)]
        if rev_cols and cost_cols_:
            texts.append(f"Business context detected: {len(rev_cols)} revenue column(s) and {len(cost_cols_)} cost column(s) found.")

        return sanitize({"insights": texts})

    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})


@app.post("/correlations")
async def correlations(file: UploadFile = File(...)):
    try:
        raw  = await file.read()
        df   = read_csv(raw)
        num_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c]) and not is_id_col(df, c)]

        if len(num_cols) < 2:
            return {"original": {"columns": [], "matrix": []}, "cleaned": {"columns": [], "matrix": []}, "pairs": []}

        orig_corr = df[num_cols].corr()
        df_clean  = df[num_cols].dropna()
        cln_corr  = df_clean.corr()

        def matrix_out(corr_df: pd.DataFrame) -> dict:
            cols = list(corr_df.columns)
            mat  = [[sanitize(corr_df.iloc[i, j]) for j in range(len(cols))] for i in range(len(cols))]
            return {"columns": cols, "matrix": mat}

        # Top pairs
        pairs = []
        for i in range(len(num_cols)):
            for j in range(i + 1, len(num_cols)):
                v = cln_corr.iloc[i, j]
                if pd.notna(v):
                    pairs.append({"feature1": num_cols[i], "feature2": num_cols[j], "correlation": sanitize(round(float(v), 4))})
        pairs.sort(key=lambda x: abs(x["correlation"] or 0), reverse=True)

        return sanitize({
            "original": matrix_out(orig_corr),
            "cleaned":  matrix_out(cln_corr),
            "pairs":    pairs[:20],
        })

    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})
