"""Shared database startup behavior for backend services."""
import time
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect
from sqlalchemy.exc import SQLAlchemyError


def initialize_database(base, engine, logger, migrations: str, attempts: int = 6) -> None:
    """Adopt an existing schema once, then apply versioned migrations."""
    for attempt in range(attempts):
        try:
            config = Config()
            config.set_main_option("script_location", str(Path(migrations).resolve()))
            config.attributes["connection"] = engine.connect()
            config.attributes["target_metadata"] = base.metadata
            try:
                if not inspect(engine).has_table("alembic_version"):
                    base.metadata.create_all(bind=engine)
                    command.stamp(config, "head")
                else:
                    command.upgrade(config, "head")
            finally:
                config.attributes["connection"].close()
            return
        except SQLAlchemyError:
            if attempt + 1 == attempts:
                raise
            delay = min(0.5 * (2**attempt), 5)
            logger.warning(
                "Database unavailable during startup; retrying in %.1fs",
                delay,
                exc_info=True,
            )
            time.sleep(delay)
