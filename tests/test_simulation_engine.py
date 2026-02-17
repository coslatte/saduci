import pytest

from tests.conftest import load_module_from_path


def _load_simulation_module():
    return load_module_from_path(
        "simulation_main_test",
        "services/simulation/main.py",
        env={"DATABASE_URL": "sqlite:///:memory:"},
    )


def test_simulation_engine_treatment_response_returns_timeline() -> None:
    module = _load_simulation_module()
    engine = module.SimulationEngine()

    results = engine.run_simulation(
        "treatment_response",
        {"treatment": "aggressive", "baseline_severity": 8, "duration_hours": 24},
    )

    assert len(results) == 7
    assert results[0]["hour"] == 0
    assert results[-1]["hour"] == 24
    assert results[-1]["severity_score"] < results[0]["severity_score"]


def test_simulation_engine_vital_signs_is_deterministic_for_same_input() -> None:
    module = _load_simulation_module()
    engine = module.SimulationEngine()

    first = engine.run_simulation("vital_signs_projection", {"heart_rate": 80, "blood_pressure_sys": 120, "duration_hours": 12})
    second = engine.run_simulation("vital_signs_projection", {"heart_rate": 80, "blood_pressure_sys": 120, "duration_hours": 12})

    assert first == second


def test_simulation_engine_rejects_unknown_scenario() -> None:
    module = _load_simulation_module()
    engine = module.SimulationEngine()

    with pytest.raises(ValueError):
        engine.run_simulation("unsupported_scenario", {})
