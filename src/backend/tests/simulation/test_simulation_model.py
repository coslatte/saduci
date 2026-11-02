"""Behavioral tests for the simulation models and fallback endpoint."""

import asyncio
import random

import pytest

from src.simulation import main as simulation
from shared.schemas.simulation import PlatformSimulationRequest


@pytest.fixture
def engine():
    return simulation.SimulationEngine()


def test_treatment_response_decays_and_aggressive_treatment_improves_faster(engine):
    params = {"baseline_severity": 10, "duration_hours": 8}

    standard = engine.run_simulation("treatment_response", {**params, "treatment": "standard"})
    aggressive = engine.run_simulation("treatment_response", {**params, "treatment": "aggressive"})

    assert [point["hour"] for point in standard] == [0, 4, 8]
    assert standard[0]["severity_score"] == aggressive[0]["severity_score"] == 10
    assert standard[-1]["severity_score"] > aggressive[-1]["severity_score"]
    assert all(a["severity_score"] >= b["severity_score"] for a, b in zip(standard, standard[1:]))


def test_vital_sign_projection_is_repeatable_without_changing_global_random_state(engine):
    params = {"heart_rate": 80, "blood_pressure_sys": 120, "duration_hours": 4}
    random.seed(1234)
    expected_next_random_value = random.random()
    random.seed(1234)

    first = engine.run_simulation("vital_signs_projection", params)
    actual_next_random_value = random.random()
    second = engine.run_simulation("vital_signs_projection", params)

    assert first == second
    assert [point["hour"] for point in first] == [0, 2, 4]
    assert actual_next_random_value == expected_next_random_value


@pytest.mark.parametrize(
    "intervention",
    ["immediate_surgery", "conservative_treatment", "standard_care"],
)
def test_intervention_probabilities_form_a_distribution_at_high_risk(engine, intervention):
    outcomes = engine.run_simulation(
        "intervention_outcomes", {"intervention": intervention, "patient_risk": 1}
    )

    probabilities = [outcome["probability"] for outcome in outcomes]
    assert all(0 <= probability <= 1 for probability in probabilities)
    assert sum(probabilities) == pytest.approx(1)


def test_higher_patient_risk_increases_complication_probability(engine):
    low_risk = engine.run_simulation("intervention_outcomes", {"patient_risk": 0})
    high_risk = engine.run_simulation("intervention_outcomes", {"patient_risk": 1})

    low_complication = next(item["probability"] for item in low_risk if item["outcome"] == "complications")
    high_complication = next(item["probability"] for item in high_risk if item["outcome"] == "complications")
    assert high_complication > low_complication


def test_unknown_scenario_is_rejected(engine):
    with pytest.raises(ValueError, match="Unknown scenario"):
        engine.run_simulation("unknown", {})


@pytest.fixture
def platform_request():
    return PlatformSimulationRequest(
        age=65,
        apache=20,
        d1=1,
        artif_vent=1,
        vam_time=72,
        uti_stay=120,
        preuti_stay=8,
        resp_insuf=2,
        n_runs=50,
    )


def test_platform_fallback_is_repeatable_and_returns_valid_statistics(platform_request):
    first = simulation._fallback_platform_simulation(platform_request)
    second = simulation._fallback_platform_simulation(platform_request)

    assert first == second
    assert set(first["simulation"]) == set(simulation._PLATFORM_SIM_VARS)
    for stats in first["simulation"].values():
        assert stats["mean"] >= 0
        assert stats["std"] > 0
        assert stats["ci_lower"] < stats["mean"] < stats["ci_upper"]
    assert 0.05 <= first["prediction"]["probability"] <= 0.95
    assert first["prediction"]["class"] in (0, 1)


def test_platform_endpoint_uses_fallback_when_simuci_is_unavailable(monkeypatch, platform_request):
    monkeypatch.setattr(simulation, "SIMUCI_AVAILABLE", False)

    result = asyncio.run(simulation.run_platform_simulation(platform_request))

    assert result == simulation._fallback_platform_simulation(platform_request)


@pytest.mark.parametrize(
    "field,value",
    [("age", 13), ("apache", 37), ("n_runs", 49), ("vam_time", 23)],
)
def test_platform_request_rejects_out_of_range_inputs(platform_request, field, value):
    data = platform_request.model_dump()
    data[field] = value

    with pytest.raises(ValueError):
        PlatformSimulationRequest(**data)
