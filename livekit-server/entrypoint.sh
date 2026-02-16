#!/bin/bash
set -euo pipefail

# Parse REDIS_URL into components
# Format: redis://default:password@host:port
if [ -z "${REDIS_URL:-}" ]; then
  echo "ERROR: REDIS_URL is not set"
  exit 1
fi

# Extract host:port and password from REDIS_URL
REDIS_PASSWORD=$(echo "$REDIS_URL" | sed -n 's|redis://[^:]*:\([^@]*\)@.*|\1|p')
REDIS_HOST_PORT=$(echo "$REDIS_URL" | sed -n 's|redis://[^@]*@\(.*\)|\1|p')

if [ -z "$REDIS_HOST_PORT" ]; then
  echo "ERROR: Could not parse REDIS_URL: $REDIS_URL"
  exit 1
fi

echo "Parsed Redis address: $REDIS_HOST_PORT"

# Generate livekit.yaml config
# On Railway, only one port is exposed. We use port for signaling (HTTP/WS)
# and a high internal TCP port for WebRTC media (Railway proxies TCP traffic).
cat > /etc/livekit.yaml <<EOF
port: ${PORT}
bind_addresses:
  - "0.0.0.0"
log_level: info

rtc:
  tcp_port: 7881
  port_range_start: 0
  port_range_end: 0
  use_external_ip: false
  force_tcp: true
  enable_loopback_candidate: false

redis:
  address: ${REDIS_HOST_PORT}
  password: ${REDIS_PASSWORD}

keys:
  ${LIVEKIT_API_KEY}: ${LIVEKIT_API_SECRET}

room:
  auto_create: true

turn:
  enabled: false
EOF

echo "Generated LiveKit config:"
cat /etc/livekit.yaml
echo ""
echo "Starting LiveKit server on port ${PORT} (TCP media on 7881)..."

exec livekit-server --config /etc/livekit.yaml --node-ip 0.0.0.0
