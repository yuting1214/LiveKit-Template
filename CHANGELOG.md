# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-07-11

Refresh to the latest OpenAI voice models, a transcript UX fix, and clean logs on self-hosted deployments.

### Models
- **Pipeline upgraded** — `whisper-1` → `gpt-4o-mini-transcribe` (streaming STT), `gpt-4o-mini` → **GPT-5.6 Luna** (LLM), `tts-1` → `gpt-4o-mini-tts` (TTS).
- **Realtime upgraded** — `gpt-realtime-2.1-mini` (speech-to-speech).
- **`livekit-agents` 1.3 → 1.4** (pinned `>=1.4,<1.5`) — needed for streaming transcription support.

### Voice Agent
- **Turn detection pinned to VAD** (`turn_detection="vad"`) — keeps end-of-utterance detection on the local silero VAD instead of falling back to LiveKit's cloud inference gateway, which returns `401` on self-hosted API keys. Every inference now runs on your own OpenAI account.
- **Gateway log noise removed** — a narrow filter drops the residual benign `401 "insufficient permissions"` records; real OpenAI errors are unaffected. Verified 8/8 pipeline and 4/4 realtime replies with zero error logs.

### Web Frontend
- **Transcript console** — no longer snaps to the bottom when you scroll up to read earlier lines mid-conversation, and long words/URLs wrap instead of overflowing the box.
- **Mode subtitles** updated to reflect the new models.

## [0.1.0] - 2026-03-22

Initial release of the self-hosted LiveKit voice AI stack — LiveKit server, Python voice agent, Redis, and web frontend — deployable to Railway with only an OpenAI API key.

### Architecture
- **Four-service stack**: `livekit-server` (WebRTC media router), `voice-agent` (AI worker), `web-frontend` (test UI + token server), and Railway-managed `Redis` (room/session coordination). Audio flows browser ↔ `livekit-server` ↔ `voice-agent`; the frontend is signaling/token only and never sees the media path.
- **Zero external dependencies** beyond an OpenAI API key — no LiveKit Cloud, no third-party STT/TTS accounts.

### Voice Agent
- **Two selectable modes** — `pipeline` (Whisper STT → GPT-4o-mini → TTS-1, more control) and `realtime` (OpenAI Realtime API, single speech-to-speech model, lower latency).
- **Dynamic mode switching from the web UI**: the frontend creates rooms with a `pipeline-` or `realtime-` prefix and the agent detects the mode from the room name — no restart and no `AGENT_MODE` env var required.
- **Background worker model** (not a web server): connects outbound to LiveKit, registers as available, and is dispatched into a room on demand where it streams audio in, runs the AI pipeline, and publishes synthesized speech plus transcriptions for both user and agent.

### Web Frontend
- **Two voice pages** at `/pipeline` and `/realtime`, switchable via nav tabs, served by a lightweight FastAPI app with a `/api/token` endpoint for LiveKit access tokens.
- **WebGL aura visualizer**: shader-based aurora effect (turbulence, bloom, color-shifting) that reacts to agent state and audio volume, powered by the official LiveKit `agents-ui` component.
- **Live transcript console**: real-time "You:" / "Agent:" lines with interim (partial) and final states.
- **Cyan-themed, responsive UI**: `#00e5ff` palette with translucent glow, a minimal dot + text `StatusBadge`, full-width mobile connect button, and safe-area support; the aura shrinks when the transcript appears instead of overflowing.
- **One-click connect**: generates a token and joins a room via the LiveKit JS SDK.

### Deployment
- **Railway one-click deploy template** for the full stack, with a `railway-deploy` Claude skill (`.claude/skills/railway-deploy/`) that automates the deployment lifecycle and includes a verification script.
- **TCP-only WebRTC on Railway**: LiveKit runs in `force_tcp` mode (Railway has no UDP) and uses a Railway TCP proxy on application port `7882` for ICE media; `LIVEKIT_NODE_IP_MODE=auto` yields correct ICE candidates. The TCP proxy must be added manually after each fresh deploy — Railway templates cannot auto-create it.
- **Startup-generated config**: `livekit-server` renders its configuration from environment variables at boot.

### Local Development
- **`docker compose up --build`** runs the entire stack locally with full UDP mode (no TCP-only restriction); frontend served at `http://localhost:8000`.
- **Debug monitor overlay** in dev builds shows live mic/agent RMS levels.

### Fixed
- **esbuild `++`-on-cast rejection**: corrected `(value as number)++` in vendored `react-shader-toy.tsx` that esbuild refused to compile.
