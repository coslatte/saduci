from __future__ import annotations

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.user import User
from shared_core.security import get_password_hash, verify_password


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


def get_user_by_username(db: Session, username: str) -> User | None:
    normalized = normalize_identifier(username)
    if not normalized:
        return None
    return (
        db.query(User).filter(func.lower(User.username) == normalized.lower()).first()
    )


def get_user_by_email(db: Session, email: str) -> User | None:
    normalized = normalize_identifier(email)
    if not normalized:
        return None
    return db.query(User).filter(func.lower(User.email) == normalized.lower()).first()


def count_users(db: Session) -> int:
    return db.query(User).count()


def get_all_users(db: Session, skip: int = 0, limit: int = 100) -> list[User]:
    return (
        db.query(User).order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    )


def get_users_by_role(
    db: Session, role: str, skip: int = 0, limit: int = 100
) -> list[User]:
    return (
        db.query(User)
        .filter(func.lower(User.role) == role.lower())
        .order_by(User.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def update_user(
    db: Session,
    user: User,
    *,
    username: str | None = None,
    email: str | None = None,
    role: str | None = None,
    is_active: bool | None = None,
    avatar: str | None = None,
) -> User:
    if username is not None:
        user.username = normalize_identifier(username)
    if email is not None:
        user.email = normalize_identifier(email).lower()
    if role is not None:
        user.role = role
    if is_active is not None:
        user.is_active = is_active
    if avatar is not None:
        user.avatar = avatar
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int) -> bool:
    user = db.get(User, user_id)
    if user is None:
        return False
    db.delete(user)
    db.commit()
    return True


def create_user(
    db: Session,
    *,
    username: str,
    email: str,
    password: str,
    role: str = "MEDICO",
    is_active: bool = True,
) -> User:
    user = User(
        username=normalize_identifier(username),
        email=normalize_identifier(email).lower(),
        hashed_password=get_password_hash(password),
        role=role,
        is_active=is_active,
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
