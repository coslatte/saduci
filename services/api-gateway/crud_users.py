"""User CRUD helpers for the API Gateway."""
from __future__ import annotations

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from models import User
from shared.utils import get_password_hash, verify_password


def normalize_identifier(value: str) -> str:
  return value.strip()


def get_user_by_id(db: Session, user_id: int) -> User | None:
  try:
      return db.get(User, int(user_id))
  except (TypeError, ValueError):
      return None


def get_user_by_identifier(db: Session, identifier: str) -> User | None:
  normalized = normalize_identifier(identifier)
  if not normalized:
      return None

  lowered = normalized.lower()
  return (
      db.query(User)
      .filter(
          or_(
              func.lower(User.username) == lowered,
              func.lower(User.email) == lowered,
          )
      )
      .first()
  )


def count_users(db: Session) -> int:
  return db.query(User).count()


def create_user(
  db: Session,
  *,
  username: str,
  email: str,
  password: str,
  is_active: bool = True,
  is_superuser: bool = False,
) -> User:
  user = User(
      username=normalize_identifier(username),
      email=normalize_identifier(email).lower(),
      hashed_password=get_password_hash(password),
      is_active=is_active,
      is_superuser=is_superuser,
  )
  db.add(user)
  db.commit()
  db.refresh(user)
  return user


def update_password(db: Session, user: User, new_password: str) -> User:
  user.hashed_password = get_password_hash(new_password)
  db.add(user)
  db.commit()
  db.refresh(user)
  return user


def authenticate_user(db: Session, identifier: str, password: str) -> User | None:
  user = get_user_by_identifier(db, identifier)
  if user is None or not user.is_active:
      return None

  if not verify_password(password, user.hashed_password):
      return None

  return user
