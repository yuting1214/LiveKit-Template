"""Realtime voice agent: OpenAI Realtime API (speech-to-speech)."""

import logging

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentSession,
    AgentServer,
    JobContext,
    cli,
)
from livekit.plugins import openai

load_dotenv()
logger = logging.getLogger("voice-agent-realtime")

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


@server.rtc_session()
async def entrypoint(ctx: JobContext):
    session = AgentSession(
        llm=openai.realtime.RealtimeModel(voice="coral"),
    )

    await session.start(agent=VoiceAssistant(), room=ctx.room)
    await session.generate_reply(
        instructions="Greet the user and offer your assistance."
    )


if __name__ == "__main__":
    cli.run_app(server)
