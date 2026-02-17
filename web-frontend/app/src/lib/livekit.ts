import type { RoomOptions } from 'livekit-client'

export interface TokenResponse {
  token: string
  url: string
  room: string
  identity: string
}

export async function fetchToken(room?: string, identity?: string): Promise<TokenResponse> {
  const resp = await fetch('/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room, identity }),
  })
  if (!resp.ok) throw new Error(`Token fetch failed: ${resp.status}`)
  return resp.json()
}

export function createRoomOptions(): RoomOptions {
  return {
    audioCaptureDefaults: { autoGainControl: true, noiseSuppression: true },
    adaptiveStream: true,
  }
}
