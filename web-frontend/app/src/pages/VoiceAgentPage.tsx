import { useEffect, useState } from 'react'
import ModeNav from '@/components/ModeNav'
import StatusBadge from '@/components/StatusBadge'
import AuraVisualizer from '@/components/AuraVisualizer'
import type { AuraMode } from '@/components/AuraVisualizer'
import TranscriptConsole from '@/components/TranscriptConsole'
import AgentStatus from '@/components/AgentStatus'
import ConnectButton from '@/components/ConnectButton'
import useLiveKitSession from '@/hooks/useLiveKitSession'
import useAudioAnalyser from '@/hooks/useAudioAnalyser'
import type { ConnectionStatus } from '@/components/StatusBadge'

interface VoiceAgentPageProps {
  mode: 'pipeline' | 'realtime'
}

const titles: Record<string, string> = {
  pipeline: 'Pipeline Voice Agent',
  realtime: 'Realtime Voice Agent',
}

const subtitles: Record<string, string> = {
  pipeline: 'OpenAI STT \u2192 GPT-4o-mini \u2192 TTS',
  realtime: 'OpenAI Realtime API (speech-to-speech)',
}

function deriveAuraMode(
  status: ConnectionStatus,
  agentAudioStream: MediaStream | null,
  localMicStream: MediaStream | null,
): AuraMode {
  if (status !== 'connected') return 'disconnected'
  if (agentAudioStream) return 'agent-speaking'
  if (localMicStream) return 'user-speaking'
  return 'idle'
}

export default function VoiceAgentPage({ mode }: VoiceAgentPageProps) {
  const {
    status,
    agentStatusText,
    roomName,
    localMicStream,
    agentAudioStream,
    audioContext,
    segments,
    connect,
    disconnect,
  } = useLiveKitSession()

  const activeStream = agentAudioStream ?? localMicStream
  const isMic = !agentAudioStream && !!localMicStream
  const { rmsRef } = useAudioAnalyser(audioContext, activeStream, isMic)
  const auraMode = deriveAuraMode(status, agentAudioStream, localMicStream)

  // Debug: show live RMS value (temporary diagnostic)
  const [debugRms, setDebugRms] = useState(0)
  useEffect(() => {
    if (status !== 'connected') return
    const id = setInterval(() => setDebugRms(rmsRef.current ?? 0), 200)
    return () => clearInterval(id)
  }, [status, rmsRef])

  return (
    <div className="flex flex-col min-h-screen bg-[#0a1014]">
      {/* Debug overlay — temporary */}
      {status === 'connected' && (
        <div className="fixed top-2 right-2 bg-black/70 text-[10px] font-mono text-cyan-400 px-2 py-1 rounded z-50">
          RMS: {debugRms.toFixed(3)} | mode: {auraMode} | stream: {activeStream ? 'yes' : 'no'} | ctx: {audioContext?.state ?? 'none'}
        </div>
      )}
      {/* Header: title, subtitle, mode nav, then status badge */}
      <div className="pt-6 pb-2 text-center">
        <h1 className="text-xl font-semibold text-white mb-1">{titles[mode]}</h1>
        <p className="text-xs text-neutral-500 mb-4">{subtitles[mode]}</p>
        <ModeNav activeMode={mode} />
        <div className="mt-3">
          <StatusBadge status={status} roomName={roomName} />
        </div>
      </div>

      {/* Aura — fills available space */}
      <div className="flex-1 flex items-center justify-center px-4">
        <AuraVisualizer auraMode={auraMode} rmsRef={rmsRef} />
      </div>

      {/* Bottom: agent status, transcript, then connect button */}
      <div className="pb-6 px-4 text-center">
        <AgentStatus text={agentStatusText} />
        {segments.length > 0 && (
          <div className="max-w-[540px] mx-auto mt-2 mb-4">
            <TranscriptConsole segments={segments} />
          </div>
        )}
        <div className="mt-3">
          <ConnectButton
            status={status}
            onConnect={connect}
            onDisconnect={disconnect}
          />
        </div>
      </div>
    </div>
  )
}
