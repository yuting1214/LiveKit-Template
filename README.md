# LiveKit Self-Hosted Railway Template

Deploy a fully self-hosted LiveKit voice AI stack on Railway — LiveKit server, Python voice agent, Redis, and a web test frontend — with zero external dependencies beyond an OpenAI API key.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/your-template-id)

## Architecture

```
Railway Project
├── livekit-server    LiveKit server (TCP-only mode for Railway)
├── voice-agent       Python AI agent (pipeline or realtime mode)
├── web-frontend      HTMX test page with audio visualizer
└── Redis             Session/room state store
```

**Networking:**
- Browser connects to `livekit-server` via public WSS (Railway domain)
- Browser connects to `web-frontend` via public HTTPS
- `voice-agent` connects to `livekit-server` via Railway private networking
- `livekit-server` connects to `Redis` via private networking

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
