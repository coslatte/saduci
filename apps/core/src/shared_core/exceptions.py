from __future__ import annotations

from fastapi import HTTPException, status


def raise_not_found(entity: str = "Resource") -> None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{entity} no encontrado.")


def raise_forbidden(message: str = "No tienes permisos para realizar esta acción") -> None:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=message)


def raise_conflict(message: str = "Ya existe un recurso con esos datos") -> None:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=message)


def raise_unauthorized(message: str = "Credenciales inválidas") -> None:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=message,
        headers={"WWW-Authenticate": "Bearer"},
    )


def raise_bad_request(message: str) -> None:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)


def translate_upstream_error(error: Exception, unavailable_detail: str) -> HTTPException:
    from httpx import TimeoutException, HTTPStatusError, RequestError
    if isinstance(error, TimeoutException):
        return HTTPException(status_code=504, detail="Servidor aguas arriba agotó el tiempo de espera")
    if isinstance(error, HTTPStatusError):
        return HTTPException(status_code=error.response.status_code, detail=str(error.response.text))
    if isinstance(error, RequestError):
        return HTTPException(status_code=502, detail=unavailable_detail)
    return HTTPException(status_code=502, detail=unavailable_detail)


def extract_upstream_detail(error: Exception) -> str:
    from httpx import HTTPStatusError
    if isinstance(error, HTTPStatusError):
        try:
            payload = error.response.json()
            if isinstance(payload, dict) and "detail" in payload:
                return str(payload["detail"])
        except ValueError:
            pass
        return str(error.response.text.strip() or f"Upstream returned HTTP {error.response.status_code}")
    return str(error)
