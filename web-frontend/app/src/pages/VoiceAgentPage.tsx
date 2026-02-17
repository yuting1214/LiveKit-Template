import { useEffect, useRef, useState } from 'react'
import ModeNav from '@/components/ModeNav'
import StatusBadge from '@/components/StatusBadge'
import AuraVisualizer from '@/components/AuraVisualizer'
import type { AuraMode } from '@/components/AuraVisualizer'
import TranscriptConsole from '@/components/TranscriptConsole'
import AgentStatus from '@/components/AgentStatus'
import ConnectButton from '@/components/ConnectButton'
import useLiveKitSession from '@/hooks/useLiveKitSession'
import useAudioAnalyser from '@/hooks/useAudioAnalyser'
// ConnectionStatus used by StatusBadge internally

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

const SPEAKING_THRESHOLD = 0.02

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

  // Analyse BOTH streams independently
  const { rmsRef: micRmsRef } = useAudioAnalyser(audioContext, localMicStream, true)
  const { rmsRef: agentRmsRef } = useAudioAnalyser(audioContext, agentAudioStream, false)

  // Combined RMS ref that the visualizer reads — picks the dominant stream
  const combinedRmsRef = useRef(0)

  // Derive aura mode from actual audio levels, not just track subscription state
  const [auraMode, setAuraMode] = useState<AuraMode>('disconnected')

  // Debug state
  const [debugInfo, setDebugInfo] = useState({ micRms: 0, agentRms: 0, mode: 'disconnected' as string })

  useEffect(() => {
    if (status !== 'connected') {
      setAuraMode('disconnected')
      combinedRmsRef.current = 0
      return
    }

    let frameId: number

    function update() {
      const micRms = micRmsRef.current ?? 0
      const agentRms = agentRmsRef.current ?? 0

      let mode: AuraMode
      let rms: number

      if (agentRms > SPEAKING_THRESHOLD && agentRms >= micRms) {
        mode = 'agent-speaking'
        rms = agentRms
      } else if (micRms > SPEAKING_THRESHOLD) {
        mode = 'user-speaking'
        rms = micRms
      } else {
        mode = 'idle'
        rms = Math.max(micRms, agentRms)
      }

      combinedRmsRef.current = rms
      setAuraMode(mode)

      frameId = requestAnimationFrame(update)
    }
    frameId = requestAnimationFrame(update)

    // Debug update at lower frequency
    const debugId = setInterval(() => {
      setDebugInfo({
        micRms: micRmsRef.current ?? 0,
        agentRms: agentRmsRef.current ?? 0,
        mode: auraMode,
      })
    }, 200)

    return () => {
      cancelAnimationFrame(frameId)
      clearInterval(debugId)
    }
  }, [status, micRmsRef, agentRmsRef, auraMode])

  return (
    <div className="flex flex-col min-h-screen bg-[#0a1014]">
      {/* Debug overlay — temporary */}
      {status === 'connected' && (
        <div className="fixed top-2 right-2 bg-black/70 text-[10px] font-mono text-cyan-400 px-2 py-1 rounded z-50">
          mic: {debugInfo.micRms.toFixed(3)} | agent: {debugInfo.agentRms.toFixed(3)} | mode: {auraMode} | ctx: {audioContext?.state ?? 'none'} | micStream: {localMicStream ? 'yes' : 'no'} | agentStream: {agentAudioStream ? 'yes' : 'no'}
        </div>
      )}

      {/* Header */}
      <div className="pt-6 pb-2 text-center">
        <h1 className="text-xl font-semibold text-white mb-1">{titles[mode]}</h1>
        <p className="text-xs text-neutral-500 mb-4">{subtitles[mode]}</p>
        <ModeNav activeMode={mode} />
        <div className="mt-3">
          <StatusBadge status={status} roomName={roomName} />
        </div>
      </div>

      {/* Aura */}
      <div className="flex-1 flex items-center justify-center px-4">
        <AuraVisualizer auraMode={auraMode} rmsRef={combinedRmsRef} />
      </div>

      {/* Bottom */}
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
