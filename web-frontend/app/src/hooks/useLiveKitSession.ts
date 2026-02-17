import { useCallback, useRef, useState } from 'react'
import { Room, RoomEvent, Track } from 'livekit-client'
import type { RemoteTrack, RemoteTrackPublication, RemoteParticipant, TranscriptionSegment, Participant } from 'livekit-client'
import { fetchToken, createRoomOptions } from '@/lib/livekit'
import type { ConnectionStatus } from '@/components/StatusBadge'
import useTranscript from './useTranscript'

export default function useLiveKitSession() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [agentStatusText, setAgentStatusText] = useState('')
  const [roomName, setRoomName] = useState('')
  const [localMicStream, setLocalMicStream] = useState<MediaStream | null>(null)
  const [agentAudioStream, setAgentAudioStream] = useState<MediaStream | null>(null)
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const roomRef = useRef<Room | null>(null)
  const { segments, addSegments, clear: clearTranscript } = useTranscript()

  const connect = useCallback(async () => {
    setStatus('connecting')
    setAgentStatusText('')

    // Create AudioContext inside user gesture (click handler) so browser allows it
    let ctx = new AudioContext()
    await ctx.resume()
    setAudioContext(ctx)

    try {
      const data = await fetchToken()
      const room = new Room(createRoomOptions())
      roomRef.current = room

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub: RemoteTrackPublication, _participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach()
          document.body.appendChild(el)

          const stream = track.mediaStream ?? new MediaStream([track.mediaStreamTrack])
          setAgentAudioStream(stream)
          setAgentStatusText('Agent is speaking...')
        }
      })

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        track.detach().forEach((el) => el.remove())
        setAgentAudioStream(null)
        setAgentStatusText('Listening...')
      })

      room.on(RoomEvent.TranscriptionReceived, (segments: TranscriptionSegment[], participant?: Participant) => {
        const isUser = participant != null && room.localParticipant != null &&
          participant.identity === room.localParticipant.identity
        const speaker = isUser ? 'user' : 'agent'
        addSegments(
          segments.map((s) => ({ id: s.id, text: s.text, final: s.final })),
          speaker as 'user' | 'agent',
        )
      })

      room.on(RoomEvent.ParticipantConnected, (p) => {
        setAgentStatusText(`Agent connected: ${p.identity}`)
      })

      room.on(RoomEvent.ParticipantDisconnected, (p) => {
        setAgentStatusText(`Agent disconnected: ${p.identity}`)
        setAgentAudioStream(null)
      })

      room.on(RoomEvent.Disconnected, () => {
        cleanup()
      })

      await room.connect(data.url, data.token)
      setStatus('connected')
      setRoomName(data.room)
      setAgentStatusText('Waiting for agent...')

      // Enable microphone
      try {
        await Promise.race([
          room.localParticipant.setMicrophoneEnabled(true),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Microphone setup timeout')), 10000),
          ),
        ])

        const micPub = room.localParticipant.getTrackPublication(Track.Source.Microphone)
        if (micPub?.track) {
          const stream =
            micPub.track.mediaStream ??
            new MediaStream([micPub.track.mediaStreamTrack])
          setLocalMicStream(stream)
        }
      } catch (micErr) {
        console.warn('Microphone unavailable:', micErr)
        setAgentStatusText('Connected (mic unavailable). You can still receive agent audio.')
      }
    } catch (err) {
      console.error('Connection failed:', err)
      setStatus('error')
      setAgentStatusText(err instanceof Error ? err.message : 'Connection failed')
      ctx.close()
      setAudioContext(null)
    }
  }, [addSegments])

  const cleanup = useCallback(() => {
    roomRef.current = null
    setStatus('disconnected')
    setAgentStatusText('')
    setRoomName('')
    setLocalMicStream(null)
    setAgentAudioStream(null)
    setAudioContext((prev) => {
      prev?.close()
      return null
    })
  }, [])

  const disconnect = useCallback(async () => {
    const room = roomRef.current
    if (room) {
      await room.disconnect()
    }
    cleanup()
    clearTranscript()
  }, [cleanup, clearTranscript])

  return {
    status,
    agentStatusText,
    roomName,
    localMicStream,
    agentAudioStream,
    audioContext,
    segments,
    connect,
    disconnect,
  }
}
