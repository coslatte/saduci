"""Tests del repositorio del user service contra SQLite en memoria.

Se ejercita la capa de repositorio directamente (sin HTTP), que es donde vive
la logica de negocio de usuarios.
"""
from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.database import Base
from app.models.user import User
from app.repositories import user_repository as repo


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


class TestCreateUser:
    def test_crea_usuario_con_defaults(self, db):
        user = repo.create_user(
            db, username="nuevo", email="nuevo@test.com", password="Pass1234"
        )
        assert user.id is not None
        assert user.username == "nuevo"
        assert user.email == "nuevo@test.com"
        assert user.role == "MEDICO"
        assert user.is_active is True

    def test_crea_usuario_con_rol(self, db):
        user = repo.create_user(
            db, username="admin2", email="admin2@test.com",
            password="Pass1234", role="ADMIN",
        )
        assert user.role == "ADMIN"

    def test_no_guarda_el_password_en_plano(self, db):
        user = repo.create_user(
            db, username="seguro", email="seguro@test.com", password="Pass1234"
        )
        assert user.hashed_password != "Pass1234"

    def test_normaliza_identifier_recorta_espacios(self, db):
        assert repo.normalize_identifier("  espaciado  ") == "espaciado"


class TestBusquedas:
    @pytest.fixture(autouse=True)
    def _poblar(self, db):
        self.admin = repo.create_user(
            db, username="Admin", email="Admin@Test.com",
            password="Pass1234", role="ADMIN",
        )
        self.medico = repo.create_user(
            db, username="medico", email="medico@test.com", password="Pass1234"
        )

    def test_get_by_id(self, db):
        found = repo.get_user_by_id(db, self.medico.id)
        assert found is not None and found.username == "medico"

    def test_get_by_id_inexistente(self, db):
        assert repo.get_user_by_id(db, 999999) is None

    def test_get_by_id_no_numerico_no_revienta(self, db):
        assert repo.get_user_by_id(db, "no-es-un-id") is None

    def test_get_by_username_case_insensitive(self, db):
        assert repo.get_user_by_username(db, "medico") is not None
        assert repo.get_user_by_username(db, "MEDICO") is not None

    def test_get_by_email(self, db):
        found = repo.get_user_by_email(db, "medico@test.com")
        assert found is not None and found.username == "medico"

    def test_get_by_identifier_acepta_username_o_email(self, db):
        assert repo.get_user_by_identifier(db, "medico") is not None
        assert repo.get_user_by_identifier(db, "medico@test.com") is not None
        assert repo.get_user_by_identifier(db, "noexiste") is None
        assert repo.get_user_by_identifier(db, "   ") is None

    def test_get_all_users(self, db):
        users = repo.get_all_users(db)
        assert len(users) >= 2

    def test_get_users_by_role(self, db):
        admins = repo.get_users_by_role(db, "ADMIN")
        assert len(admins) == 1
        assert admins[0].username == "Admin"

    def test_count_users(self, db):
        inicial = repo.count_users(db)
        repo.create_user(db, username="extra", email="extra@t.com", password="Pass1234")
        assert repo.count_users(db) == inicial + 1


class TestActualizaciones:
    def test_update_campos(self, db):
        user = repo.create_user(
            db, username="actualizable", email="old@test.com", password="Pass1234"
        )
        updated = repo.update_user(db, user, email="new@test.com", role="ESPECIALISTA")
        assert updated.email == "new@test.com"
        assert updated.role == "ESPECIALISTA"

    def test_update_is_active(self, db):
        user = repo.create_user(
            db, username="activo", email="activo@test.com", password="Pass1234"
        )
        assert repo.update_user(db, user, is_active=False).is_active is False

    def test_update_password(self, db):
        user = repo.create_user(
            db, username="cambio", email="cambio@test.com", password="OldPass123"
        )
        repo.update_password(db, user, "NewPass456")
        assert repo.authenticate_user(db, "cambio", "NewPass456") is not None
        assert repo.authenticate_user(db, "cambio", "OldPass123") is None

    def test_delete_user(self, db):
        user = repo.create_user(
            db, username="borrable", email="borrable@test.com", password="Pass1234"
        )
        uid = user.id
        assert repo.delete_user(db, uid) is True
        assert repo.get_user_by_id(db, uid) is None

    def test_delete_inexistente(self, db):
        assert repo.delete_user(db, 999999) is False


class TestAutenticacion:
    def test_autentica_con_password_correcto(self, db):
        repo.create_user(db, username="auth", email="auth@test.com", password="CorrectPass1")
        user = repo.authenticate_user(db, "auth", "CorrectPass1")
        assert user is not None and user.username == "auth"

    def test_autentica_por_email(self, db):
        repo.create_user(db, username="poremail", email="login@test.com", password="Pass12345")
        assert repo.authenticate_user(db, "login@test.com", "Pass12345") is not None

    def test_rechaza_password_incorrecto(self, db):
        repo.create_user(db, username="bad", email="bad@test.com", password="RightPass1")
        assert repo.authenticate_user(db, "bad", "WrongPass1") is None

    def test_rechaza_usuario_deshabilitado(self, db):
        user = repo.create_user(
            db, username="off", email="off@test.com", password="Pass12345"
        )
        repo.update_user(db, user, is_active=False)
        assert repo.authenticate_user(db, "off", "Pass12345") is None

    def test_rechaza_usuario_inexistente(self, db):
        assert repo.authenticate_user(db, "fantasma", "Pass12345") is None


class TestModeloUser:
    def test_tablename(self):
        assert User.__tablename__ == "users"
