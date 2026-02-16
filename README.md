# LiveKit Self-Hosted Railway Template

Deploy a fully self-hosted LiveKit voice AI stack on Railway — LiveKit server, Python voice agent, Redis, and a web test frontend — with zero external dependencies beyond an OpenAI API key.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/your-template-id)

## Architecture

```
Railway Project
├── livekit-server    Media server — routes audio between clients and agents
├── voice-agent       Worker process — the AI brain that listens and responds
├── web-frontend      Web server — test page where you talk to the agent
└── Redis             State store — room and session coordination
```

```
┌─────────┐  WSS (audio)   ┌────────────────┐  internal   ┌─────────────┐
│ Browser  │◄──────────────►│ livekit-server  │◄───────────►│ voice-agent │
│          │                │                 │             │  (worker)   │
│          │  HTTPS (page)  │                 │   Redis     │             │
│          │◄──────────────►├────────────────►│◄───────────►│             │
│          │                │  web-frontend   │             │             │
└─────────┘                └────────────────┘             └─────────────┘
```

## Services Explained

### livekit-server — Media Router

The core infrastructure. LiveKit is an open-source WebRTC server that handles real-time audio/video routing. It manages rooms, tracks who's connected, and shuttles audio packets between participants (your browser) and agents.

- Runs in **TCP-only mode** (Railway doesn't support UDP)
- Generates its config at startup from environment variables
- Needs a public domain for browser WebSocket connections
- Uses Redis to coordinate room state

### voice-agent — AI Worker

A **background worker process** (not a web server). It connects outbound to the LiveKit server, registers itself as available, and waits. When a user joins a room, LiveKit dispatches the agent to that room where it:

1. Receives the user's audio stream
2. Processes it through an AI pipeline (STT → LLM → TTS)
3. Sends synthesized speech audio back

This is a separate service because:
- It has no HTTP port — it's a consumer, not a server
- It can crash/restart without affecting the frontend
- You can scale it independently (multiple workers for concurrent sessions)
- Redeploying new AI logic doesn't cause frontend downtime

Supports two modes:
- **Pipeline** (default) — OpenAI Whisper → GPT-4o-mini → TTS-1 (separate models, more control)
- **Realtime** — OpenAI Realtime API (single model, lower latency)

### web-frontend — Test Interface

A lightweight FastAPI web server that:
- Serves an HTMX test page with a "Connect" button and audio visualizer
- Provides a `/api/token` endpoint that generates LiveKit access tokens
- The browser uses these tokens + the LiveKit JS SDK to join a room directly

The actual audio never flows through this service — it's just the entry point. Once connected, the browser talks directly to `livekit-server` via WebSocket.

### Redis — State Coordination

Railway-managed Redis instance. LiveKit uses it to track active rooms, participants, and agent assignments. Required for LiveKit server to function.

## Deploy to Railway

1. Click the **Deploy on Railway** button above
2. Set your `OPENAI_API_KEY` in the voice-agent service variables
3. Wait for all services to deploy
4. Add a public domain to the `livekit-server` service (Settings → Networking → Generate Domain)
5. Add a public domain to the `web-frontend` service
6. Open the web frontend URL in your browser and click **Connect**

## Agent Modes

### Pipeline Mode (default)

Uses separate models for each stage:
- **STT**: OpenAI Whisper
- **LLM**: GPT-4o-mini
- **TTS**: OpenAI TTS-1

Set `AGENT_MODE=pipeline` (or leave as default).

### Realtime Mode

Uses OpenAI's Realtime API for speech-to-speech (lowest latency):

Set `AGENT_MODE=realtime` and redeploy the voice-agent service.

## Local Development

```bash
# Copy env file and add your OpenAI key
cp .env.example .env
# Edit .env with your OPENAI_API_KEY

# Start all services
docker compose up --build
```

Open http://localhost:8000 in your browser.

Local dev uses full UDP mode (no TCP-only restriction).

## Environment Variables

### livekit-server
| Variable | Description |
|----------|-------------|
| `PORT` | Auto-assigned by Railway |
| `LIVEKIT_API_KEY` | API key for authentication |
| `LIVEKIT_API_SECRET` | API secret for authentication |
| `REDIS_URL` | Redis connection URL |

### voice-agent
| Variable | Description |
|----------|-------------|
| `LIVEKIT_URL` | LiveKit server WebSocket URL |
| `LIVEKIT_API_KEY` | Shared with livekit-server |
| `LIVEKIT_API_SECRET` | Shared with livekit-server |
| `OPENAI_API_KEY` | Your OpenAI API key |
| `AGENT_MODE` | `pipeline` or `realtime` |

### web-frontend
| Variable | Description |
|----------|-------------|
| `PORT` | Auto-assigned by Railway |
| `LIVEKIT_URL` | LiveKit server WebSocket URL |
| `LIVEKIT_API_KEY` | Shared with livekit-server |
| `LIVEKIT_API_SECRET` | Shared with livekit-server |

## Customization

**Swap LLM provider**: Edit `voice-agent/agent.py` — replace `openai.LLM(...)` with any supported plugin (Anthropic, Google, etc.) and add the corresponding dependency to `pyproject.toml`.

**Add tools**: Add function tools to the `VoiceAssistant` agent class using LiveKit's tool decorator pattern.

**Change voice**: Modify the `voice` parameter in the TTS or RealtimeModel constructor.

## Limitations

- **TCP-only**: Railway doesn't support UDP, so LiveKit runs in `force_tcp` mode. This works well for voice but adds slight latency compared to UDP.
- **No TURN/UDP**: WebRTC media flows over TCP WebSocket tunneling.
- **Single region**: All services run in the same Railway region.

For production workloads with lowest latency, consider [LiveKit Cloud](https://livekit.io/cloud).

## License

MIT
