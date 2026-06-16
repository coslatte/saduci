"""User CRUD helpers for the API Gateway."""
from __future__ import annotations

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from models import User, UserRole
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
  role: str = "MEDICO",
  is_active: bool = True,
  is_superuser: bool = False,
) -> User:
  user = User(
      username=normalize_identifier(username),
      email=normalize_identifier(email).lower(),
      hashed_password=get_password_hash(password),
      role=UserRole(role) if isinstance(role, str) else role,
      is_active=is_active,
      is_superuser=is_superuser,
  )
  db.add(user)
  db.commit()
  db.refresh(user)
  return user


def update_user(
  db: Session,
  user: User,
  *,
  email: str | None = None,
  role: str | None = None,
  is_active: bool | None = None,
) -> User:
  if email is not None:
      user.email = normalize_identifier(email).lower()
  if role is not None:
      user.role = UserRole(role) if isinstance(role, str) else role
  if is_active is not None:
      user.is_active = is_active
  
  db.add(user)
  db.commit()
  db.refresh(user)
  return user


def delete_user(db: Session, user: User) -> None:
  db.delete(user)
  db.commit()


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


def get_all_users(db: Session, skip: int = 0, limit: int = 100) -> list[User]:
  return db.query(User).offset(skip).limit(limit).all()


def get_users_by_role(db: Session, role: str, skip: int = 0, limit: int = 100) -> list[User]:
  return (
      db.query(User)
      .filter(User.role == UserRole(role) if isinstance(role, str) else role)
      .offset(skip)
      .limit(limit)
      .all()
  )

