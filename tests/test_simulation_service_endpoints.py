"""Comprehensive tests for the Simulation Service REST API.

Covers: scenarios catalogue, generic simulations, patient history,
helper functions, platform simulation endpoint, and statistical tests.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from tests.conftest import load_module_from_path

_DB_ENV = {"DATABASE_URL": "sqlite:///:memory:"}

_PLATFORM_PAYLOAD = {
    "age": 55,
    "apache": 20,
    "d1": 5,
    "d2": 0,
    "d3": 0,
    "d4": 0,
    "diag_egreso2": 0,
    "artif_vent": 1,
    "vam_time": 48,
    "uti_stay": 96,
    "preuti_stay": 12,
    "resp_insuf": 2,
    "percent": 3,
    "n_runs": 50,
}


def _sim_client() -> TestClient:
    """Returns a TestClient backed by a thread-safe in-memory SQLite database.

    Uses StaticPool so that all threads (including the ASGI worker) share a
    single connection and therefore the same in-memory database and its tables.
    """
    module = load_module_from_path(
        "simulation_endpoints_test",
        "services/simulation/main.py",
        env=_DB_ENV,
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


# ─── Scenarios catalogue ──────────────────────────────────────────────────────


def test_list_scenarios_includes_icu_simulation() -> None:
    response = _sim_client().get("/scenarios")

    assert response.status_code == 200
    names = {s["name"] for s in response.json()["scenarios"]}
    assert "icu_patient_simulation" in names


def test_list_scenarios_includes_all_standard_scenarios() -> None:
    response = _sim_client().get("/scenarios")

    names = {s["name"] for s in response.json()["scenarios"]}
    assert {"treatment_response", "vital_signs_projection", "intervention_outcomes"} <= names


def test_list_scenarios_each_entry_has_required_parameters_field() -> None:
    response = _sim_client().get("/scenarios")

    for scenario in response.json()["scenarios"]:
        assert "required_parameters" in scenario


# ─── Generic simulations (POST /simulations) ─────────────────────────────────


def test_treatment_response_returns_correct_timeline_length() -> None:
    """duration_hours=8 with step=4 → entries at 0, 4, 8 (3 items)."""
    client = _sim_client()

    response = client.post(
        "/simulations",
        json={
            "patient_id": "SIM001",
            "scenario": "treatment_response",
            "parameters": {"treatment": "standard", "baseline_severity": 6, "duration_hours": 8},
        },
    )

    assert response.status_code == 200
    results = response.json()["results"]
    assert len(results) == 3
    assert results[0]["hour"] == 0
    assert results[-1]["hour"] == 8


def test_aggressive_treatment_lowers_severity_faster_than_standard() -> None:
    client = _sim_client()

    def _final_severity(treatment: str) -> float:
        r = client.post(
            "/simulations",
            json={
                "patient_id": f"SIM-{treatment}",
                "scenario": "treatment_response",
                "parameters": {"treatment": treatment, "baseline_severity": 10, "duration_hours": 24},
            },
        )
        return r.json()["results"][-1]["severity_score"]

    assert _final_severity("aggressive") < _final_severity("standard")


def test_vital_signs_simulation_returns_heart_rate_and_blood_pressure() -> None:
    client = _sim_client()

    response = client.post(
        "/simulations",
        json={
            "patient_id": "SIM002",
            "scenario": "vital_signs_projection",
            "parameters": {"heart_rate": 75, "blood_pressure_sys": 125, "duration_hours": 4},
        },
    )

    assert response.status_code == 200
    first_entry = response.json()["results"][0]
    assert "heart_rate" in first_entry
    assert "blood_pressure_sys" in first_entry
    assert "blood_pressure_dia" in first_entry


def test_vital_signs_same_input_is_deterministic() -> None:
    client = _sim_client()
    params = {
        "patient_id": "SIM-DET",
        "scenario": "vital_signs_projection",
        "parameters": {"heart_rate": 80, "blood_pressure_sys": 120, "duration_hours": 4},
    }

    r1 = client.post("/simulations", json=params).json()["results"]
    r2 = client.post("/simulations", json={**params, "patient_id": "SIM-DET2"}).json()["results"]

    assert r1 == r2


def test_intervention_outcomes_returns_three_named_outcomes() -> None:
    client = _sim_client()

    response = client.post(
        "/simulations",
        json={
            "patient_id": "SIM003",
            "scenario": "intervention_outcomes",
            "parameters": {"intervention": "immediate_surgery", "patient_risk": 0.3},
        },
    )

    assert response.status_code == 200
    outcomes = {r["outcome"] for r in response.json()["results"]}
    assert outcomes == {"full_recovery", "partial_recovery", "complications"}


def test_intervention_higher_patient_risk_increases_complication_probability() -> None:
    client = _sim_client()

    def _complication_prob(risk: float) -> float:
        r = client.post(
            "/simulations",
            json={
                "patient_id": f"SIM-RISK-{risk}",
                "scenario": "intervention_outcomes",
                "parameters": {"intervention": "immediate_surgery", "patient_risk": risk},
            },
        )
        for item in r.json()["results"]:
            if item["outcome"] == "complications":
                return item["probability"]
        return 0.0

    assert _complication_prob(0.1) < _complication_prob(0.8)


def test_unknown_scenario_returns_500() -> None:
    client = _sim_client()

    response = client.post(
        "/simulations",
        json={"patient_id": "SIM004", "scenario": "magic_scenario", "parameters": {}},
    )

    assert response.status_code == 500


# ─── Patient simulations history (GET /simulations/{patient_id}) ──────────────


def test_get_simulations_initially_empty_for_new_patient() -> None:
    response = _sim_client().get("/simulations/NO_HISTORY")

    assert response.status_code == 200
    assert response.json()["simulations"] == []


def test_get_simulations_returns_stored_records_for_patient() -> None:
    client = _sim_client()
    client.post(
        "/simulations",
        json={
            "patient_id": "SIM_HIST",
            "scenario": "treatment_response",
            "parameters": {"baseline_severity": 5},
        },
    )

    response = client.get("/simulations/SIM_HIST")

    assert response.status_code == 200
    records = response.json()["simulations"]
    assert len(records) == 1
    assert records[0]["scenario"] == "treatment_response"


def test_get_simulations_does_not_return_other_patients_records() -> None:
    client = _sim_client()
    client.post(
        "/simulations",
        json={"patient_id": "SIM-A", "scenario": "treatment_response", "parameters": {}},
    )

    response = client.get("/simulations/SIM-B")

    assert response.json()["simulations"] == []


# ─── Helper function unit tests ───────────────────────────────────────────────


def test_make_time_stats_ci_lower_le_mean_le_ci_upper() -> None:
    module = load_module_from_path("sim_helpers_ci_test", "services/simulation/main.py", env=_DB_ENV)

    stats = getattr(module, "_make_time_stats")(mean=50.0, std=10.0, n=100)  # pyright: ignore[reportPrivateUsage]

    assert stats.ci_lower <= stats.mean <= stats.ci_upper


def test_make_time_stats_with_n_equals_one_does_not_raise() -> None:
    module = load_module_from_path("sim_helpers_n1_test", "services/simulation/main.py", env=_DB_ENV)

    stats = getattr(module, "_make_time_stats")(mean=30.0, std=5.0, n=1)  # pyright: ignore[reportPrivateUsage]

    assert stats.ci_lower <= stats.mean <= stats.ci_upper


@pytest.mark.parametrize("std", [0.0, 0.001, 100.0])
def test_make_time_stats_handles_various_std_values(std) -> None:
    module = load_module_from_path(
        f"sim_helpers_std{int(std)}_test", "services/simulation/main.py", env=_DB_ENV
    )

    stats = getattr(module, "_make_time_stats")(mean=20.0, std=std, n=50)  # pyright: ignore[reportPrivateUsage]

    assert stats.ci_lower <= stats.mean <= stats.ci_upper


def test_mortality_prediction_low_apache_and_age_returns_class_0() -> None:
    module = load_module_from_path("sim_mort_low_test", "services/simulation/main.py", env=_DB_ENV)

    pred = getattr(module, "_mortality_prediction")(apache=2, age=20)  # pyright: ignore[reportPrivateUsage]

    assert pred["class"] == 0
    assert 0.0 <= pred["probability"] <= 1.0


def test_mortality_prediction_high_apache_returns_class_1() -> None:
    module = load_module_from_path("sim_mort_high_test", "services/simulation/main.py", env=_DB_ENV)

    pred = getattr(module, "_mortality_prediction")(apache=36, age=90)  # pyright: ignore[reportPrivateUsage]

    assert pred["class"] == 1


def test_mortality_prediction_probability_increases_with_apache() -> None:
    module = load_module_from_path("sim_mort_incr_test", "services/simulation/main.py", env=_DB_ENV)

    low_prob = getattr(module, "_mortality_prediction")(apache=5, age=30)["probability"]  # pyright: ignore[reportPrivateUsage]
    high_prob = getattr(module, "_mortality_prediction")(apache=35, age=30)["probability"]  # pyright: ignore[reportPrivateUsage]

    assert high_prob > low_prob


def test_mortality_prediction_probability_is_clamped_to_005_095() -> None:
    module = load_module_from_path("sim_mort_clamp_test", "services/simulation/main.py", env=_DB_ENV)

    p_min = getattr(module, "_mortality_prediction")(apache=0, age=0)["probability"]  # pyright: ignore[reportPrivateUsage]
    p_max = getattr(module, "_mortality_prediction")(apache=36, age=100)["probability"]  # pyright: ignore[reportPrivateUsage]

    assert p_min >= 0.05
    assert p_max <= 0.95


def test_platform_fallback_seed_is_deterministic_for_same_input() -> None:
    module = load_module_from_path("sim_seed_test", "services/simulation/main.py", env=_DB_ENV)

    request = module.PlatformSimulationRequest(  # pyright: ignore[reportPrivateUsage]
        age=55,
        apache=20,
        d1=5,
        d2=0,
        d3=0,
        d4=0,
        diag_egreso2=0,
        artif_vent=1,
        vam_time=48,
        uti_stay=96,
        preuti_stay=12,
        resp_insuf=2,
        percent=3,
        n_runs=50,
    )

    seed_1 = getattr(module, "_platform_fallback_seed")(request)  # pyright: ignore[reportPrivateUsage]
    seed_2 = getattr(module, "_platform_fallback_seed")(request)  # pyright: ignore[reportPrivateUsage]

    assert seed_1 == seed_2


# ─── Platform simulation endpoint (POST /simulation) ─────────────────────────


def test_platform_simulation_returns_all_five_time_phases() -> None:
    response = _sim_client().post("/simulation", json=_PLATFORM_PAYLOAD)

    assert response.status_code == 200
    sim = response.json()["simulation"]
    for phase in ["pre_vam", "vam", "post_vam", "uci", "post_uci"]:
        assert phase in sim, f"Missing phase: {phase}"


def test_platform_simulation_each_phase_has_all_stat_fields() -> None:
    response = _sim_client().post("/simulation", json=_PLATFORM_PAYLOAD)

    for phase, stats in response.json()["simulation"].items():
        for field in ["mean", "std", "ci_lower", "ci_upper"]:
            assert field in stats, f"Missing '{field}' in phase '{phase}'"


def test_platform_simulation_ci_bounds_are_correctly_ordered() -> None:
    response = _sim_client().post("/simulation", json=_PLATFORM_PAYLOAD)

    for phase, stats in response.json()["simulation"].items():
        assert stats["ci_lower"] <= stats["mean"] <= stats["ci_upper"], (
            f"CI bounds out of order for '{phase}': {stats}"
        )


def test_platform_simulation_prediction_contains_class_and_probability() -> None:
    response = _sim_client().post("/simulation", json=_PLATFORM_PAYLOAD)

    pred = response.json()["prediction"]
    assert pred["class"] in (0, 1)
    assert 0.0 <= pred["probability"] <= 1.0


@pytest.mark.parametrize(
    "field,bad_value",
    [
        ("age", 5),       # below minimum of 14
        ("age", 200),     # above maximum of 100
        ("apache", -1),   # below 0
        ("apache", 40),   # above 36
        ("vam_time", 10), # below minimum of 24
        ("n_runs", 10),   # below minimum of 50
    ],
)
def test_platform_simulation_rejects_out_of_range_fields(field, bad_value) -> None:
    payload = {**_PLATFORM_PAYLOAD, field: bad_value}

    response = _sim_client().post("/simulation", json=payload)

    assert response.status_code == 422


def test_platform_simulation_is_deterministic_for_same_input() -> None:
    """Identical inputs must produce identical fallback simulation results."""
    client = _sim_client()

    r1 = client.post("/simulation", json=_PLATFORM_PAYLOAD).json()
    r2 = client.post("/simulation", json=_PLATFORM_PAYLOAD).json()

    assert r1["prediction"] == r2["prediction"]


# ─── Wilcoxon test (POST /statistics/wilcoxon) ────────────────────────────────


def test_wilcoxon_valid_input_returns_statistic_and_p_value() -> None:
    response = _sim_client().post(
        "/statistics/wilcoxon",
        json={"x": [1.0, 2.0, 3.0, 4.0, 5.0], "y": [2.0, 3.0, 4.0, 5.0, 6.0]},
    )

    assert response.status_code == 200
    body = response.json()
    assert "statistic" in body
    assert "p_value" in body
    assert 0.0 <= body["p_value"] <= 1.0


def test_wilcoxon_p_value_is_float() -> None:
    response = _sim_client().post(
        "/statistics/wilcoxon",
        json={"x": [1.0, 2.0, 3.0], "y": [1.5, 2.5, 3.5]},
    )

    assert isinstance(response.json()["p_value"], float)


def test_wilcoxon_rejects_mismatched_sample_lengths() -> None:
    response = _sim_client().post(
        "/statistics/wilcoxon",
        json={"x": [1.0, 2.0], "y": [1.0, 2.0, 3.0]},
    )

    assert response.status_code == 400


def test_wilcoxon_rejects_single_observation_per_sample() -> None:
    response = _sim_client().post(
        "/statistics/wilcoxon",
        json={"x": [1.0], "y": [2.0]},
    )

    assert response.status_code == 400


# ─── Friedman test (POST /statistics/friedman) ───────────────────────────────


def test_friedman_valid_input_returns_statistic_and_p_value() -> None:
    response = _sim_client().post(
        "/statistics/friedman",
        json={"samples": [[1.0, 2.0, 3.0], [2.0, 3.0, 4.0], [3.0, 4.0, 5.0]]},
    )

    assert response.status_code == 200
    body = response.json()
    assert "statistic" in body
    assert 0.0 <= body["p_value"] <= 1.0


def test_friedman_rejects_fewer_than_three_groups() -> None:
    response = _sim_client().post(
        "/statistics/friedman",
        json={"samples": [[1.0, 2.0], [3.0, 4.0]]},
    )

    assert response.status_code == 400


def test_friedman_rejects_groups_of_unequal_length() -> None:
    response = _sim_client().post(
        "/statistics/friedman",
        json={"samples": [[1.0, 2.0], [3.0, 4.0], [5.0]]},
    )

    assert response.status_code == 400


def test_friedman_accepts_larger_sample_sizes() -> None:
    # 5 groups x 10 observations; values shift per group to avoid tied ranks
    # that would cause scipy to emit NaN and fail JSON serialisation.
    samples = [[float(j + i * 2) for j in range(10)] for i in range(5)]

    response = _sim_client().post("/statistics/friedman", json={"samples": samples})

    assert response.status_code == 200
