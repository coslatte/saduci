"""Tests for statistical tests and platform-compatible simulation endpoints."""
import pytest
from fastapi.testclient import TestClient

from tests.conftest import load_module_from_path


def _load_simulation_module():
    return load_module_from_path(
        "simulation_main_stats_test",
        "services/simulation/main.py",
        env={"DATABASE_URL": "sqlite:///:memory:"},
    )


# ─── Wilcoxon ────────────────────────────────────────────────────────────────


def test_wilcoxon_endpoint_returns_statistic_and_p_value() -> None:
    module = _load_simulation_module()
    client = TestClient(module.app)

    response = client.post(
        "/statistics/wilcoxon",
        json={"x": [1.0, 2.0, 3.0, 4.0, 5.0], "y": [2.0, 3.0, 4.0, 5.0, 6.0]},
    )

    assert response.status_code == 200
    body = response.json()
    assert "statistic" in body
    assert "p_value" in body
    assert isinstance(body["statistic"], float)
    assert 0.0 <= body["p_value"] <= 1.0


def test_wilcoxon_rejects_mismatched_sample_lengths() -> None:
    module = _load_simulation_module()
    client = TestClient(module.app)

    response = client.post(
        "/statistics/wilcoxon",
        json={"x": [1.0, 2.0], "y": [1.0, 2.0, 3.0]},
    )

    assert response.status_code == 400


def test_wilcoxon_rejects_single_observation() -> None:
    module = _load_simulation_module()
    client = TestClient(module.app)

    response = client.post(
        "/statistics/wilcoxon",
        json={"x": [1.0], "y": [2.0]},
    )

    assert response.status_code == 400


# ─── Friedman ────────────────────────────────────────────────────────────────


def test_friedman_endpoint_returns_statistic_and_p_value() -> None:
    module = _load_simulation_module()
    client = TestClient(module.app)

    response = client.post(
        "/statistics/friedman",
        json={"samples": [[1.0, 2.0, 3.0], [2.0, 3.0, 4.0], [3.0, 4.0, 5.0]]},
    )

    assert response.status_code == 200
    body = response.json()
    assert "statistic" in body
    assert "p_value" in body
    assert 0.0 <= body["p_value"] <= 1.0


def test_friedman_rejects_fewer_than_three_groups() -> None:
    module = _load_simulation_module()
    client = TestClient(module.app)

    response = client.post(
        "/statistics/friedman",
        json={"samples": [[1.0, 2.0], [3.0, 4.0]]},
    )

    assert response.status_code == 400


def test_friedman_rejects_groups_of_unequal_length() -> None:
    module = _load_simulation_module()
    client = TestClient(module.app)

    response = client.post(
        "/statistics/friedman",
        json={"samples": [[1.0, 2.0], [3.0, 4.0], [5.0]]},
    )

    assert response.status_code == 400


# ─── Platform simulation ─────────────────────────────────────────────────────


def test_platform_simulation_returns_expected_structure() -> None:
    module = _load_simulation_module()
    client = TestClient(module.app)

    payload = {
        "age": 45,
        "apache": 18,
        "d1": 5,
        "d2": 0,
        "d3": 0,
        "d4": 0,
        "diag_egreso2": 0,
        "artif_vent": 0,
        "vam_time": 48,
        "uti_stay": 72,
        "preuti_stay": 12,
        "resp_insuf": 1,
        "percent": 3,
        "n_runs": 50,
    }

    response = client.post("/simulation", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert "simulation" in body
    assert "prediction" in body

    sim = body["simulation"]
    for var in ["pre_vam", "vam", "post_vam", "uci", "post_uci"]:
        assert var in sim, f"Missing key: {var}"
        for stat in ["mean", "std", "ci_lower", "ci_upper"]:
            assert stat in sim[var], f"Missing stat {stat} in {var}"

    pred = body["prediction"]
    assert "class" in pred
    assert "probability" in pred
    assert pred["class"] in (0, 1)
    assert 0.0 <= pred["probability"] <= 1.0


def test_platform_simulation_rejects_out_of_range_age() -> None:
    module = _load_simulation_module()
    client = TestClient(module.app)

    payload = {
        "age": 5,  # below minimum of 14
        "apache": 18,
        "d1": 5,
        "artif_vent": 0,
        "vam_time": 48,
        "uti_stay": 72,
        "preuti_stay": 12,
        "resp_insuf": 1,
    }

    response = client.post("/simulation", json=payload)

    assert response.status_code == 422


def test_platform_simulation_ci_bounds_are_ordered() -> None:
    """ci_lower must be <= mean <= ci_upper for all time variables."""
    module = _load_simulation_module()
    client = TestClient(module.app)

    payload = {
        "age": 60,
        "apache": 25,
        "d1": 10,
        "artif_vent": 1,
        "vam_time": 100,
        "uti_stay": 120,
        "preuti_stay": 20,
        "resp_insuf": 2,
        "n_runs": 50,
    }

    response = client.post("/simulation", json=payload)
    assert response.status_code == 200
    sim = response.json()["simulation"]

    for var, stats in sim.items():
        assert stats["ci_lower"] <= stats["mean"] <= stats["ci_upper"], (
            f"CI bounds out of order for {var}: {stats}"
        )


# ─── Gateway routing ─────────────────────────────────────────────────────────


def _create_gateway_client() -> TestClient:
    module = load_module_from_path(
        "api_gateway_main_routing_test",
        "services/api-gateway/main.py",
        env={
            "SECRET_KEY": "test-secret-key-for-routing-tests",
            "AUTH_USERNAME": "test_admin",
            "AUTH_PASSWORD": "test_password_123",
            "CORS_ALLOW_ORIGINS": "http://localhost:3000",
        },
    )
    return TestClient(module.app)


def test_gateway_exposes_simulation_route() -> None:
    """The gateway must have /simulation registered (even if downstream is unavailable)."""
    client = _create_gateway_client()
    # A POST with an empty body should fail with 422 (validation) not 404
    response = client.post("/simulation", json={})
    assert response.status_code != 404


def test_gateway_exposes_statistics_wilcoxon_route() -> None:
    client = _create_gateway_client()
    response = client.post("/statistics/wilcoxon", json={})
    assert response.status_code != 404


def test_gateway_exposes_statistics_friedman_route() -> None:
    client = _create_gateway_client()
    response = client.post("/statistics/friedman", json={})
    assert response.status_code != 404
