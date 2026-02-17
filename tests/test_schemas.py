import pytest
from pydantic import ValidationError

from shared.schemas import HealthCheck, ICUPatientSimulationRequest


def test_health_check_uses_default_version() -> None:
    model = HealthCheck(status="healthy", service="api-gateway")

    assert model.version == "1.0.0"


def test_icu_simulation_schema_accepts_valid_payload() -> None:
    request = ICUPatientSimulationRequest(
        patient_id="P001",
        age=55,
        diagnosis_admission1=5,
        apache=18,
        respiratory_insufficiency=4,
        artificial_ventilation=1,
        uti_stay=48,
        vam_time=12,
        preuti_stay_time=6,
    )

    assert request.patient_id == "P001"
    assert request.percent == 10
    assert request.n_replications == 100


def test_icu_simulation_schema_rejects_out_of_range_values() -> None:
    with pytest.raises(ValidationError):
        ICUPatientSimulationRequest(
            patient_id="P002",
            age=10,
            diagnosis_admission1=5,
            apache=18,
            respiratory_insufficiency=4,
            artificial_ventilation=1,
            uti_stay=48,
            vam_time=12,
            preuti_stay_time=6,
        )
