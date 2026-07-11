"""Voice agent that supports both pipeline and realtime sessions."""

import logging

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentSession,
    AgentServer,
    JobContext,
    JobProcess,
    cli,
)
from livekit.plugins import openai, silero

load_dotenv()
logger = logging.getLogger("voice-agent")


class _SuppressInferenceGatewayProbe(logging.Filter):
    """Drop the benign LiveKit-inference-gateway 401 from the logs.

    livekit-agents 1.4 opportunistically calls its hosted inference gateway
    (agent-gateway.livekit.cloud) for auxiliary steps. On a self-hosted
    deployment that gateway is authenticated with the local LIVEKIT_API_KEY
    and answers ``401 "insufficient permissions for this operation"``. It is
    non-fatal — every reply is produced by our own OpenAI models — but it
    otherwise clutters the logs. `turn_detection="vad"` on the pipeline
    session removes the main (per-turn) source; this filter suppresses any
    remaining probe. Real OpenAI errors carry a different message, so they
    are unaffected.
    """

    _SIGNATURE = "insufficient permissions for this operation"

    def filter(self, record: logging.LogRecord) -> bool:
        parts = [record.getMessage()]
        if record.exc_info:
            import traceback

            parts.append("".join(traceback.format_exception(*record.exc_info)))
        if getattr(record, "exc_text", None):
            parts.append(record.exc_text)
        return self._SIGNATURE not in " ".join(parts)


logging.getLogger("livekit.agents").addFilter(_SuppressInferenceGatewayProbe())

server = AgentServer()


class VoiceAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=(
                "You are a friendly voice AI assistant. "
                "Keep your responses concise and conversational. "
                "You are helpful, witty, and knowledgeable."
            ),
        )


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


def resolve_room_mode(room_name: str) -> str:
    if room_name.startswith("realtime-"):
        return "realtime"
    if room_name.startswith("pipeline-"):
        return "pipeline"
    return "pipeline"


@server.rtc_session()
async def entrypoint(ctx: JobContext):
    room_name = getattr(ctx.room, "name", "")
    mode = resolve_room_mode(room_name)

    logger.info("Starting %s session for room %s", mode, room_name)

    if mode == "realtime":
        session = AgentSession(
            llm=openai.realtime.RealtimeModel(
                model="gpt-realtime-2.1-mini",
                voice="coral",
            ),
        )
    else:
        session = AgentSession(
            # Streaming STT — has no server-side turn detection, so it relies on
            # the silero VAD loaded in prewarm() to commit audio at end-of-speech.
            stt=openai.STT(model="gpt-4o-mini-transcribe"),
            llm=openai.LLM(model="gpt-5.6-luna"),
            tts=openai.TTS(model="gpt-4o-mini-tts", voice="alloy"),
            vad=ctx.proc.userdata["vad"],
            # Pin turn detection to the local VAD. Without this, livekit-agents
            # tries its inference end-of-utterance model, which (with no local
            # turn-detector plugin) falls back to the LiveKit Cloud gateway and
            # 401s on self-hosted API keys — harmless but noisy in the logs.
            turn_detection="vad",
        )

    await session.start(agent=VoiceAssistant(), room=ctx.room)
    await session.generate_reply(
        instructions="Greet the user and offer your assistance."
    )


if __name__ == "__main__":
    cli.run_app(server)
