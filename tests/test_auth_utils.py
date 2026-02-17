from datetime import timedelta

from shared.utils.auth import create_access_token, get_password_hash, verify_password, verify_token


def test_password_hash_and_verify_roundtrip() -> None:
    plain_password = "safe-password-123"
    hashed_password = get_password_hash(plain_password)

    assert hashed_password != plain_password
    assert verify_password(plain_password, hashed_password) is True
    assert verify_password("wrong-password", hashed_password) is False


def test_create_and_verify_access_token() -> None:
    token = create_access_token({"sub": "clinical_user"}, expires_delta=timedelta(minutes=1))
    payload = verify_token(token)

    assert payload is not None
    assert payload["sub"] == "clinical_user"
    assert "exp" in payload


def test_verify_token_returns_none_for_invalid_token() -> None:
    assert verify_token("this-is-not-a-jwt") is None
