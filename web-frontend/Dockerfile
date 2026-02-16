FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

WORKDIR /app

# Install dependencies from lockfile
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project

# Copy application source
COPY . .
RUN uv sync --frozen

CMD ["uv", "run", "python", "main.py"]
