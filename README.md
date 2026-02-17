<p align="center">
  <img src="media/livekit-icon.png" alt="LiveKit" width="80" />
</p>

<h1 align="center">LiveKit Self-Hosted Voice AI on Railway</h1>

<p align="center">
  Deploy a fully self-hosted LiveKit voice AI stack on Railway — LiveKit server, Python voice agent, Redis, and a web frontend — with zero external dependencies beyond an OpenAI API key.
</p>

<p align="center">
  <a href="https://railway.com/deploy/OAu9be?referralCode=jk_FgY&utm_medium=integration&utm_source=template&utm_campaign=generic">
    <img src="https://railway.com/button.svg" alt="Deploy on Railway" />
  </a>
</p>

---

## Architecture

```
Railway Project
├── livekit-server    Media server — routes audio between clients and agents
├── voice-agent       Worker process — the AI brain that listens and responds
├── web-frontend      Web server — test UI where you talk to the agent
└── Redis             State store — room and session coordination
```

```
┌─────────┐  WSS (signaling)  ┌────────────────┐  internal   ┌─────────────┐
│ Browser  │◄────────────────►│ livekit-server  │◄───────────►│ voice-agent │
│          │  TCP (ICE media)  │                 │             │  (worker)   │
│          │◄────────────────►│                 │   Redis     │             │
│          │  HTTPS (page)    ├─────────────────┤◄───────────►│             │
│          │◄────────────────►│  web-frontend   │             │             │
└─────────┘                   └─────────────────┘             └─────────────┘
```

## Web Frontend

The frontend provides two voice agent pages at `/pipeline` and `/realtime`, each with:

- **Audio visualizer** — animates for both your microphone input and agent audio output
- **Live transcript console** — shows "You:" and "Agent:" lines in real time, with interim (partial) and final states
- **One-click connect** — generates a LiveKit token and joins a room via the LiveKit JS SDK

The landing page (`/`) lets you choose between Pipeline and Realtime modes.

## Services

### livekit-server — Media Router

Open-source WebRTC server that handles real-time audio routing. Manages rooms, tracks participants, and shuttles audio between your browser and the agent.

- Runs in **TCP-only mode** on Railway (no UDP support)
- Uses Railway's **TCP proxy** for WebRTC ICE media (application port `7882`)
- Generates config at startup from environment variables
- Needs a public domain for browser WebSocket signaling

### voice-agent — AI Worker

A **background worker process** (not a web server). Connects outbound to LiveKit, registers as available, and waits. When a user joins a room, LiveKit dispatches the agent to that room where it:

1. Receives the user's audio stream
2. Processes it through an AI pipeline
3. Sends synthesized speech audio back
4. Publishes transcriptions for both user and agent speech

Supports two modes controlled by `AGENT_MODE`:

| Mode | Pipeline | Description |
|------|----------|-------------|
| `pipeline` | Whisper STT → GPT-4o-mini → TTS-1 | Separate models, more control |
| `realtime` | OpenAI Realtime API | Single model, lower latency |

### web-frontend — Test Interface

A lightweight FastAPI server that serves the voice UI and provides a `/api/token` endpoint for LiveKit access tokens. Audio never flows through this service — once connected, the browser talks directly to `livekit-server`.

### Redis — State Coordination

Railway-managed Redis. LiveKit uses it to track active rooms, participants, and agent assignments.

## Deploy to Railway

1. Click the **Deploy on Railway** button above
2. Set your `OPENAI_API_KEY` when prompted
3. Wait for all services to deploy
4. **Add a TCP proxy** to `livekit-server` (Settings → Networking → TCP Proxy → application port `7882`)
5. **Redeploy `livekit-server`** after adding the TCP proxy
6. Add a public domain to `livekit-server` and `web-frontend` (Settings → Networking → Generate Domain)
7. Open the web frontend URL and click **Connect**

> **Important**: Step 4-5 are required for WebRTC media to work. Railway templates cannot auto-create TCP proxies — this must be done manually after every fresh deploy. See [docs/railway-ui-manual-setup.md](docs/railway-ui-manual-setup.md) for detailed instructions.

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
| `LIVEKIT_API_KEY` | API key for authentication |
| `LIVEKIT_API_SECRET` | API secret for authentication |
| `REDIS_URL` | Redis connection URL (`${{Redis.REDIS_URL}}` on Railway) |
| `LIVEKIT_NODE_IP_MODE` | Set to `auto` on Railway for correct ICE candidates |

### voice-agent

| Variable | Description |
|----------|-------------|
| `LIVEKIT_URL` | LiveKit server WebSocket URL (`wss://...`) |
| `LIVEKIT_API_KEY` | Shared with livekit-server |
| `LIVEKIT_API_SECRET` | Shared with livekit-server |
| `OPENAI_API_KEY` | Your OpenAI API key |
| `AGENT_MODE` | `pipeline` (default) or `realtime` |

### web-frontend

| Variable | Description |
|----------|-------------|
| `LIVEKIT_URL` | LiveKit server WebSocket URL (`wss://...`) |
| `LIVEKIT_API_KEY` | Shared with livekit-server |
| `LIVEKIT_API_SECRET` | Shared with livekit-server |

## Customization

**Swap LLM provider**: Edit `voice-agent/agent.py` — replace `openai.LLM(...)` with any supported plugin (Anthropic, Google, etc.) and add the corresponding dependency to `pyproject.toml`.

**Add tools**: Add function tools to the `VoiceAssistant` agent class using LiveKit's tool decorator pattern.

**Change voice**: Modify the `voice` parameter in the TTS or RealtimeModel constructor.

## Limitations

- **TCP-only**: Railway doesn't support UDP, so LiveKit runs in `force_tcp` mode. Works well for voice but adds slight latency compared to UDP.
- **Manual TCP proxy**: Railway templates cannot auto-create TCP proxies. This must be added manually after each template deploy.
- **Single region**: All services run in the same Railway region.

For production workloads with lowest latency, consider [LiveKit Cloud](https://livekit.io/cloud).

## License

[MIT](LICENSE)
