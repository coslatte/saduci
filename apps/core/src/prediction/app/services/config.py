"""Env constants, diagnosis maps, feature orders, and thresholds."""
from __future__ import annotations

import os

from shared_core.security import SECRET_KEY


PLATFORM_FEATURE_ORDER = [
    ("edad", "Edad", "Edad"),
    ("diag_ing1", "Diag.Ing1", "Diag. ingreso 1"),
    ("diag_ing2", "Diag.Ing2", "Diag. ingreso 2"),
    ("diag_egr2", "Diag.Egr2", "Diag. egreso 2"),
    ("apache", "APACHE", "APACHE II"),
    ("tiempo_vam", "TiempoVAM", "Tiempo de ventilación"),
]

PLATFORM_FEATURE_NAMES = [feature_name for _, _, feature_name in PLATFORM_FEATURE_ORDER]

PLATFORM_LIMITS = {
    "edad": (14, 61),
    "diag_ing1": (1, 20),
    # Must mirror PlatformPredictionRequest exactly: these pairs derive the
    # baseline used to perturb a feature when explaining a prediction. A range
    # wider than the schema allows produced a baseline (106 for diag_ing2) that
    # the model never sees, biasing every SHAP/LIME attribution.
    "diag_ing2": (0, 40),
    "diag_egr2": (18, 40),
    "apache": (18, 40),
    "tiempo_vam": (18, 40),
}

DIAGNOSIS_CODE_DATA = """
0=Empty
1=Exogenous intoxication
2=Coma
3=Severe traumatic brain injury
4=Post-thoracotomy
5=Post-laparotomy
6=Post-amputation
7=Post-neurology surgery
8=Recovered cardiac arrest
9=Metabolic encephalopathy
10=Hypoxic encephalopathy
11=Incomplete hanging
12=Decompensated heart failure
13=Severe obstetric condition
14=Decompensated COPD
15=ARDS
16=BNB-EH
17=BNB-IH
18=BNV
19=Myocarditis
20=Leptospirosis
21=Severe sepsis
22=DMO
23=Septic shock
24=Hypovolemic shock
25=Cardiogenic shock
26=Myocardial infarction
27=Polytrauma
28=Myasthenic crisis
29=Hypertensive emergency
30=Status asthmaticus
31=Status epilepticus
32=Pancreatitis
33=Fat embolism
34=Stroke
35=Sleep apnea syndrome
36=Digestive bleeding
37=Chronic renal failure
38=Acute renal failure
39=Renal transplant
40=Guillain-Barre
41=AV block
42=Obstetric embolism
43=Aspiration pneumonia
44=Neuroleptic malignant syndrome
45=Diabetic ketoacidosis
46=Meningitis
47=Pulmonary edema
48=Others
"""

PREDICTION_THRESHOLD = float(os.getenv("PREDICTION_THRESHOLD", "0.5"))
DEFAULT_NARRATIVE_PROVIDER = os.getenv("PREDICTION_NARRATIVE_PROVIDER", "stub").strip().lower()
DEFAULT_NARRATIVE_MODEL = os.getenv("PREDICTION_NARRATIVE_MODEL", "").strip()
LOCAL_LLM_API_URL = os.getenv("PREDICTION_LOCAL_LLM_URL", "").strip()
LOCAL_LLM_MODEL = os.getenv("PREDICTION_LOCAL_LLM_MODEL", "").strip()
LOCAL_LLM_API_TOKEN = os.getenv("PREDICTION_LOCAL_LLM_TOKEN", "").strip()
LOCAL_LLM_TIMEOUT_SECONDS = float(os.getenv("PREDICTION_LOCAL_LLM_TIMEOUT_SECONDS", "60"))
GEMINI_API_KEY = os.getenv("PREDICTION_GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("PREDICTION_GEMINI_MODEL", "gemini-2.5-flash").strip()
GEMINI_TIMEOUT_SECONDS = float(os.getenv("PREDICTION_GEMINI_TIMEOUT_SECONDS", "60"))
HUGGINGFACE_API_URL = os.getenv("HUGGINGFACE_API_URL", "").strip()
HUGGINGFACE_API_TOKEN = os.getenv("HUGGINGFACE_API_TOKEN", "").strip()
HUGGINGFACE_TIMEOUT_SECONDS = float(os.getenv("HUGGINGFACE_TIMEOUT_SECONDS", "30"))

GATEWAY_URL = os.getenv("GATEWAY_URL", "http://api-gateway:7000")
INTERNAL_EVENT_TOKEN = os.getenv("INTERNAL_EVENT_TOKEN", SECRET_KEY)

SUPPORTED_NARRATIVE_PROVIDERS = {"stub", "embedded", "local", "gemini", "huggingface"}


def parse_diagnosis_map(raw_mapping: str) -> dict[int, str]:
    mapping: dict[int, str] = {}
    for line in raw_mapping.strip().splitlines():
        left, right = line.strip().split("=", maxsplit=1)
        mapping[int(left)] = right.strip()
    return mapping


DIAGNOSIS_BY_CODE = parse_diagnosis_map(DIAGNOSIS_CODE_DATA)
