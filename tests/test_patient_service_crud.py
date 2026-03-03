"""Comprehensive tests for the Patient Service CRUD operations and CSV import."""
from typing import Any, Dict

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from tests.conftest import load_module_from_path

_VALID_PATIENT: Dict[str, Any] = {
    "patient_id": "P001",
    "first_name": "María",
    "last_name": "García",
    "date_of_birth": "1980-05-15T00:00:00",
    "gender": "female",
    "clinical_data": {"apache_score": 14},
}


def _patient_client() -> TestClient:
    """Returns a TestClient backed by a thread-safe in-memory SQLite database.

    Uses StaticPool so that all threads (including the ASGI worker) share a
    single connection and therefore the same in-memory database and its tables.
    """
    module = load_module_from_path(
        "patient_crud_service_test",
        "services/patient/main.py",
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


# ─── LIST ─────────────────────────────────────────────────────────────────────


def test_list_patients_initially_returns_empty_list() -> None:
    client = _patient_client()

    response = client.get("/patients")

    assert response.status_code == 200
    assert response.json() == []


def test_list_patients_after_creation_shows_correct_count() -> None:
    client = _patient_client()
    for i in range(3):
        data = {**_VALID_PATIENT, "patient_id": f"PLIST{i}"}
        client.post("/patients", json=data)

    response = client.get("/patients")

    assert response.status_code == 200
    assert len(response.json()) == 3


def test_list_patients_skip_parameter_offsets_results() -> None:
    client = _patient_client()
    for i in range(4):
        client.post("/patients", json={**_VALID_PATIENT, "patient_id": f"PSKIP{i}"})

    response = client.get("/patients?skip=2")

    assert response.status_code == 200
    assert len(response.json()) == 2


def test_list_patients_limit_parameter_truncates_results() -> None:
    client = _patient_client()
    for i in range(4):
        client.post("/patients", json={**_VALID_PATIENT, "patient_id": f"PLIM{i}"})

    response = client.get("/patients?limit=2")

    assert response.status_code == 200
    assert len(response.json()) == 2


# ─── CREATE ───────────────────────────────────────────────────────────────────


def test_create_patient_returns_201_with_correct_fields() -> None:
    client = _patient_client()

    response = client.post("/patients", json=_VALID_PATIENT)

    assert response.status_code == 201
    body = response.json()
    assert body["patient_id"] == "P001"
    assert body["first_name"] == "María"
    assert body["last_name"] == "García"
    assert body["gender"] == "female"
    assert "id" in body
    assert "created_at" in body


def test_create_patient_without_clinical_data_sets_field_to_null() -> None:
    client = _patient_client()
    payload = {**_VALID_PATIENT, "patient_id": "P_NO_CLIN"}
    payload.pop("clinical_data")

    response = client.post("/patients", json=payload)

    assert response.status_code == 201
    assert response.json()["clinical_data"] is None


def test_create_patient_duplicate_id_returns_400() -> None:
    client = _patient_client()
    client.post("/patients", json=_VALID_PATIENT)

    response = client.post("/patients", json=_VALID_PATIENT)

    assert response.status_code == 400


def test_create_patient_stores_clinical_data_correctly() -> None:
    client = _patient_client()
    clinical = {"apache_score": 22, "diagnosis": "sepsis"}
    payload = {**_VALID_PATIENT, "patient_id": "P_CLIN", "clinical_data": clinical}

    response = client.post("/patients", json=payload)

    assert response.status_code == 201
    assert response.json()["clinical_data"] == clinical


# ─── GET ──────────────────────────────────────────────────────────────────────


def test_get_existing_patient_returns_correct_data() -> None:
    client = _patient_client()
    client.post("/patients", json=_VALID_PATIENT)

    response = client.get("/patients/P001")

    assert response.status_code == 200
    assert response.json()["patient_id"] == "P001"
    assert response.json()["first_name"] == "María"


def test_get_nonexistent_patient_returns_404() -> None:
    client = _patient_client()

    response = client.get("/patients/DOES_NOT_EXIST")

    assert response.status_code == 404


# ─── UPDATE ──────────────────────────────────────────────────────────────────


def test_update_patient_first_name_persists_change() -> None:
    client = _patient_client()
    client.post("/patients", json=_VALID_PATIENT)

    response = client.put("/patients/P001", json={"first_name": "Ana"})

    assert response.status_code == 200
    assert response.json()["first_name"] == "Ana"


def test_partial_update_does_not_overwrite_untouched_fields() -> None:
    client = _patient_client()
    client.post("/patients", json=_VALID_PATIENT)

    client.put("/patients/P001", json={"first_name": "Ana"})
    response = client.get("/patients/P001")

    assert response.json()["last_name"] == "García"


def test_update_clinical_data_replaces_previous_value() -> None:
    client = _patient_client()
    client.post("/patients", json=_VALID_PATIENT)
    updated_clinical = {"apache_score": 30, "notes": "critical"}

    response = client.put("/patients/P001", json={"clinical_data": updated_clinical})

    assert response.status_code == 200
    assert response.json()["clinical_data"] == updated_clinical


def test_update_nonexistent_patient_returns_404() -> None:
    client = _patient_client()

    response = client.put("/patients/GHOST", json={"first_name": "X"})

    assert response.status_code == 404


# ─── DELETE ───────────────────────────────────────────────────────────────────


def test_delete_patient_removes_record_from_database() -> None:
    client = _patient_client()
    client.post("/patients", json=_VALID_PATIENT)

    del_response = client.delete("/patients/P001")
    get_response = client.get("/patients/P001")

    assert del_response.status_code == 200
    assert get_response.status_code == 404


def test_delete_removes_only_the_targeted_patient() -> None:
    client = _patient_client()
    client.post("/patients", json=_VALID_PATIENT)
    client.post("/patients", json={**_VALID_PATIENT, "patient_id": "P002"})

    client.delete("/patients/P001")
    list_response = client.get("/patients")

    ids = [p["patient_id"] for p in list_response.json()]
    assert "P001" not in ids
    assert "P002" in ids


def test_delete_nonexistent_patient_returns_404() -> None:
    client = _patient_client()

    response = client.delete("/patients/GHOST")

    assert response.status_code == 404


# ─── CSV IMPORT ───────────────────────────────────────────────────────────────


def test_csv_import_valid_file_imports_all_rows() -> None:
    client = _patient_client()
    csv_content = (
        "patient_id,first_name,last_name,date_of_birth,gender\n"
        "CSV001,Juan,Pérez,1990-01-20,male\n"
        "CSV002,Laura,Torres,1985-07-11,female\n"
    )

    response = client.post(
        "/patients/import",
        files={"file": ("patients.csv", csv_content.encode(), "text/csv")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["imported"] == 2
    assert body["errors"] == []


def test_csv_import_creates_queryable_patients() -> None:
    client = _patient_client()
    csv_content = (
        "patient_id,first_name,last_name,date_of_birth,gender\n"
        "CSVQ1,Roberto,Díaz,1975-03-10,male\n"
    )
    client.post(
        "/patients/import",
        files={"file": ("patients.csv", csv_content.encode(), "text/csv")},
    )

    response = client.get("/patients/CSVQ1")

    assert response.status_code == 200
    assert response.json()["first_name"] == "Roberto"


def test_csv_import_non_csv_file_returns_400() -> None:
    client = _patient_client()

    response = client.post(
        "/patients/import",
        files={"file": ("patients.txt", b"some data", "text/plain")},
    )

    assert response.status_code == 400


def test_csv_import_oversized_file_returns_413() -> None:
    module = load_module_from_path(
        "patient_csv_size_test",
        "services/patient/main.py",
        env={"DATABASE_URL": "sqlite:///:memory:", "MAX_CSV_SIZE_BYTES": "10"},
    )
    client = TestClient(module.app)
    big_content = b"patient_id,first_name\nP1,Test\n" * 20

    response = client.post(
        "/patients/import",
        files={"file": ("large.csv", big_content, "text/csv")},
    )

    assert response.status_code == 413


def test_csv_import_with_invalid_date_format_reports_error() -> None:
    client = _patient_client()
    csv_content = (
        "patient_id,first_name,last_name,date_of_birth,gender\n"
        "BADDATE,Juan,Pérez,not-a-date,male\n"
    )

    response = client.post(
        "/patients/import",
        files={"file": ("bad.csv", csv_content.encode(), "text/csv")},
    )

    body = response.json()
    assert body["imported"] == 0
    assert len(body["errors"]) > 0


def test_csv_import_partial_success_reports_errors_and_imported_count() -> None:
    client = _patient_client()
    csv_content = (
        "patient_id,first_name,last_name,date_of_birth,gender\n"
        "GOOD01,Good,Patient,1990-06-15,female\n"
        "BADDT,Bad,Patient,9999-99-99,male\n"
    )

    response = client.post(
        "/patients/import",
        files={"file": ("mixed.csv", csv_content.encode(), "text/csv")},
    )

    body = response.json()
    assert body["imported"] == 1
    assert len(body["errors"]) == 1
