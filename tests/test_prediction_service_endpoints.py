"""Comprehensive tests for the Prediction Service REST API."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from tests.conftest import load_module_from_path


def _prediction_client() -> TestClient:
    """Returns a TestClient backed by a thread-safe in-memory SQLite database.

    Uses StaticPool so that all threads (including the ASGI worker) share a
    single connection and therefore the same in-memory database and its tables.
    """
    module = load_module_from_path(
        "prediction_endpoints_test",
        "services/prediction/main.py",
        env={"DATABASE_URL": "sqlite:///:memory:"},
    )
    _engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    module.Base.metadata.create_all(bind=_engine)
    _Session = sessionmaker(autocommit=False, autoflush=False, bind=_engine)

    def _override_get_db():
        db = _Session()
        try:
            yield db
        finally:
            db.close()

    module.app.dependency_overrides[module.get_db] = _override_get_db
    return TestClient(module.app)


# ─── Models catalogue ─────────────────────────────────────────────────────────


def test_list_models_returns_three_models() -> None:
    response = _prediction_client().get("/models")

    assert response.status_code == 200
    names = {m["name"] for m in response.json()["models"]}
    assert names == {"mortality_risk", "length_of_stay", "readmission_risk"}


def test_each_model_has_required_features_listed() -> None:
    response = _prediction_client().get("/models")

    for model in response.json()["models"]:
        assert "required_features" in model
        assert len(model["required_features"]) > 0


def test_each_model_has_description() -> None:
    response = _prediction_client().get("/models")

    for model in response.json()["models"]:
        assert "description" in model and model["description"]


# ─── Mortality risk ───────────────────────────────────────────────────────────


def test_mortality_risk_prediction_returns_expected_structure() -> None:
    client = _prediction_client()
    payload = {
        "patient_id": "PT-M001",
        "model_name": "mortality_risk",
        "features": {"age": 60, "severity_score": 7},
    }

    response = client.post("/predictions", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert "risk_score" in body["prediction"]
    assert body["prediction"]["risk_level"] in {"low", "medium", "high"}
    assert 0.0 <= body["confidence"] <= 1.0


def test_mortality_risk_young_healthy_patient_is_low_risk() -> None:
    client = _prediction_client()

    response = client.post(
        "/predictions",
        json={
            "patient_id": "PT-LOW",
            "model_name": "mortality_risk",
            "features": {"age": 20, "severity_score": 1},
        },
    )

    assert response.json()["prediction"]["risk_level"] == "low"


def test_mortality_risk_elderly_critical_patient_is_high_risk() -> None:
    client = _prediction_client()

    response = client.post(
        "/predictions",
        json={
            "patient_id": "PT-HIGH",
            "model_name": "mortality_risk",
            "features": {"age": 95, "severity_score": 10},
        },
    )

    assert response.json()["prediction"]["risk_level"] == "high"


def test_mortality_risk_score_is_within_range() -> None:
    client = _prediction_client()

    response = client.post(
        "/predictions",
        json={
            "patient_id": "PT-RANGE",
            "model_name": "mortality_risk",
            "features": {"age": 50, "severity_score": 5},
        },
    )

    score = response.json()["prediction"]["risk_score"]
    assert 0.0 <= score <= 1.0


# ─── Length of stay ───────────────────────────────────────────────────────────


def test_length_of_stay_returns_predicted_days() -> None:
    client = _prediction_client()

    response = client.post(
        "/predictions",
        json={
            "patient_id": "PT-LOS",
            "model_name": "length_of_stay",
            "features": {"age": 40, "severity_score": 6},
        },
    )

    assert response.status_code == 200
    assert "predicted_days" in response.json()["prediction"]


def test_length_of_stay_deterministic_for_same_input() -> None:
    """The same features must always produce the same number of predicted days."""
    client = _prediction_client()
    payload = {
        "patient_id": "PT-DET",
        "model_name": "length_of_stay",
        "features": {"age": 55, "severity_score": 4},
    }

    r1 = client.post("/predictions", json=payload).json()["prediction"]["predicted_days"]
    r2 = client.post("/predictions", json={**payload, "patient_id": "PT-DET2"}).json()[
        "prediction"
    ]["predicted_days"]

    assert r1 == r2


def test_length_of_stay_higher_severity_gives_more_days() -> None:
    client = _prediction_client()

    low_days = client.post(
        "/predictions",
        json={"patient_id": "PT-LOS-L", "model_name": "length_of_stay", "features": {"age": 50, "severity_score": 2}},
    ).json()["prediction"]["predicted_days"]

    high_days = client.post(
        "/predictions",
        json={"patient_id": "PT-LOS-H", "model_name": "length_of_stay", "features": {"age": 50, "severity_score": 9}},
    ).json()["prediction"]["predicted_days"]

    assert high_days > low_days


# ─── Readmission risk ─────────────────────────────────────────────────────────


def test_readmission_risk_returns_expected_structure() -> None:
    client = _prediction_client()

    response = client.post(
        "/predictions",
        json={
            "patient_id": "PT-RA",
            "model_name": "readmission_risk",
            "features": {"age": 60, "comorbidities": 3},
        },
    )

    assert response.status_code == 200
    pred = response.json()["prediction"]
    assert 0.0 <= pred["risk_score"] <= 1.0
    assert pred["risk_level"] in {"low", "medium", "high"}


def test_readmission_risk_more_comorbidities_raises_risk_score() -> None:
    client = _prediction_client()

    low = client.post(
        "/predictions",
        json={"patient_id": "PT-RA-L", "model_name": "readmission_risk", "features": {"age": 40, "comorbidities": 0}},
    ).json()["prediction"]["risk_score"]

    high = client.post(
        "/predictions",
        json={"patient_id": "PT-RA-H", "model_name": "readmission_risk", "features": {"age": 40, "comorbidities": 5}},
    ).json()["prediction"]["risk_score"]

    assert high > low


# ─── Unknown model ────────────────────────────────────────────────────────────


def test_unknown_model_returns_fallback_result() -> None:
    client = _prediction_client()

    response = client.post(
        "/predictions",
        json={"patient_id": "PT-UNK", "model_name": "non_existent_model", "features": {}},
    )

    assert response.status_code == 200
    assert response.json()["prediction"] == {"result": "unknown_model"}


def test_unknown_model_confidence_is_zero() -> None:
    client = _prediction_client()

    response = client.post(
        "/predictions",
        json={"patient_id": "PT-CONF0", "model_name": "unknown", "features": {}},
    )

    assert response.json()["confidence"] == 0.0


# ─── Predictions history ──────────────────────────────────────────────────────


def test_get_predictions_for_patient_with_no_records_returns_empty_list() -> None:
    client = _prediction_client()

    response = client.get("/predictions/NO_RECORD_PATIENT")

    assert response.status_code == 200
    assert response.json()["predictions"] == []


def test_get_predictions_returns_all_stored_records_for_that_patient() -> None:
    client = _prediction_client()
    patient_id = "PT-MULTI"
    for model in ["mortality_risk", "length_of_stay", "readmission_risk"]:
        client.post(
            "/predictions",
            json={
                "patient_id": patient_id,
                "model_name": model,
                "features": {"age": 50, "severity_score": 5, "comorbidities": 2},
            },
        )

    response = client.get(f"/predictions/{patient_id}")

    assert response.status_code == 200
    records = response.json()["predictions"]
    assert len(records) == 3
    model_names = {r["model_name"] for r in records}
    assert model_names == {"mortality_risk", "length_of_stay", "readmission_risk"}


def test_get_predictions_does_not_return_other_patients_data() -> None:
    client = _prediction_client()
    client.post(
        "/predictions",
        json={"patient_id": "PT-A", "model_name": "mortality_risk", "features": {"age": 50, "severity_score": 5}},
    )

    response = client.get("/predictions/PT-B")

    assert response.json()["predictions"] == []


def test_prediction_response_includes_timestamp() -> None:
    client = _prediction_client()

    response = client.post(
        "/predictions",
        json={"patient_id": "PT-TS", "model_name": "mortality_risk", "features": {"age": 45, "severity_score": 3}},
    )

    assert "timestamp" in response.json()
    assert response.json()["timestamp"]  # non-empty


# ─── Risk level boundaries (unit) ─────────────────────────────────────────────


@pytest.mark.parametrize(
    "age,severity,expected_level",
    [
        (20, 1, "low"),    # risk ≈ 0.15 → low
        (50, 5, "medium"), # risk ≈ 0.50 → medium
        (90, 10, "high"),  # risk ≈ 0.86 → high
    ],
)
def test_risk_level_boundaries(age, severity, expected_level) -> None:
    module = load_module_from_path(
        "prediction_risk_boundary_test",
        "services/prediction/main.py",
        env={"DATABASE_URL": "sqlite:///:memory:"},
    )
    model = module.DummyMLModel("mortality_risk")

    prediction, _ = model.predict({"age": age, "severity_score": severity})

    assert prediction["risk_level"] == expected_level


# ─── Platform-compatible prediction endpoints ────────────────────────────────


_PLATFORM_PAYLOAD = {
    "edad": 40,
    "diag_ing1": 8,
    "diag_ing2": 90,
    "diag_egr2": 27,
    "apache": 28,
    "tiempo_vam": 26,
}


def test_platform_prediccion_returns_probability_between_0_and_1() -> None:
    response = _prediction_client().post("/prediccion", json=_PLATFORM_PAYLOAD)

    assert response.status_code == 200
    probability = response.json()["probability"]
    assert 0.0 <= probability <= 1.0


def test_platform_prediccion_is_deterministic_for_same_input() -> None:
    client = _prediction_client()

    p1 = client.post("/prediccion", json=_PLATFORM_PAYLOAD).json()["probability"]
    p2 = client.post("/prediccion", json=_PLATFORM_PAYLOAD).json()["probability"]

    assert p1 == p2


@pytest.mark.parametrize(
    "field,bad_value",
    [
        ("edad", 10),
        ("diag_ing1", 0),
        ("diag_ing2", 200),
        ("diag_egr2", 10),
        ("apache", 45),
        ("tiempo_vam", 10),
    ],
)
def test_platform_prediccion_rejects_out_of_range_fields(field, bad_value) -> None:
    payload = {**_PLATFORM_PAYLOAD, field: bad_value}
    response = _prediction_client().post("/prediccion", json=payload)

    assert response.status_code == 422


def test_platform_prediccion_explain_returns_feature_names_and_importances() -> None:
    payload = {**_PLATFORM_PAYLOAD, "method": "SHAP"}
    response = _prediction_client().post("/prediccion/explain", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["feature_names"] == [
        "Edad",
        "Diag.Ing1",
        "Diag.Ing2",
        "Diag.Egr2",
        "APACHE",
        "TiempoVAM",
    ]
    assert len(body["importances"]) == 6


def test_platform_prediccion_explain_rejects_unknown_method() -> None:
    payload = {**_PLATFORM_PAYLOAD, "method": "UNKNOWN"}
    response = _prediction_client().post("/prediccion/explain", json=payload)

    assert response.status_code == 422
