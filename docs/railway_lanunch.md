# Deploy and Host LiveKit on Railway

LiveKit is an open-source WebRTC platform for building real-time audio and video applications. It handles media routing, room management, and participant coordination — letting you build voice agents, video calls, and live streaming without managing low-level WebRTC infrastructure.

## About Hosting LiveKit

Hosting LiveKit requires running a media server with WebRTC connectivity, a Redis instance for room state coordination, and typically one or more backend workers that process media streams. On most cloud platforms, this means configuring UDP ports, TURN/STUN servers, and TLS termination — all of which add operational complexity. This template packages the entire stack — LiveKit server, a Python voice agent powered by OpenAI, a web frontend, and Redis — into a single Railway project with pre-configured networking, so you can go from zero to a working voice AI demo in minutes.

## Common Use Cases

- **Voice AI agents** — Build conversational AI assistants that listen and respond with natural speech using OpenAI's STT, LLM, and TTS models
- **Real-time transcription** — Capture and display live speech-to-text for both user and agent, with interim and final transcript states
- **Voice-enabled prototypes** — Quickly validate voice interaction ideas with a self-hosted stack before committing to a managed service

## Dependencies for LiveKit Hosting

- **Redis** — Required by LiveKit server for room state, participant tracking, and agent job dispatch
- **OpenAI API key** — Powers the voice agent's speech recognition (Whisper), language model (GPT-4o-mini), and text-to-speech (TTS-1)

### Deployment Dependencies

- [LiveKit Server](https://github.com/livekit/livekit) — Open-source WebRTC media server
- [LiveKit Agents (Python)](https://github.com/livekit/agents) — Framework for building real-time AI agents
- [OpenAI API](https://platform.openai.com/) — STT, LLM, and TTS provider for the voice pipeline

### Implementation Details

This template runs LiveKit in **TCP-only mode** since Railway does not support UDP. A Railway TCP proxy (application port `7882`) is used for WebRTC ICE media transport, with an entrypoint script that automatically configures port forwarding via iptables (or haproxy fallback).

The voice agent supports two modes, selected dynamically from the web UI (no restart or environment variable needed) — the frontend creates rooms with a `pipeline-` or `realtime-` prefix and the agent detects the mode from the room name:
- `pipeline` — OpenAI Whisper → GPT-4o-mini → TTS-1
- `realtime` — OpenAI Realtime API (speech-to-speech, lower latency)

## Why Deploy LiveKit on Railway?

Railway is a singular platform to deploy your infrastructure stack. Railway will host your infrastructure so you don't have to deal with configuration, while allowing you to vertically and horizontally scale it.

By deploying LiveKit on Railway, you are one step closer to supporting a complete full-stack application with minimal burden. Host your servers, databases, AI agents, and more on Railway.
