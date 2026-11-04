"""WebSocket events and internal broadcast endpoint."""
from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, WebSocket, WebSocketDisconnect

from app.controllers.config import INTERNAL_EVENT_TOKEN
from app.websocket.manager import manager
from shared_core.security import verify_token

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/events")
async def websocket_events(websocket: WebSocket, token: str = ""):
    """WebSocket endpoint for real-time database change events.

    Requiere un JWT valido en el query param ``token``; sin el la conexion se
    cierra con 1008 (policy violation).
    """
    if verify_token(token) is None:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@router.post("/api/internal/event")
async def broadcast_event(event: dict, x_internal_token: str = Header(default="")):
    """Internal endpoint for services to broadcast events to connected frontends."""
    if x_internal_token != INTERNAL_EVENT_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid internal token")
    await manager.broadcast(event)
    return {"ok": True}
