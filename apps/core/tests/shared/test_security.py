"""Tests de shared_core.security: hashing de contrasenas y emision/verificacion de JWT."""
from __future__ import annotations

from datetime import timedelta

import pytest

from shared_core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
    verify_token,
)


class TestPasswordHashing:
    def test_hash_no_es_el_password_en_plano(self):
        hashed = get_password_hash("SecurePass123!")
        assert hashed != "SecurePass123!"

    def test_verify_password_correcto(self):
        hashed = get_password_hash("SecurePass123!")
        assert verify_password("SecurePass123!", hashed) is True

    def test_verify_password_incorrecto(self):
        hashed = get_password_hash("correct-password")
        assert verify_password("wrong-password", hashed) is False

    def test_hash_es_salteado(self):
        """Dos hashes del mismo password deben diferir (salt aleatorio)."""
        h1 = get_password_hash("same-password")
        h2 = get_password_hash("same-password")
        assert h1 != h2
        # ...pero ambos deben validar
        assert verify_password("same-password", h1) is True
        assert verify_password("same-password", h2) is True

    def test_password_vacio_no_revienta(self):
        hashed = get_password_hash("")
        assert verify_password("", hashed) is True
        assert verify_password("algo", hashed) is False


class TestJWTToken:
    def test_crear_y_verificar(self):
        token = create_access_token({"sub": "admin", "uid": 1, "role": "ADMIN"})
        payload = verify_token(token)
        assert payload is not None
        assert payload["sub"] == "admin"
        assert payload["uid"] == 1
        assert payload["role"] == "ADMIN"
        assert "exp" in payload

    def test_expiracion_personalizada(self):
        token = create_access_token({"sub": "u1"}, expires_delta=timedelta(hours=1))
        assert verify_token(token) is not None

    def test_token_invalido_devuelve_none(self):
        assert verify_token("no-es-un-token") is None

    def test_token_manipulado_devuelve_none(self):
        token = create_access_token({"sub": "admin"})
        tampered = token[:-5] + "XXXXX"
        assert verify_token(tampered) is None

    def test_claims_completos(self):
        data = {
            "sub": "doctor", "uid": 5, "email": "doc@test.com",
            "role": "MEDICO", "is_superuser": False,
        }
        payload = verify_token(create_access_token(data))
        assert payload is not None
        assert payload["email"] == "doc@test.com"
        assert payload["is_superuser"] is False

    def test_token_expirado_es_rechazado(self):
        """Un token con expiracion en el pasado no debe validar."""
        token = create_access_token({"sub": "admin"}, expires_delta=timedelta(seconds=-10))
        assert verify_token(token) is None


class TestSchemasCompartidos:
    def test_health_check(self):
        from shared_core.schemas import HealthCheck

        payload = HealthCheck(status="healthy", service="user")
        assert payload.status == "healthy"
        assert payload.service == "user"
        assert payload.version == "1.0.0"

    def test_health_check_service_por_defecto(self):
        from shared_core.schemas import HealthCheck

        assert HealthCheck(status="ok").service == "unknown"

    @pytest.mark.parametrize("nombre", [
        "PatientCreate", "PatientUpdate", "PatientResponse",
        "UserCreate", "UserResponse", "UserRole", "TokenUser",
        "LoginRequest", "PasswordChangeRequest",
        "PredictionRequest", "PredictionResponse", "PredictionUpdate",
        "PlatformPredictionRequest", "PlatformPredictionResponse",
        "PlatformExplanationRequest", "PlatformExplanationResponse",
        "SimulationRequest", "SimulationResponse", "SimulationUpdate",
        "PlatformSimulationRequest",
        "WilcoxonRequest", "FriedmanRequest",
        "StatisticalTestCreate", "StatisticalTestUpdate",
    ])
    def test_shared_core_exporta_los_esquemas(self, nombre):
        """El gateway y los servicios importan estos nombres desde shared_core;
        si alguno falta, el arranque falla."""
        import shared_core.schemas as schemas

        assert hasattr(schemas, nombre), f"shared_core.schemas no exporta {nombre}"
