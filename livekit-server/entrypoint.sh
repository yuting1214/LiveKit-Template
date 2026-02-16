#!/bin/bash
set -euo pipefail

# Parse REDIS_URL into components
if [ -z "${REDIS_URL:-}" ]; then
  echo "ERROR: REDIS_URL is not set"
  exit 1
fi

REDIS_PASSWORD=$(echo "$REDIS_URL" | sed -n 's|redis://[^:]*:\([^@]*\)@.*|\1|p')
REDIS_HOST_PORT=$(echo "$REDIS_URL" | sed -n 's|redis://[^@]*@\(.*\)|\1|p')

if [ -z "$REDIS_HOST_PORT" ]; then
  echo "ERROR: Could not parse REDIS_URL: $REDIS_URL"
  exit 1
fi

echo "Parsed Redis address: $REDIS_HOST_PORT"

# --- TCP Proxy Setup for ICE ---
# Railway L7 HTTP proxy only supports WebSocket (signaling). WebRTC ICE needs raw TCP.
# Railway TCP proxy (L4) exposes a container port as public TCP.
#
# Problem: LiveKit's tcp_port is used for BOTH listening AND advertising in ICE candidates.
# The TCP proxy has different internal (application) and external (proxy) ports.
# Solution: LiveKit listens on PROXY_PORT. We redirect APP_PORT → PROXY_PORT.
# Traffic flow: Browser → proxy:EXT_PORT → container:APP_PORT → REDIRECT/forwarder → container:PROXY_PORT → LiveKit

TCP_PROXY_DOMAIN="${RAILWAY_TCP_PROXY_DOMAIN:-}"
TCP_PROXY_PORT="${RAILWAY_TCP_PROXY_PORT:-}"
TCP_APP_PORT="${RAILWAY_TCP_APPLICATION_PORT:-}"
NODE_IP="0.0.0.0"
ICE_TCP_PORT="7881"
USE_EXTERNAL_IP="false"
NODE_IP_MODE="${LIVEKIT_NODE_IP_MODE:-proxy}"

if [ -n "$TCP_PROXY_PORT" ] && [ -n "$TCP_PROXY_DOMAIN" ] && [ -n "$TCP_APP_PORT" ]; then
  echo "TCP proxy: ${TCP_PROXY_DOMAIN}:${TCP_PROXY_PORT} → container:${TCP_APP_PORT}"

  if [ "$NODE_IP_MODE" = "auto" ]; then
    NODE_IP=""
    USE_EXTERNAL_IP="true"
    echo "Node IP mode: auto (use_external_ip=true)"
  else
    # Resolve proxy domain to IP for node_ip
    RESOLVED_IP=$(getent ahostsv4 "$TCP_PROXY_DOMAIN" 2>/dev/null | awk 'NR==1 {print $1}' || true)
    if [ -z "$RESOLVED_IP" ]; then
      RESOLVED_IP=$(getent hosts "$TCP_PROXY_DOMAIN" 2>/dev/null | awk '{print $1}' | head -1 || true)
    fi

    if [ -n "$RESOLVED_IP" ]; then
      NODE_IP="$RESOLVED_IP"
      echo "Resolved ${TCP_PROXY_DOMAIN} → ${NODE_IP}"
    else
      echo "WARNING: Could not resolve ${TCP_PROXY_DOMAIN}, falling back to 0.0.0.0"
    fi
  fi

  # LiveKit listens on PROXY_PORT (= advertised in ICE candidates)
  ICE_TCP_PORT="$TCP_PROXY_PORT"

  # Prefer iptables REDIRECT to preserve source IP for ICE connectivity checks.
  # Fall back to haproxy if NET_ADMIN is unavailable.
  if [ "$TCP_APP_PORT" != "$ICE_TCP_PORT" ]; then
    echo "Setting up redirect: ${TCP_APP_PORT} → ${ICE_TCP_PORT}"
    if iptables -t nat -A PREROUTING -p tcp --dport "${TCP_APP_PORT}" -j REDIRECT --to-port "${ICE_TCP_PORT}" 2>/dev/null; then
      echo "iptables redirect configured"
    else
      echo "iptables redirect failed, falling back to haproxy"
      cat > /tmp/haproxy.cfg <<HACFG
global
  log stdout format raw local0 info

defaults
  mode tcp
  timeout connect 5s
  timeout client 300s
  timeout server 300s
  log global
  option tcplog

listen ice_forwarder
  bind 0.0.0.0:${TCP_APP_PORT}
  server livekit 127.0.0.1:${ICE_TCP_PORT}
HACFG
      haproxy -f /tmp/haproxy.cfg -D
      echo "haproxy started"
    fi
  else
    echo "TCP application port matches proxy port; no forwarder needed"
  fi
else
  echo "No TCP proxy configured, using default tcp_port=7881"
fi

# Signaling port (Railway HTTP port)
SIGNAL_PORT="${PORT:-8080}"

# Generate livekit.yaml
cat > /etc/livekit.yaml <<EOF
port: ${SIGNAL_PORT}
bind_addresses:
  - "0.0.0.0"
log_level: debug

rtc:
  tcp_port: ${ICE_TCP_PORT}
  port_range_start: 0
  port_range_end: 0
  use_external_ip: ${USE_EXTERNAL_IP}
  force_tcp: false
  use_ice_lite: false
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

echo ""
echo "=== LiveKit Config ==="
cat /etc/livekit.yaml
echo ""
echo "=== Starting LiveKit ==="
echo "  Signaling: ${SIGNAL_PORT}"
echo "  ICE TCP: ${ICE_TCP_PORT}"
echo "  Node IP mode: ${NODE_IP_MODE}"
echo "  Node IP: ${NODE_IP:-auto}"
echo "  TCP proxy: ${TCP_PROXY_DOMAIN:-none}:${TCP_PROXY_PORT:-none} → container:${TCP_APP_PORT:-none}"
echo ""

if [ -n "$NODE_IP" ]; then
  exec livekit-server --config /etc/livekit.yaml --node-ip "$NODE_IP"
else
  exec livekit-server --config /etc/livekit.yaml
fi
