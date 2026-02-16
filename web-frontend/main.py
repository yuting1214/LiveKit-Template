"""Lightweight web frontend for testing the LiveKit voice agent."""

import os
import uuid

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from livekit import api

app = FastAPI(title="LiveKit Voice Agent Test")
templates = Jinja2Templates(directory=os.path.join(os.path.dirname(__file__), "templates"))

LIVEKIT_URL = os.environ.get("LIVEKIT_URL", "ws://localhost:7880")
LIVEKIT_API_KEY = os.environ.get("LIVEKIT_API_KEY", "devkey")
LIVEKIT_API_SECRET = os.environ.get("LIVEKIT_API_SECRET", "secret")


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {
        "request": request,
        "livekit_url": LIVEKIT_URL,
    })


@app.post("/api/token")
async def create_token(request: Request):
    body = await request.json()
    room_name = body.get("room", f"test-room-{uuid.uuid4().hex[:8]}")
    identity = body.get("identity", f"user-{uuid.uuid4().hex[:6]}")

    token = (
        api.AccessToken(api_key=LIVEKIT_API_KEY, api_secret=LIVEKIT_API_SECRET)
        .with_identity(identity)
        .with_name(identity)
        .with_grants(api.VideoGrants(room_join=True, room=room_name))
        .to_jwt()
    )

    return {"token": token, "url": LIVEKIT_URL, "room": room_name, "identity": identity}


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
