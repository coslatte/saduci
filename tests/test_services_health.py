from fastapi.testclient import TestClient

from tests.conftest import load_module_from_path


def test_patient_service_health_endpoint() -> None:
    module = load_module_from_path(
        "patient_main_health_test",
        "services/patient/main.py",
        env={"DATABASE_URL": "sqlite:///:memory:"},
    )
    client = TestClient(module.app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["service"] == "patient"


def test_prediction_service_health_endpoint() -> None:
    module = load_module_from_path(
        "prediction_main_health_test",
        "services/prediction/main.py",
        env={"DATABASE_URL": "sqlite:///:memory:"},
    )
    client = TestClient(module.app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["service"] == "prediction"


def test_simulation_service_health_endpoint() -> None:
    module = load_module_from_path(
        "simulation_main_health_test",
        "services/simulation/main.py",
        env={"DATABASE_URL": "sqlite:///:memory:"},
    )
    client = TestClient(module.app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["service"] == "simulation"
