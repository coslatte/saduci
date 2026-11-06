"""El catálogo migrado se puede consultar mediante la API."""
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.main import app
from app.models.database import get_db


def test_catalogo_migrado_y_ids_autogenerados(tmp_path, monkeypatch):
    database_url = f"sqlite:///{tmp_path / 'diagnoses.db'}"
    monkeypatch.setenv("DATABASE_URL", database_url)
    command.upgrade(Config("alembic.ini"), "head")
    engine = create_engine(database_url)

    def session():
        with Session(engine) as db:
            yield db

    app.dependency_overrides[get_db] = session
    try:
        with TestClient(app) as client:
            response = client.get("/api/diagnoses")
        assert response.status_code == 200
        diagnoses = response.json()
        assert len(diagnoses) == 41
        assert diagnoses[0] == {"id": 0, "name": "Vacío"}
        assert diagnoses[12] == {"id": 12, "name": "Insuficiencia cardiaca descompensada"}
        assert diagnoses[-1] == {"id": 40, "name": "Guillain Barré"}
        with engine.begin() as connection:
            connection.execute(text("INSERT INTO diagnoses (name) VALUES ('Prueba')"))
            assert connection.execute(text("SELECT id FROM diagnoses WHERE name = 'Prueba'")).scalar_one() == 41
    finally:
        app.dependency_overrides.pop(get_db, None)
        engine.dispose()
